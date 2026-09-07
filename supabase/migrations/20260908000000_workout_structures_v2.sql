-- P05.C: additive, pilot-only persistence for the canonical structured workout document.
-- It intentionally leaves legacy builders, parent-table RLS and legacy blocks untouched.

create table if not exists public.workout_structures_v2 (
  id uuid primary key default gen_random_uuid(),
  library_workout_id uuid references public.workout_library(id) on delete cascade,
  calendar_workout_id uuid references public.calendar_workouts(id) on delete cascade,
  source_structure_id uuid references public.workout_structures_v2(id) on delete restrict,
  schema_version integer not null check (schema_version = 1),
  document jsonb not null,
  total_duration_seconds integer not null check (total_duration_seconds > 0),
  specific_duration_seconds integer not null check (
    specific_duration_seconds >= 0 and specific_duration_seconds <= total_duration_seconds
  ),
  revision integer not null check (revision > 0),
  is_current boolean not null default true,
  idempotency_key uuid not null,
  created_by_user_id uuid not null references access_control.accounts(user_id) on delete restrict,
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(library_workout_id, calendar_workout_id) = 1),
  check ((is_current and superseded_at is null) or (not is_current and superseded_at is not null))
);

create unique index if not exists workout_structures_v2_library_revision_unique
  on public.workout_structures_v2 (library_workout_id, revision)
  where library_workout_id is not null;
create unique index if not exists workout_structures_v2_calendar_revision_unique
  on public.workout_structures_v2 (calendar_workout_id, revision)
  where calendar_workout_id is not null;
create unique index if not exists workout_structures_v2_library_current_unique
  on public.workout_structures_v2 (library_workout_id)
  where library_workout_id is not null and is_current;
create unique index if not exists workout_structures_v2_calendar_current_unique
  on public.workout_structures_v2 (calendar_workout_id)
  where calendar_workout_id is not null and is_current;
create unique index if not exists workout_structures_v2_idempotency_unique
  on public.workout_structures_v2 (created_by_user_id, idempotency_key);
create index if not exists workout_structures_v2_source_idx
  on public.workout_structures_v2 (source_structure_id) where source_structure_id is not null;

comment on table public.workout_structures_v2 is
  'P05.C canonical structured workout content. It has one explicit library or calendar owner; Groups V2 is intentionally deferred to P05.F.';
comment on column public.workout_structures_v2.document is
  'Canonical P05 structured content only: blocks, steps, repeats, duration, intensity, instruction and explicit isSpecific. Parent rows retain metadata.';
comment on column public.workout_structures_v2.source_structure_id is
  'Minimal lineage: a calendar snapshot references the exact library revision it was created from. It is not a general version graph.';

create or replace function access_control.workout_structure_metrics_v2(p_document jsonb)
returns table(total_duration_seconds integer, specific_duration_seconds integer)
language plpgsql
immutable
set search_path = pg_catalog, public, access_control
as $$
declare
  v_block jsonb;
  v_step jsonb;
  v_ids text[] := array[]::text[];
  v_duration integer;
  v_repetitions integer;
  v_block_total integer;
  v_block_specific integer;
  v_key text;
