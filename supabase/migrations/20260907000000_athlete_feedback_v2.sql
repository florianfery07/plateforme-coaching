-- P04.B: additive athlete feedback pilot.
-- The legacy feedback writer and L15 completion RPC remain unchanged. These
-- functions provide an authorized, atomic draft/finalization boundary only for
-- an explicit Access Control V2 pilot.

alter table public.workout_feedbacks
  add column if not exists sensation smallint;

alter table public.workout_feedbacks
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workout_feedbacks_sensation_range'
      and conrelid = 'public.workout_feedbacks'::regclass
  ) then
    alter table public.workout_feedbacks
      add constraint workout_feedbacks_sensation_range
      check (sensation is null or sensation between 1 and 5);
  end if;
end;
$$;

comment on column public.workout_feedbacks.sensation is
  'P04 athlete feedback pilot: perceived feeling during the session, 1 (very bad) to 5 (very good), distinct from RPE.';

comment on column public.workout_feedbacks.updated_at is
  'Last V2 draft/final feedback modification. Legacy rows may not have a value until touched by the V2 pilot.';

create or replace function public.get_athlete_feedback_pilot_state_v3(
  p_legacy_athlete_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_link_count integer;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_feedback_permission_denied';
  end if;

  select count(*)
  into v_link_count
  from public.athletes athlete
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = athlete.id
   and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where athlete.id = p_legacy_athlete_id
    and athlete.active is true
    and access_control.current_user_can_access_athlete(link.athlete_membership_id);

  if v_link_count <> 1 then
    raise exception 'athlete_feedback_target_unavailable';
  end if;

  return jsonb_build_object('legacyAthleteId', p_legacy_athlete_id);
end;
$$;

create or replace function public.save_workout_feedback_draft_v3(
  p_workout_id uuid,
  p_actual_time text,
  p_rpe_global numeric,
  p_rpe_specific numeric,
  p_sensation integer,
  p_motivation integer,
  p_pleasure integer,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_athlete_membership_id uuid;
  v_link_count integer;
  v_completed boolean;
  v_non_done boolean;
  v_feedback public.workout_feedbacks%rowtype;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_feedback_permission_denied';
  end if;

  if p_workout_id is null
    or length(coalesce(p_actual_time, '')) > 64
    or (p_rpe_global is not null and (p_rpe_global < 1 or p_rpe_global > 10))
    or (p_rpe_specific is not null and (p_rpe_specific < 1 or p_rpe_specific > 10))
    or (p_sensation is not null and (p_sensation < 1 or p_sensation > 5))
    or (p_motivation is not null and (p_motivation < 1 or p_motivation > 10))
    or (p_pleasure is not null and (p_pleasure < 1 or p_pleasure > 5))
    or length(coalesce(p_comment, '')) > 5000 then
    raise exception 'athlete_feedback_validation_failed';
  end if;

  select count(*)
  into v_link_count
  from public.calendar_workouts workout
  join public.athletes athlete on athlete.id = workout.athlete_id and athlete.active is true
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = workout.athlete_id
   and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where workout.id = p_workout_id;

  if v_link_count <> 1 then
    raise exception 'athlete_feedback_target_unavailable';
  end if;

  select link.athlete_membership_id
  into v_athlete_membership_id
  from public.calendar_workouts workout
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = workout.athlete_id
   and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where workout.id = p_workout_id;

  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then
    raise exception 'athlete_feedback_permission_denied';
  end if;

  select workout.completed, workout.non_done
  into v_completed, v_non_done
  from public.calendar_workouts workout
  where workout.id = p_workout_id
  for update;

  if not found then
    raise exception 'athlete_feedback_target_unavailable';
  end if;

  if v_completed or v_non_done then
    raise exception 'athlete_feedback_draft_unavailable';
  end if;

  insert into public.workout_feedbacks (
    workout_id, rpe, rpe_global, rpe_specific, sensation, motivation, pleasure,
    comment, real_duration, updated_at
  ) values (
    p_workout_id, p_rpe_global, p_rpe_global, p_rpe_specific, p_sensation,
    p_motivation, p_pleasure, coalesce(p_comment, ''), coalesce(p_actual_time, ''), clock_timestamp()
  )
  on conflict (workout_id) do update set
    rpe = excluded.rpe,
    rpe_global = excluded.rpe_global,
    rpe_specific = excluded.rpe_specific,
    sensation = excluded.sensation,
    motivation = excluded.motivation,
    pleasure = excluded.pleasure,
    comment = excluded.comment,
    real_duration = excluded.real_duration,
    updated_at = case when (
      public.workout_feedbacks.rpe,
      public.workout_feedbacks.rpe_global,
      public.workout_feedbacks.rpe_specific,
      public.workout_feedbacks.sensation,
      public.workout_feedbacks.motivation,
      public.workout_feedbacks.pleasure,
      public.workout_feedbacks.comment,
      public.workout_feedbacks.real_duration
    ) is distinct from (
      excluded.rpe,
      excluded.rpe_global,
      excluded.rpe_specific,
      excluded.sensation,
      excluded.motivation,
      excluded.pleasure,
      excluded.comment,
      excluded.real_duration
    ) then clock_timestamp() else public.workout_feedbacks.updated_at end;

  select * into v_feedback
  from public.workout_feedbacks
  where workout_id = p_workout_id;

  return jsonb_build_object(
    'workoutId', p_workout_id,
    'completed', false,
    'feedback', jsonb_build_object(
      'actualTime', coalesce(v_feedback.real_duration, ''),
      'rpe', v_feedback.rpe,
      'rpeGlobal', v_feedback.rpe_global,
      'rpeSpecific', v_feedback.rpe_specific,
      'sensation', v_feedback.sensation,
      'motivation', v_feedback.motivation,
      'pleasure', v_feedback.pleasure,
      'comment', coalesce(v_feedback.comment, ''),
      'updatedAt', v_feedback.updated_at
    )
  );
end;
$$;

create or replace function public.complete_workout_with_feedback_v3(
  p_workout_id uuid,
  p_actual_time text,
  p_rpe_global numeric,
  p_rpe_specific numeric,
  p_sensation integer,
  p_motivation integer,
  p_pleasure integer,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_athlete_membership_id uuid;
  v_link_count integer;
  v_requires_specific boolean;
  v_specific_digits text;
  v_feedback public.workout_feedbacks%rowtype;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_feedback_permission_denied';
  end if;

  if p_workout_id is null
    or coalesce(length(trim(p_actual_time)), 0) = 0
    or length(p_actual_time) > 64
    or p_rpe_global is null or p_rpe_global < 1 or p_rpe_global > 10
    or p_sensation is null or p_sensation < 1 or p_sensation > 5
    or p_motivation is null or p_motivation < 1 or p_motivation > 10
    or p_pleasure is null or p_pleasure < 1 or p_pleasure > 5
    or length(coalesce(p_comment, '')) > 5000 then
    raise exception 'athlete_feedback_validation_failed';
  end if;

  select count(*)
  into v_link_count
  from public.calendar_workouts workout
  join public.athletes athlete on athlete.id = workout.athlete_id and athlete.active is true
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = workout.athlete_id
   and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where workout.id = p_workout_id;

  if v_link_count <> 1 then
    raise exception 'athlete_feedback_target_unavailable';
  end if;

  select link.athlete_membership_id
  into v_athlete_membership_id
  from public.calendar_workouts workout
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = workout.athlete_id
   and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where workout.id = p_workout_id;

  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then
    raise exception 'athlete_feedback_permission_denied';
  end if;

  select regexp_replace(coalesce(workout.expected_specific_duration, ''), '[^0-9]', '', 'g')
  into v_specific_digits
  from public.calendar_workouts workout
  where workout.id = p_workout_id
  for update;

  if not found then
    raise exception 'athlete_feedback_target_unavailable';
  end if;

  select workout.expected_rpe_specific is not null
    and coalesce(nullif(v_specific_digits, ''), '0')::numeric > 0
  into v_requires_specific
  from public.calendar_workouts workout
  where workout.id = p_workout_id;

  if (v_requires_specific and (p_rpe_specific is null or p_rpe_specific < 1 or p_rpe_specific > 10))
    or (not v_requires_specific and p_rpe_specific is not null) then
    raise exception 'athlete_feedback_validation_failed';
  end if;

  insert into public.workout_feedbacks (
    workout_id, rpe, rpe_global, rpe_specific, sensation, motivation, pleasure,
    comment, real_duration, updated_at
  ) values (
    p_workout_id, p_rpe_global, p_rpe_global, p_rpe_specific, p_sensation,
    p_motivation, p_pleasure, coalesce(p_comment, ''), p_actual_time, clock_timestamp()
  )
  on conflict (workout_id) do update set
    rpe = excluded.rpe,
    rpe_global = excluded.rpe_global,
    rpe_specific = excluded.rpe_specific,
    sensation = excluded.sensation,
    motivation = excluded.motivation,
    pleasure = excluded.pleasure,
    comment = excluded.comment,
    real_duration = excluded.real_duration,
    updated_at = case when (
      public.workout_feedbacks.rpe,
      public.workout_feedbacks.rpe_global,
      public.workout_feedbacks.rpe_specific,
      public.workout_feedbacks.sensation,
      public.workout_feedbacks.motivation,
      public.workout_feedbacks.pleasure,
      public.workout_feedbacks.comment,
      public.workout_feedbacks.real_duration
    ) is distinct from (
      excluded.rpe,
      excluded.rpe_global,
      excluded.rpe_specific,
      excluded.sensation,
      excluded.motivation,
      excluded.pleasure,
      excluded.comment,
      excluded.real_duration
    ) then clock_timestamp() else public.workout_feedbacks.updated_at end;

  update public.calendar_workouts
  set completed = true,
      non_done = false
  where id = p_workout_id;

  select * into v_feedback
  from public.workout_feedbacks
  where workout_id = p_workout_id;

  return jsonb_build_object(
    'workoutId', p_workout_id,
    'completed', true,
    'feedback', jsonb_build_object(
      'actualTime', coalesce(v_feedback.real_duration, ''),
      'rpe', v_feedback.rpe,
      'rpeGlobal', v_feedback.rpe_global,
      'rpeSpecific', v_feedback.rpe_specific,
      'sensation', v_feedback.sensation,
      'motivation', v_feedback.motivation,
      'pleasure', v_feedback.pleasure,
      'comment', coalesce(v_feedback.comment, ''),
      'updatedAt', v_feedback.updated_at
    )
  );
end;
$$;

revoke all on function public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text) from public, anon;
revoke all on function public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text) from public, anon;
revoke all on function public.get_athlete_feedback_pilot_state_v3(uuid) from public, anon;
grant execute on function public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text) to authenticated;
grant execute on function public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text) to authenticated;
grant execute on function public.get_athlete_feedback_pilot_state_v3(uuid) to authenticated;

comment on function public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text) is
  'P04 athlete feedback pilot: authorized partial feedback persistence. It locks the workout and refuses to overwrite finalized or non-done sessions.';

comment on function public.get_athlete_feedback_pilot_state_v3(uuid) is
  'P04 athlete feedback pilot: server-derived capability check for one active legacy athlete mapping.';

comment on function public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text) is
  'P04 athlete feedback pilot: authorized atomic completion or correction. It mirrors rpe to rpe_global and validates the planned specific-RPE contract.';
