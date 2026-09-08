-- P05.F: additive structured snapshots for the canonical Groups V2 session.
-- No legacy calendar_workouts row is created by these commands.

alter table public.group_sessions_v2
  add column if not exists structured_workout_v2 boolean not null default false;

comment on column public.group_sessions_v2.structured_workout_v2 is
  'P05.F additive marker. True only when the canonical group session owns a current structured-workout snapshot.';

alter table public.workout_structures_v2
  add column if not exists group_session_id uuid references public.group_sessions_v2(id) on delete restrict;

do $$
declare v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.workout_structures_v2'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%num_nonnulls(library_workout_id, calendar_workout_id)%';
  if v_constraint_name is not null then
    execute format('alter table public.workout_structures_v2 drop constraint %I', v_constraint_name);
  end if;
end;
$$;

alter table public.workout_structures_v2
  add constraint workout_structures_v2_exactly_one_target_check
  check (num_nonnulls(library_workout_id, calendar_workout_id, group_session_id) = 1);

create unique index if not exists workout_structures_v2_group_session_revision_unique
  on public.workout_structures_v2 (group_session_id, revision)
  where group_session_id is not null;
create unique index if not exists workout_structures_v2_group_session_current_unique
  on public.workout_structures_v2 (group_session_id)
  where group_session_id is not null and is_current;

create or replace function access_control.assert_workout_structure_group_read_authorized_v2(
  p_group_session_id uuid
) returns void language plpgsql security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
begin
  if auth.uid() is null or not access_control.current_account_is_active()
    or not groups_v2.current_user_can_read_group_session(p_group_session_id) then
    raise exception 'workout_structure_permission_denied';
  end if;
end;
$$;