begin
  if jsonb_typeof(p_document) <> 'object'
    or p_document ?| array['schemaVersion', 'blocks'] is false
    or (select count(*) from jsonb_object_keys(p_document)) <> 2
    or p_document->>'schemaVersion' <> '1'
    or jsonb_typeof(p_document->'blocks') <> 'array'
    or jsonb_array_length(p_document->'blocks') between 1 and 100 is false then
    raise exception 'workout_structure_validation_failed';
  end if;

  total_duration_seconds := 0;
  specific_duration_seconds := 0;
  for v_block in select value from jsonb_array_elements(p_document->'blocks') loop
    if jsonb_typeof(v_block) <> 'object' then raise exception 'workout_structure_validation_failed'; end if;
    if v_block->>'kind' = 'repeat' then
      if not (v_block ?& array['id', 'kind', 'repetitions', 'steps'])
        or (select count(*) from jsonb_object_keys(v_block)) > 6
        or jsonb_typeof(v_block->'steps') <> 'array'
        or jsonb_array_length(v_block->'steps') between 1 and 20 is false
        or coalesce((v_block->>'repetitions')::integer, 0) not between 1 and 100 then
        raise exception 'workout_structure_validation_failed';
      end if;
      v_repetitions := (v_block->>'repetitions')::integer;
      v_block_total := 0;
      v_block_specific := 0;
      if coalesce(length(trim(v_block->>'id')), 0) not between 1 and 100 or v_block->>'id' = any(v_ids) then
        raise exception 'workout_structure_validation_failed';
      end if;
      v_ids := array_append(v_ids, v_block->>'id');
      for v_step in select value from jsonb_array_elements(v_block->'steps') loop
        if jsonb_typeof(v_step) <> 'object' or v_step->>'kind' = 'repeat' then
          raise exception 'workout_structure_validation_failed';
        end if;
        perform access_control.validate_workout_atomic_step_v2(v_step, v_ids);
        v_ids := array_append(v_ids, v_step->>'id');
        v_duration := (v_step->>'durationSeconds')::integer;
        v_block_total := v_block_total + v_duration;
        if (v_step->>'isSpecific')::boolean then v_block_specific := v_block_specific + v_duration; end if;
      end loop;
      total_duration_seconds := total_duration_seconds + (v_block_total * v_repetitions);
      specific_duration_seconds := specific_duration_seconds + (v_block_specific * v_repetitions);
    else
      perform access_control.validate_workout_atomic_step_v2(v_block, v_ids);
      v_ids := array_append(v_ids, v_block->>'id');
      v_duration := (v_block->>'durationSeconds')::integer;
      total_duration_seconds := total_duration_seconds + v_duration;
      if (v_block->>'isSpecific')::boolean then specific_duration_seconds := specific_duration_seconds + v_duration; end if;
    end if;
  end loop;
  return next;
end;
$$;

-- PostgreSQL requires the atomic validator to exist before the metrics function can execute.
-- Replacing the body after declaration keeps the migration ordering explicit and safe.
create or replace function access_control.validate_workout_atomic_step_v2(p_step jsonb, p_ids text[])
returns void
language plpgsql
immutable
set search_path = pg_catalog, public, access_control
as $$
declare
  v_key text;
  v_id text;
  v_duration integer;
  v_rpe integer;
  v_min numeric;
  v_max numeric;
begin
  if jsonb_typeof(p_step) <> 'object'
    or not (p_step ?& array['id', 'kind', 'durationSeconds', 'isSpecific']) then
    raise exception 'workout_structure_validation_failed';
  end if;
  for v_key in select jsonb_object_keys(p_step) loop
    if v_key not in ('id', 'kind', 'durationSeconds', 'isSpecific', 'intensity', 'instruction', 'label') then
      raise exception 'workout_structure_validation_failed';
    end if;
  end loop;
  v_id := p_step->>'id';
  if coalesce(length(trim(v_id)), 0) not between 1 and 100 or v_id = any(p_ids)
    or p_step->>'kind' not in ('warmup', 'effort', 'recovery', 'transition', 'cooldown', 'free') then
    raise exception 'workout_structure_validation_failed';
  end if;
  begin v_duration := (p_step->>'durationSeconds')::integer; exception when others then raise exception 'workout_structure_validation_failed'; end;
  if v_duration not between 1 and 86400 or jsonb_typeof(p_step->'isSpecific') <> 'boolean' then
    raise exception 'workout_structure_validation_failed';
  end if;
  if p_step ? 'label' and coalesce(length(trim(p_step->>'label')), 0) not between 1 and 500 then raise exception 'workout_structure_validation_failed'; end if;
  if p_step ? 'instruction' and coalesce(length(trim(p_step->>'instruction')), 0) not between 1 and 2000 then raise exception 'workout_structure_validation_failed'; end if;
  if p_step ? 'intensity' then
    if jsonb_typeof(p_step->'intensity') <> 'object' then raise exception 'workout_structure_validation_failed'; end if;
    for v_key in select jsonb_object_keys(p_step->'intensity') loop
      if v_key not in ('zone', 'powerPercentCp', 'targetRpe') then raise exception 'workout_structure_validation_failed'; end if;
    end loop;
    if p_step->'intensity' ? 'zone' and p_step->'intensity'->>'zone' not in ('Z1','Z2','Z3','Z4','Z5','Z6','Z7') then raise exception 'workout_structure_validation_failed'; end if;
    if p_step->'intensity' ? 'targetRpe' then
      begin v_rpe := (p_step->'intensity'->>'targetRpe')::integer; exception when others then raise exception 'workout_structure_validation_failed'; end;
      if v_rpe not between 1 and 10 then raise exception 'workout_structure_validation_failed'; end if;
    end if;
    if p_step->'intensity' ? 'powerPercentCp' then
      if jsonb_typeof(p_step->'intensity'->'powerPercentCp') <> 'object' then raise exception 'workout_structure_validation_failed'; end if;
      begin
        v_min := (p_step->'intensity'->'powerPercentCp'->>'min')::numeric;
        v_max := (p_step->'intensity'->'powerPercentCp'->>'max')::numeric;
      exception when others then raise exception 'workout_structure_validation_failed'; end;
      if v_min <= 0 or v_max < v_min or v_max > 300 then raise exception 'workout_structure_validation_failed'; end if;
    end if;
  end if;
