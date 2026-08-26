-- L15b: additive, pilot-only completion of one legacy workout and its feedback.
-- The legacy tables remain unchanged; this RPC is the transaction boundary for
-- the reliable-mutations pilot only.

create or replace function public.complete_workout_with_feedback_v2(
  p_workout_id uuid,
  p_actual_time text,
  p_rpe numeric,
  p_rpe_global numeric,
  p_rpe_specific numeric,
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
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'workout_completion_permission_denied';
  end if;

  if p_workout_id is null
    or coalesce(length(trim(p_actual_time)), 0) = 0
    or length(p_actual_time) > 64
    or p_rpe is null or p_rpe < 0 or p_rpe > 10
    or p_rpe_global is null or p_rpe_global < 0 or p_rpe_global > 10
    or p_rpe_specific is null or p_rpe_specific < 0 or p_rpe_specific > 10
    or p_motivation is null or p_motivation < 0 or p_motivation > 10
    or p_pleasure is null or p_pleasure < 0 or p_pleasure > 5
    or coalesce(length(trim(p_comment)), 0) = 0
    or length(p_comment) > 5000 then
    raise exception 'workout_completion_validation_failed';
  end if;

  select count(*)
  into v_link_count
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

  if v_link_count <> 1 then
    raise exception 'workout_completion_target_unavailable';
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
    raise exception 'workout_completion_permission_denied';
  end if;

  perform 1
  from public.calendar_workouts workout
  where workout.id = p_workout_id
  for update;

  if not found then
    raise exception 'workout_completion_target_unavailable';
  end if;

  insert into public.workout_feedbacks (
    workout_id,
    rpe,
    rpe_global,
    rpe_specific,
    motivation,
    pleasure,
    comment,
    real_duration
  ) values (
    p_workout_id,
    p_rpe,
    p_rpe_global,
    p_rpe_specific,
    p_motivation,
    p_pleasure,
    p_comment,
    p_actual_time
  )
  on conflict (workout_id) do update set
    rpe = excluded.rpe,
    rpe_global = excluded.rpe_global,
    rpe_specific = excluded.rpe_specific,
    motivation = excluded.motivation,
    pleasure = excluded.pleasure,
    comment = excluded.comment,
    real_duration = excluded.real_duration;

  update public.calendar_workouts
  set completed = true,
      non_done = false
  where id = p_workout_id;

  return jsonb_build_object(
    'workoutId', p_workout_id,
    'completed', true,
    'feedback', jsonb_build_object(
      'actualTime', p_actual_time,
      'rpe', p_rpe,
      'rpeGlobal', p_rpe_global,
      'rpeSpecific', p_rpe_specific,
      'motivation', p_motivation,
      'pleasure', p_pleasure,
      'comment', p_comment
    )
  );
end;
$$;

revoke all on function public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text) from public, anon;
grant execute on function public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text) to authenticated;

comment on function public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text) is
  'L15b atomic pilot completion: one feedback upsert and one completed-state update in a single authorized transaction.';