create or replace function public.create_structured_group_session_v2(
  p_organization_id uuid, p_scheduled_for date, p_participant_membership_ids uuid[],
  p_library_workout_id uuid, p_title text, p_category text, p_subcategory text,
  p_description text, p_expected_rpe_global numeric, p_expected_rpe_specific numeric,
  p_document jsonb, p_idempotency_key uuid
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_source public.workout_structures_v2%rowtype;
  v_structure public.workout_structures_v2%rowtype;
  v_session public.group_sessions_v2%rowtype;
  v_existing public.workout_structures_v2%rowtype;
  v_result jsonb;
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
  if p_idempotency_key is null or p_scheduled_for is null then
    raise exception 'workout_structure_validation_failed';
  end if;
  if auth.uid() is null or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'workout_structure_permission_denied';
  end if;

  select * into v_existing from public.workout_structures_v2
  where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_existing.group_session_id is null then raise exception 'workout_structure_idempotency_conflict'; end if;
    select * into v_session from public.group_sessions_v2 where id = v_existing.group_session_id;
    return jsonb_build_object(
      'groupSessionId', v_session.id, 'groupVersion', v_session.version, 'structureId', v_existing.id, 'revision', v_existing.revision,
      'changed', false, 'totalDurationSeconds', v_existing.total_duration_seconds,
      'specificDurationSeconds', v_existing.specific_duration_seconds, 'groupSession', to_jsonb(v_session)
    );
  end if;

  if p_library_workout_id is not null then
    perform access_control.assert_workout_structure_library_authorized_v2();
    select * into v_source from public.workout_structures_v2
    where library_workout_id = p_library_workout_id and is_current for share;
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
    v_title := trim(p_title); v_category := trim(p_category);
    v_subcategory := nullif(trim(coalesce(p_subcategory, '')), '');
    v_description := coalesce(p_description, ''); v_global := p_expected_rpe_global;
    v_specific_rpe := p_expected_rpe_specific; v_document := p_document;
    select total_duration_seconds, specific_duration_seconds into v_total, v_specific
      from access_control.workout_structure_metrics_v2(v_document);
  end if;

  if (v_global is not null and v_global not between 1 and 10)
    or (v_specific_rpe is not null and v_specific_rpe not between 1 and 10)
    or (v_specific = 0 and v_specific_rpe is not null) then
    raise exception 'workout_structure_validation_failed';
  end if;

  v_result := public.create_group_session_v2(
    p_organization_id, p_scheduled_for,
    jsonb_build_object(
      'title', v_title, 'workoutType', v_category, 'subcategory', coalesce(v_subcategory, ''),
      'description', v_description, 'duration', access_control.format_legacy_duration_v2(v_total),
      'expectedRpe', case when v_global is null then '' else v_global::text end,
      'expectedRpeGlobal', v_global, 'expectedSpecificDuration', case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end,
      'expectedRpeSpecific', case when v_specific = 0 then null else v_specific_rpe end,
      'blocks', '[]'::jsonb
    ), p_participant_membership_ids
  );
  select * into v_session from public.group_sessions_v2 where id = (v_result ->> 'sessionId')::uuid for update;
  update public.group_sessions_v2 set structured_workout_v2 = true where id = v_session.id returning * into v_session;
  insert into public.workout_structures_v2 (
    group_session_id, source_structure_id, schema_version, document,
    total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id
  ) values (
    v_session.id, case when p_library_workout_id is null then null else v_source.id end, 1, v_document,
    v_total, v_specific, 1, p_idempotency_key, auth.uid()
  ) returning * into v_structure;
  return jsonb_build_object(
    'groupSessionId', v_session.id, 'groupVersion', v_session.version, 'structureId', v_structure.id, 'revision', 1,
    'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific,
    'groupSession', to_jsonb(v_session)
  );
end;
$$;

create or replace function public.get_group_session_structure_v2(p_group_session_id uuid)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_structure public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_group_read_authorized_v2(p_group_session_id);
  select * into v_structure from public.workout_structures_v2
  where group_session_id = p_group_session_id and is_current;
  if not found then return null; end if;
  return jsonb_build_object(
    'structureId', v_structure.id, 'revision', v_structure.revision, 'document', v_structure.document,
    'totalDurationSeconds', v_structure.total_duration_seconds,
    'specificDurationSeconds', v_structure.specific_duration_seconds
  );
end;
$$;

create or replace function public.update_structured_group_session_v2(
  p_group_session_id uuid, p_title text, p_category text, p_subcategory text,
  p_description text, p_expected_rpe_global numeric, p_expected_rpe_specific numeric,
  p_document jsonb, p_expected_revision integer, p_expected_group_version integer,
  p_idempotency_key uuid
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_session public.group_sessions_v2%rowtype;
  v_current public.workout_structures_v2%rowtype;
  v_new public.workout_structures_v2%rowtype;
  v_total integer;
  v_specific integer;
begin
  if p_idempotency_key is null or p_expected_revision is null or p_expected_revision < 1
    or coalesce(length(trim(p_title)), 0) = 0 or coalesce(length(trim(p_title)), 0) > 300
    or coalesce(length(trim(p_category)), 0) = 0 or coalesce(length(p_description), 0) > 5000
    or (p_expected_rpe_global is not null and p_expected_rpe_global not between 1 and 10)
    or (p_expected_rpe_specific is not null and p_expected_rpe_specific not between 1 and 10) then
    raise exception 'workout_structure_validation_failed';
  end if;
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_group_version);
  if not v_session.structured_workout_v2 then raise exception 'workout_structure_target_unavailable'; end if;
  select * into v_new from public.workout_structures_v2
  where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_new.group_session_id <> v_session.id then raise exception 'workout_structure_idempotency_conflict'; end if;
    return jsonb_build_object(
      'groupSessionId', v_session.id, 'structureId', v_new.id, 'revision', v_new.revision,
      'groupVersion', v_session.version, 'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds,
      'specificDurationSeconds', v_new.specific_duration_seconds, 'groupSession', to_jsonb(v_session)
    );
  end if;
  select * into v_current from public.workout_structures_v2
  where group_session_id = v_session.id and is_current for update;
  if not found or v_current.revision <> p_expected_revision then raise exception 'workout_structure_revision_conflict'; end if;
  select total_duration_seconds, specific_duration_seconds into v_total, v_specific
  from access_control.workout_structure_metrics_v2(p_document);
  if v_specific = 0 and p_expected_rpe_specific is not null then raise exception 'workout_structure_validation_failed'; end if;
  update public.workout_structures_v2 set is_current = false, superseded_at = clock_timestamp() where id = v_current.id;
  insert into public.workout_structures_v2 (
    group_session_id, source_structure_id, schema_version, document, total_duration_seconds,
    specific_duration_seconds, revision, idempotency_key, created_by_user_id
  ) values (
    v_session.id, v_current.source_structure_id, 1, p_document, v_total, v_specific,
    v_current.revision + 1, p_idempotency_key, auth.uid()
  ) returning * into v_new;
  update public.group_sessions_v2 set
    title = trim(p_title), workout_type = trim(p_category), subcategory = nullif(trim(coalesce(p_subcategory, '')), ''),
    description = coalesce(p_description, ''), duration = access_control.format_legacy_duration_v2(v_total),
    expected_rpe = case when p_expected_rpe_global is null then '' else p_expected_rpe_global::text end,
    expected_rpe_global = p_expected_rpe_global,
    expected_specific_duration = case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end,
    expected_rpe_specific = case when v_specific = 0 then null else p_expected_rpe_specific end,
    version = version + 1, updated_at = now()
  where id = v_session.id returning * into v_session;
  perform groups_v2.record_group_session_event(v_session.id, 'updated', jsonb_build_object('version', v_session.version, 'structured', true));
  return jsonb_build_object(
    'groupSessionId', v_session.id, 'structureId', v_new.id, 'revision', v_new.revision,
    'groupVersion', v_session.version, 'changed', true, 'totalDurationSeconds', v_total,
    'specificDurationSeconds', v_specific, 'groupSession', to_jsonb(v_session)
  );
end;
$$;

create or replace function public.update_group_session_v2(
  p_group_session_id uuid, p_expected_version integer, p_session_data jsonb
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_session public.group_sessions_v2%rowtype; v_updated public.group_sessions_v2%rowtype; v_blocks jsonb;
begin
  if jsonb_typeof(p_session_data) is distinct from 'object' then raise exception 'Session data must be a JSON object'; end if;
  if coalesce(p_session_data ->> 'scheduledFor', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'A scheduled date in YYYY-MM-DD format is required'; end if;
  if length(trim(coalesce(p_session_data ->> 'title', ''))) not between 1 and 160 then raise exception 'Session title must contain between 1 and 160 characters'; end if;
  v_blocks := coalesce(p_session_data -> 'blocks', '[]'::jsonb);
  if jsonb_typeof(v_blocks) is distinct from 'array' then raise exception 'Session blocks must be a JSON array'; end if;
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  if v_session.structured_workout_v2 then raise exception 'workout_structure_target_requires_structured_update'; end if;
  update public.group_sessions_v2 set
    scheduled_for = (p_session_data ->> 'scheduledFor')::date, title = trim(p_session_data ->> 'title'),
    workout_type = coalesce(p_session_data ->> 'workoutType', ''), subcategory = coalesce(p_session_data ->> 'subcategory', ''),
    description = coalesce(p_session_data ->> 'description', ''), duration = coalesce(p_session_data ->> 'duration', ''),
    expected_rpe = coalesce(p_session_data ->> 'expectedRpe', ''), expected_rpe_global = nullif(p_session_data ->> 'expectedRpeGlobal', '')::numeric,
    expected_specific_duration = coalesce(p_session_data ->> 'expectedSpecificDuration', ''),
    expected_rpe_specific = nullif(p_session_data ->> 'expectedRpeSpecific', '')::numeric,
    blocks = v_blocks, version = version + 1, updated_at = now()
  where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_updated.id, 'updated', jsonb_build_object('version', v_updated.version));
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

revoke all on function access_control.assert_workout_structure_group_read_authorized_v2(uuid) from public, anon, authenticated;
revoke all on function public.create_structured_group_session_v2(uuid,date,uuid[],uuid,text,text,text,text,numeric,numeric,jsonb,uuid), public.get_group_session_structure_v2(uuid), public.update_structured_group_session_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,integer,uuid) from public, anon;
grant execute on function public.create_structured_group_session_v2(uuid,date,uuid[],uuid,text,text,text,text,numeric,numeric,jsonb,uuid), public.get_group_session_structure_v2(uuid), public.update_structured_group_session_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,integer,uuid) to authenticated;

comment on table public.workout_structures_v2 is
  'P05 canonical structured workout content. One explicit library, individual calendar, or canonical Groups V2 session owner; shared group content is never materialized into calendar_workouts.';