end;
$$;

-- Recreate now that the validator is available (PostgreSQL resolves it at call time).
create or replace function access_control.format_legacy_duration_v2(p_seconds integer)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare v_hours integer; v_minutes integer;
begin
  if p_seconds <= 0 then raise exception 'workout_structure_validation_failed'; end if;
  if p_seconds % 60 <> 0 then
    return lpad((p_seconds / 3600)::text, 2, '0') || ':' || lpad(((p_seconds % 3600) / 60)::text, 2, '0') || ':' || lpad((p_seconds % 60)::text, 2, '0');
  end if;
  v_hours := p_seconds / 3600; v_minutes := (p_seconds % 3600) / 60;
  if v_hours > 0 and v_minutes > 0 then return v_hours::text || 'h' || lpad(v_minutes::text, 2, '0'); end if;
  if v_hours > 0 then return v_hours::text || 'h'; end if;
  return v_minutes::text || 'min';
end;
$$;

create or replace function access_control.assert_workout_structure_library_authorized_v2()
returns void language plpgsql stable security definer set search_path = pg_catalog, public, access_control as $$
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot()
    or not exists (select 1 from access_control.organization_memberships where user_id = auth.uid() and status = 'active' and role in ('organization_owner','organization_administrator','coach','assistant_coach','practitioner')) then
    raise exception 'workout_structure_permission_denied';
  end if;
end;
$$;

