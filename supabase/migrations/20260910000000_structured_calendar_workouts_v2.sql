-- P05.E: atomic calendar scheduling and independent structured snapshots.
-- This is additive and pilot-only: legacy calendar rows and legacy blocks remain untouched.

alter table public.calendar_workouts
  add column if not exists structured_workout_v2 boolean not null default false;

comment on column public.calendar_workouts.structured_workout_v2 is
  'P05.E additive marker. True only when the calendar row owns a canonical workout_structures_v2 snapshot.';

create or replace function access_control.assert_workout_structure_schedule_authorized_v2(p_legacy_athlete_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_membership_id uuid; v_matches integer;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'workout_structure_permission_denied';
  end if;

  select count(*), (array_agg(link.athlete_membership_id))[1]
    into v_matches, v_membership_id
  from public.athletes athlete
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = athlete.id and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where athlete.id = p_legacy_athlete_id and athlete.active is true;

  if v_matches <> 1 then raise exception 'workout_structure_target_unavailable'; end if;
  if not access_control.current_user_can_manage_athlete(v_membership_id) then
    raise exception 'workout_structure_permission_denied';
  end if;
end;
$$;

create or replace function access_control.assert_workout_structure_calendar_read_authorized_v2(p_calendar_workout_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_athlete_user_id uuid; v_membership_id uuid; v_matches integer;
begin
  if auth.uid() is null or not access_control.current_account_is_active() then
    raise exception 'workout_structure_permission_denied';
  end if;

  select count(*), (array_agg(link.athlete_membership_id))[1], (array_agg(athlete.user_id))[1]
    into v_matches, v_membership_id, v_athlete_user_id
  from public.calendar_workouts workout
  join public.athletes athlete on athlete.id = workout.athlete_id and athlete.active is true
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = athlete.id and link.status = 'active'
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  where workout.id = p_calendar_workout_id and workout.structured_workout_v2 is true;

  if v_matches <> 1 then raise exception 'workout_structure_target_unavailable'; end if;
  if auth.uid() = v_athlete_user_id then return; end if;
  if not access_control.current_user_is_pilot() or not access_control.current_user_can_manage_athlete(v_membership_id) then
    raise exception 'workout_structure_permission_denied';
  end if;
end;
$$;

create or replace function public.create_structured_calendar_workout_v2(
  p_legacy_athlete_id uuid, p_date text, p_library_workout_id uuid,
  p_title text, p_category text, p_subcategory text, p_description text,
  p_expected_rpe_global numeric, p_expected_rpe_specific numeric,
  p_document jsonb, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare
  v_source public.workout_structures_v2%rowtype;
  v_new public.workout_structures_v2%rowtype;
  v_calendar public.calendar_workouts%rowtype;
  v_total integer;
  v_specific integer;
  v_title text;
  v_category text;
  v_subcategory text;
  v_description text;
  v_global numeric;
  v_specific_rpe numeric;
  v_document jsonb;
begin
  perform access_control.assert_workout_structure_schedule_authorized_v2(p_legacy_athlete_id);
  if p_idempotency_key is null or coalesce(length(trim(p_date)), 0) = 0 then
    raise exception 'workout_structure_validation_failed';
  end if;

  select * into v_new
  from public.workout_structures_v2
  where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_new.calendar_workout_id is null then raise exception 'workout_structure_idempotency_conflict'; end if;
    select * into v_calendar from public.calendar_workouts where id = v_new.calendar_workout_id;
    return jsonb_build_object(
      'calendarWorkoutId', v_calendar.id, 'structureId', v_new.id, 'revision', v_new.revision,
      'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds,
      'specificDurationSeconds', v_new.specific_duration_seconds, 'calendarWorkout', to_jsonb(v_calendar)
    );
  end if;

  if p_library_workout_id is not null then
    perform access_control.assert_workout_structure_library_authorized_v2();
    select * into v_source
    from public.workout_structures_v2
    where library_workout_id = p_library_workout_id and is_current
    for share;
    if not found then raise exception 'workout_structure_target_unavailable'; end if;
    select title, category, subcategory, description, expected_rpe_global, expected_rpe_specific
      into v_title, v_category, v_subcategory, v_description, v_global, v_specific_rpe
    from public.workout_library where id = p_library_workout_id;
    v_document := v_source.document;
    v_total := v_source.total_duration_seconds;
    v_specific := v_source.specific_duration_seconds;
  else
    if coalesce(length(trim(p_title)), 0) = 0 or coalesce(length(trim(p_title)), 0) > 300
      or coalesce(length(trim(p_category)), 0) = 0 or coalesce(length(p_description), 0) > 5000 then
      raise exception 'workout_structure_validation_failed';
    end if;
    v_title := trim(p_title); v_category := trim(p_category); v_subcategory := nullif(trim(coalesce(p_subcategory, '')), '');
    v_description := coalesce(p_description, ''); v_global := p_expected_rpe_global; v_specific_rpe := p_expected_rpe_specific;
    v_document := p_document;
    select total_duration_seconds, specific_duration_seconds into v_total, v_specific
      from access_control.workout_structure_metrics_v2(v_document);
  end if;

  if (v_global is not null and v_global not between 1 and 10)
    or (v_specific_rpe is not null and v_specific_rpe not between 1 and 10)
    or (v_specific = 0 and v_specific_rpe is not null) then
    raise exception 'workout_structure_validation_failed';
  end if;

  insert into public.calendar_workouts (
    athlete_id, date, workout_type, subcategory, title, duration, expected_rpe,
    expected_rpe_global, expected_specific_duration, expected_rpe_specific, description,
    blocks, athlete_seen_at, completed, non_done, structured_workout_v2
  ) values (
    p_legacy_athlete_id, trim(p_date), v_category, v_subcategory, v_title,
    access_control.format_legacy_duration_v2(v_total), case when v_global is null then null else v_global::text end,
    v_global, case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end,
    case when v_specific = 0 then null else v_specific_rpe end, v_description,
    '[]'::jsonb, null, false, false, true
  ) returning * into v_calendar;

  insert into public.workout_structures_v2 (
    calendar_workout_id, source_structure_id, schema_version, document,
    total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id
  ) values (
    v_calendar.id, case when p_library_workout_id is null then null else v_source.id end, 1, v_document,
    v_total, v_specific, 1, p_idempotency_key, auth.uid()
  ) returning * into v_new;

  return jsonb_build_object(
    'calendarWorkoutId', v_calendar.id, 'structureId', v_new.id, 'revision', 1,
    'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific,
    'calendarWorkout', to_jsonb(v_calendar)
  );
end;
$$;

create or replace function public.get_calendar_workout_structure_v2(p_calendar_workout_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_structure public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_calendar_read_authorized_v2(p_calendar_workout_id);
  select * into v_structure
  from public.workout_structures_v2
  where calendar_workout_id = p_calendar_workout_id and is_current;
  if not found then return null; end if;
  return jsonb_build_object(
    'structureId', v_structure.id, 'revision', v_structure.revision, 'document', v_structure.document,
    'totalDurationSeconds', v_structure.total_duration_seconds, 'specificDurationSeconds', v_structure.specific_duration_seconds
  );
end;
$$;

create or replace function public.update_structured_calendar_workout_v2(
  p_calendar_workout_id uuid, p_title text, p_category text, p_subcategory text, p_description text,
  p_expected_rpe_global numeric, p_expected_rpe_specific numeric,
  p_document jsonb, p_expected_revision integer, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_current public.workout_structures_v2%rowtype; v_new public.workout_structures_v2%rowtype; v_calendar public.calendar_workouts%rowtype; v_total integer; v_specific integer;
begin
  perform access_control.assert_workout_structure_calendar_authorized_v2(p_calendar_workout_id);
  if p_idempotency_key is null or p_expected_revision is null or p_expected_revision < 1
    or coalesce(length(trim(p_title)), 0) = 0 or coalesce(length(trim(p_title)), 0) > 300
    or coalesce(length(trim(p_category)), 0) = 0 or coalesce(length(p_description), 0) > 5000
    or (p_expected_rpe_global is not null and p_expected_rpe_global not between 1 and 10)
    or (p_expected_rpe_specific is not null and p_expected_rpe_specific not between 1 and 10) then
    raise exception 'workout_structure_validation_failed';
  end if;
  select * into v_calendar from public.calendar_workouts where id = p_calendar_workout_id and structured_workout_v2 is true for update;
  if not found then raise exception 'workout_structure_target_unavailable'; end if;
  select * into v_new from public.workout_structures_v2 where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_new.calendar_workout_id <> p_calendar_workout_id then raise exception 'workout_structure_idempotency_conflict'; end if;
    return jsonb_build_object('calendarWorkoutId', v_calendar.id, 'structureId', v_new.id, 'revision', v_new.revision, 'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds, 'specificDurationSeconds', v_new.specific_duration_seconds, 'calendarWorkout', to_jsonb(v_calendar));
  end if;
  select * into v_current from public.workout_structures_v2 where calendar_workout_id = p_calendar_workout_id and is_current for update;
  if not found or v_current.revision <> p_expected_revision then raise exception 'workout_structure_revision_conflict'; end if;
  select total_duration_seconds, specific_duration_seconds into v_total, v_specific from access_control.workout_structure_metrics_v2(p_document);
  if v_specific = 0 and p_expected_rpe_specific is not null then raise exception 'workout_structure_validation_failed'; end if;
  update public.workout_structures_v2 set is_current = false, superseded_at = clock_timestamp() where id = v_current.id;
  insert into public.workout_structures_v2 (calendar_workout_id, source_structure_id, schema_version, document, total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id)
  values (p_calendar_workout_id, v_current.source_structure_id, 1, p_document, v_total, v_specific, v_current.revision + 1, p_idempotency_key, auth.uid()) returning * into v_new;
  update public.calendar_workouts set
    title = trim(p_title), workout_type = trim(p_category), subcategory = nullif(trim(coalesce(p_subcategory, '')), ''), description = coalesce(p_description, ''),
    duration = access_control.format_legacy_duration_v2(v_total), expected_rpe = case when p_expected_rpe_global is null then null else p_expected_rpe_global::text end,
    expected_rpe_global = p_expected_rpe_global, expected_specific_duration = case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end,
    expected_rpe_specific = case when v_specific = 0 then null else p_expected_rpe_specific end
  where id = p_calendar_workout_id returning * into v_calendar;
  return jsonb_build_object('calendarWorkoutId', v_calendar.id, 'structureId', v_new.id, 'revision', v_new.revision, 'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific, 'calendarWorkout', to_jsonb(v_calendar));
end;
$$;

revoke all on function access_control.assert_workout_structure_schedule_authorized_v2(uuid), access_control.assert_workout_structure_calendar_read_authorized_v2(uuid) from public, anon, authenticated;
revoke all on function public.create_structured_calendar_workout_v2(uuid,text,uuid,text,text,text,text,numeric,numeric,jsonb,uuid), public.get_calendar_workout_structure_v2(uuid), public.update_structured_calendar_workout_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,uuid) from public, anon;
grant execute on function public.create_structured_calendar_workout_v2(uuid,text,uuid,text,text,text,text,numeric,numeric,jsonb,uuid), public.get_calendar_workout_structure_v2(uuid), public.update_structured_calendar_workout_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,uuid) to authenticated;

comment on function public.create_structured_calendar_workout_v2(uuid,text,uuid,text,text,text,text,numeric,numeric,jsonb,uuid) is 'P05.E: atomically creates one calendar parent and one independent canonical snapshot, from a library revision or a direct structured document.';
comment on function public.update_structured_calendar_workout_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,uuid) is 'P05.E: atomically updates calendar metadata and appends one immutable calendar structure revision; source library content remains untouched.';