create or replace function access_control.assert_workout_structure_calendar_authorized_v2(p_calendar_workout_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_membership_id uuid; v_matches integer;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then raise exception 'workout_structure_permission_denied'; end if;
  select count(*), (array_agg(link.athlete_membership_id))[1] into v_matches, v_membership_id
  from public.calendar_workouts workout
  join public.athletes athlete on athlete.id = workout.athlete_id and athlete.active is true
  join access_control.legacy_athlete_links link on link.legacy_athlete_id = athlete.id and link.status = 'active'
  join access_control.organization_memberships membership on membership.id = link.athlete_membership_id and membership.organization_id = link.organization_id and membership.role = 'athlete' and membership.status = 'active'
  where workout.id = p_calendar_workout_id;
  if v_matches <> 1 then raise exception 'workout_structure_target_unavailable'; end if;
  if not access_control.current_user_can_manage_athlete(v_membership_id) then raise exception 'workout_structure_permission_denied'; end if;
end;
$$;

create or replace function access_control.protect_workout_structure_v2()
returns trigger language plpgsql set search_path = pg_catalog, public, access_control as $$
begin
  if tg_op = 'DELETE' then raise exception 'workout_structure_immutable'; end if;
  if old.document is distinct from new.document or old.schema_version is distinct from new.schema_version
    or old.total_duration_seconds is distinct from new.total_duration_seconds or old.specific_duration_seconds is distinct from new.specific_duration_seconds
    or old.revision is distinct from new.revision or old.library_workout_id is distinct from new.library_workout_id
    or old.calendar_workout_id is distinct from new.calendar_workout_id or old.source_structure_id is distinct from new.source_structure_id
    or old.idempotency_key is distinct from new.idempotency_key or old.created_by_user_id is distinct from new.created_by_user_id
    or old.created_at is distinct from new.created_at then raise exception 'workout_structure_immutable'; end if;
  if old.is_current and not new.is_current and new.superseded_at is not null then return new; end if;
  raise exception 'workout_structure_immutable';
end;
$$;
create trigger protect_workout_structure_v2 before update or delete on public.workout_structures_v2 for each row execute function access_control.protect_workout_structure_v2();

alter table public.workout_structures_v2 enable row level security;
revoke all on table public.workout_structures_v2 from public, anon, authenticated;

create or replace function public.upsert_workout_library_structure_v2(p_library_workout_id uuid, p_document jsonb, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_current public.workout_structures_v2%rowtype; v_total integer; v_specific integer; v_new public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_library_authorized_v2();
  if p_library_workout_id is null or p_idempotency_key is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'workout_structure_validation_failed'; end if;
  if not exists (select 1 from public.workout_library where id = p_library_workout_id for update) then raise exception 'workout_structure_target_unavailable'; end if;
  select * into v_new from public.workout_structures_v2 where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_new.library_workout_id <> p_library_workout_id then raise exception 'workout_structure_idempotency_conflict'; end if;
    return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds, 'specificDurationSeconds', v_new.specific_duration_seconds);
  end if;
  select * into v_current from public.workout_structures_v2 where library_workout_id = p_library_workout_id and is_current for update;
  if (not found and p_expected_revision <> 0) or (found and v_current.revision <> p_expected_revision) then raise exception 'workout_structure_revision_conflict'; end if;
  select total_duration_seconds, specific_duration_seconds into v_total, v_specific from access_control.workout_structure_metrics_v2(p_document);
  if found then update public.workout_structures_v2 set is_current = false, superseded_at = clock_timestamp() where id = v_current.id; end if;
  insert into public.workout_structures_v2 (library_workout_id, source_structure_id, schema_version, document, total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id)
  values (p_library_workout_id, case when found then v_current.id else null end, 1, p_document, v_total, v_specific, coalesce(v_current.revision, 0) + 1, p_idempotency_key, auth.uid()) returning * into v_new;
  update public.workout_library set total_duration = access_control.format_legacy_duration_v2(v_total), expected_specific_duration = case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end where id = p_library_workout_id;
  return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific);
end;
$$;

create or replace function public.upsert_calendar_workout_structure_v2(p_calendar_workout_id uuid, p_document jsonb, p_expected_revision integer, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_current public.workout_structures_v2%rowtype; v_total integer; v_specific integer; v_new public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_calendar_authorized_v2(p_calendar_workout_id);
  if p_idempotency_key is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'workout_structure_validation_failed'; end if;
  select * into v_new from public.workout_structures_v2 where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_new.calendar_workout_id <> p_calendar_workout_id then raise exception 'workout_structure_idempotency_conflict'; end if;
    return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds, 'specificDurationSeconds', v_new.specific_duration_seconds);
  end if;
  select * into v_current from public.workout_structures_v2 where calendar_workout_id = p_calendar_workout_id and is_current for update;
  if (not found and p_expected_revision <> 0) or (found and v_current.revision <> p_expected_revision) then raise exception 'workout_structure_revision_conflict'; end if;
  select total_duration_seconds, specific_duration_seconds into v_total, v_specific from access_control.workout_structure_metrics_v2(p_document);
  if found then update public.workout_structures_v2 set is_current = false, superseded_at = clock_timestamp() where id = v_current.id; end if;
  insert into public.workout_structures_v2 (calendar_workout_id, source_structure_id, schema_version, document, total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id)
  values (p_calendar_workout_id, case when found then v_current.source_structure_id else null end, 1, p_document, v_total, v_specific, coalesce(v_current.revision, 0) + 1, p_idempotency_key, auth.uid()) returning * into v_new;
  update public.calendar_workouts set duration = access_control.format_legacy_duration_v2(v_total), expected_specific_duration = case when v_specific = 0 then '' else access_control.format_legacy_duration_v2(v_specific) end where id = p_calendar_workout_id;
  return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific);
end;
$$;

create or replace function public.create_calendar_workout_structure_snapshot_v2(p_calendar_workout_id uuid, p_library_structure_id uuid, p_idempotency_key uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_source public.workout_structures_v2%rowtype; v_existing public.workout_structures_v2%rowtype; v_new public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_calendar_authorized_v2(p_calendar_workout_id);
  perform access_control.assert_workout_structure_library_authorized_v2();
  if p_library_structure_id is null or p_idempotency_key is null then raise exception 'workout_structure_validation_failed'; end if;
  select * into v_source from public.workout_structures_v2 where id = p_library_structure_id and library_workout_id is not null and is_current for share;
  if not found then raise exception 'workout_structure_target_unavailable'; end if;
  select * into v_new from public.workout_structures_v2 where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    if v_new.calendar_workout_id <> p_calendar_workout_id then raise exception 'workout_structure_idempotency_conflict'; end if;
    return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', false, 'totalDurationSeconds', v_new.total_duration_seconds, 'specificDurationSeconds', v_new.specific_duration_seconds);
  end if;
  select * into v_existing from public.workout_structures_v2 where calendar_workout_id = p_calendar_workout_id and is_current for update;
  if found then raise exception 'workout_structure_revision_conflict'; end if;
  insert into public.workout_structures_v2 (calendar_workout_id, source_structure_id, schema_version, document, total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id)
  values (p_calendar_workout_id, v_source.id, v_source.schema_version, v_source.document, v_source.total_duration_seconds, v_source.specific_duration_seconds, 1, p_idempotency_key, auth.uid()) returning * into v_new;
  update public.calendar_workouts set duration = access_control.format_legacy_duration_v2(v_source.total_duration_seconds), expected_specific_duration = case when v_source.specific_duration_seconds = 0 then '' else access_control.format_legacy_duration_v2(v_source.specific_duration_seconds) end where id = p_calendar_workout_id;
  return jsonb_build_object('structureId', v_new.id, 'revision', v_new.revision, 'changed', true, 'totalDurationSeconds', v_new.total_duration_seconds, 'specificDurationSeconds', v_new.specific_duration_seconds);
end;
$$;

revoke all on function access_control.workout_structure_metrics_v2(jsonb), access_control.validate_workout_atomic_step_v2(jsonb, text[]), access_control.format_legacy_duration_v2(integer), access_control.assert_workout_structure_library_authorized_v2(), access_control.assert_workout_structure_calendar_authorized_v2(uuid) from public, anon, authenticated;
revoke all on function public.upsert_workout_library_structure_v2(uuid, jsonb, integer, uuid), public.upsert_calendar_workout_structure_v2(uuid, jsonb, integer, uuid), public.create_calendar_workout_structure_snapshot_v2(uuid, uuid, uuid) from public, anon;
grant execute on function public.upsert_workout_library_structure_v2(uuid, jsonb, integer, uuid), public.upsert_calendar_workout_structure_v2(uuid, jsonb, integer, uuid), public.create_calendar_workout_structure_snapshot_v2(uuid, uuid, uuid) to authenticated;

comment on function public.upsert_workout_library_structure_v2(uuid, jsonb, integer, uuid) is 'P05.C: validates content server-side, appends one library revision and updates minimal legacy duration projections atomically.';
comment on function public.upsert_calendar_workout_structure_v2(uuid, jsonb, integer, uuid) is 'P05.C: validates content server-side, appends one independent calendar snapshot revision and projects compatible durations atomically.';
comment on function public.create_calendar_workout_structure_snapshot_v2(uuid, uuid, uuid) is 'P05.C future scheduling primitive: clone exactly one current library revision into an independently editable calendar snapshot.';
