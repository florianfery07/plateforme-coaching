-- P03: additive Pilotage timeline. Legacy week colors, weekly planning and Goals V2 stay unchanged.
-- Cycles are intervals and milestones are dated objects by design, so overlapping cycles remain representable.

create table if not exists public.athlete_pilotage_cycles_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id) on delete restrict,
  athlete_membership_id uuid not null,
  -- No FK to the legacy athlete: its destructive legacy path remains outside this pilot.
  legacy_athlete_id uuid not null,
  goal_version_id uuid references public.athlete_goal_versions_v2 (id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  color_key text not null default 'blue'
    check (color_key in ('blue', 'emerald', 'orange', 'violet', 'rose', 'cyan')),
  intent text check (intent is null or length(btrim(intent)) <= 2000),
  created_by_user_id uuid not null references access_control.accounts (user_id) on delete restrict,
  idempotency_key uuid not null,
  revision integer not null default 1 check (revision >= 1),
  archived_at timestamptz,
  archived_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (created_by_user_id, idempotency_key),
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id) on delete restrict,
  check (ends_on >= starts_on),
  check ((archived_at is null and archived_by_user_id is null) or (archived_at is not null and archived_by_user_id is not null))
);

create table if not exists public.athlete_pilotage_milestones_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id) on delete restrict,
  athlete_membership_id uuid not null,
  -- No FK to the legacy athlete: its destructive legacy path remains outside this pilot.
  legacy_athlete_id uuid not null,
  goal_version_id uuid references public.athlete_goal_versions_v2 (id) on delete restrict,
  kind text not null check (kind in ('goal', 'competition')),
  title text not null check (length(btrim(title)) between 1 and 160),
  scheduled_for date not null,
  details text check (details is null or length(btrim(details)) <= 2000),
  created_by_user_id uuid not null references access_control.accounts (user_id) on delete restrict,
  idempotency_key uuid not null,
  revision integer not null default 1 check (revision >= 1),
  archived_at timestamptz,
  archived_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (created_by_user_id, idempotency_key),
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id) on delete restrict,
  check (kind <> 'goal' or goal_version_id is not null),
  check ((archived_at is null and archived_by_user_id is null) or (archived_at is not null and archived_by_user_id is not null))
);

create index if not exists athlete_pilotage_cycles_v2_visible_range_idx
  on public.athlete_pilotage_cycles_v2 (organization_id, athlete_membership_id, starts_on, ends_on)
  where archived_at is null;
create index if not exists athlete_pilotage_milestones_v2_visible_date_idx
  on public.athlete_pilotage_milestones_v2 (organization_id, athlete_membership_id, scheduled_for)
  where archived_at is null;
create index if not exists athlete_pilotage_cycles_v2_goal_version_idx
  on public.athlete_pilotage_cycles_v2 (goal_version_id)
  where goal_version_id is not null;
create index if not exists athlete_pilotage_milestones_v2_goal_version_idx
  on public.athlete_pilotage_milestones_v2 (goal_version_id)
  where goal_version_id is not null;

alter table public.athlete_pilotage_cycles_v2 enable row level security;
alter table public.athlete_pilotage_milestones_v2 enable row level security;
revoke all on table public.athlete_pilotage_cycles_v2, public.athlete_pilotage_milestones_v2 from public, anon, authenticated;

create or replace function public.get_athlete_pilotage_timeline_v2(
  p_legacy_athlete_id uuid,
  p_range_start date,
  p_range_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_target_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'pilotage_timeline_permission_denied';
  end if;
  if p_legacy_athlete_id is null or p_range_start is null or p_range_end is null
    or p_range_end < p_range_start or p_range_end - p_range_start > 366 then
    raise exception 'pilotage_timeline_validation_failed';
  end if;

  select count(*) into v_target_count
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then raise exception 'pilotage_timeline_target_unavailable'; end if;

  select target.organization_id, target.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then
    raise exception 'pilotage_timeline_permission_denied';
  end if;

  return jsonb_build_object(
    'legacyAthleteId', p_legacy_athlete_id,
    'cycles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cycle.id,
        'name', cycle.name,
        'startsOn', cycle.starts_on,
        'endsOn', cycle.ends_on,
        'colorKey', cycle.color_key,
        'intent', cycle.intent,
        'goalVersionId', cycle.goal_version_id,
        'revision', cycle.revision,
        'createdAt', cycle.created_at,
        'updatedAt', cycle.updated_at
      ) order by cycle.starts_on, cycle.ends_on, cycle.created_at)
      from public.athlete_pilotage_cycles_v2 cycle
      where cycle.organization_id = v_organization_id
        and cycle.athlete_membership_id = v_athlete_membership_id
        and cycle.archived_at is null
        and cycle.starts_on <= p_range_end
        and cycle.ends_on >= p_range_start
    ), '[]'::jsonb),
    'milestones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', milestone.id,
        'kind', milestone.kind,
        'title', milestone.title,
        'scheduledFor', milestone.scheduled_for,
        'details', milestone.details,
        'goalVersionId', milestone.goal_version_id,
        'goalSummary', case when goal_request.id is null then null else jsonb_build_object(
          'versionId', goal_version.id,
          'shortGoal', goal_version.short_goal,
          'mediumGoal', goal_version.medium_goal,
          'longGoal', goal_version.long_goal,
          'acceptedAt', goal_version.reviewed_at
        ) end,
        'revision', milestone.revision,
        'createdAt', milestone.created_at,
        'updatedAt', milestone.updated_at
      ) order by milestone.scheduled_for, milestone.created_at)
      from public.athlete_pilotage_milestones_v2 milestone
      left join public.athlete_goal_versions_v2 goal_version
        on goal_version.id = milestone.goal_version_id
      left join public.athlete_goal_requests_v2 goal_request
        on goal_request.id = goal_version.request_id
       and goal_request.organization_id = v_organization_id
       and goal_request.athlete_membership_id = v_athlete_membership_id
      where milestone.organization_id = v_organization_id
        and milestone.athlete_membership_id = v_athlete_membership_id
        and milestone.archived_at is null
        and milestone.scheduled_for between p_range_start and p_range_end
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_athlete_pilotage_cycle_v2(
  p_cycle_id uuid,
  p_legacy_athlete_id uuid,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_color_key text,
  p_intent text,
  p_goal_version_id uuid,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_target_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
  v_cycle public.athlete_pilotage_cycles_v2%rowtype;
  v_name text := nullif(btrim(p_name), '');
  v_intent text := nullif(btrim(p_intent), '');
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'pilotage_timeline_permission_denied';
  end if;
  if p_legacy_athlete_id is null or v_name is null or length(v_name) > 120
    or p_starts_on is null or p_ends_on is null or p_ends_on < p_starts_on
    or p_color_key not in ('blue', 'emerald', 'orange', 'violet', 'rose', 'cyan')
    or (v_intent is not null and length(v_intent) > 2000) then
    raise exception 'pilotage_timeline_validation_failed';
  end if;

  select count(*) into v_target_count from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then raise exception 'pilotage_timeline_target_unavailable'; end if;
  select target.organization_id, target.athlete_membership_id into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'pilotage_timeline_permission_denied';
  end if;
  if p_goal_version_id is not null and not exists (
    select 1
    from public.athlete_goal_versions_v2 version
    join public.athlete_goal_requests_v2 request on request.id = version.request_id
    where version.id = p_goal_version_id
      and version.review_outcome = 'accepted'
      and request.organization_id = v_organization_id
      and request.athlete_membership_id = v_athlete_membership_id
  ) then raise exception 'pilotage_timeline_goal_unavailable'; end if;

  if p_cycle_id is null then
    if p_idempotency_key is null or p_expected_revision is not null then raise exception 'pilotage_timeline_validation_failed'; end if;
    select * into v_cycle from public.athlete_pilotage_cycles_v2
    where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
    if found then
      if v_cycle.legacy_athlete_id <> p_legacy_athlete_id
        or v_cycle.name <> v_name or v_cycle.starts_on <> p_starts_on or v_cycle.ends_on <> p_ends_on
        or v_cycle.color_key <> p_color_key or v_cycle.intent is distinct from v_intent
        or v_cycle.goal_version_id is distinct from p_goal_version_id then
        raise exception 'pilotage_timeline_idempotency_conflict';
      end if;
      return jsonb_build_object('id', v_cycle.id, 'revision', v_cycle.revision, 'changed', false);
    end if;
    begin
      insert into public.athlete_pilotage_cycles_v2 (
        organization_id, athlete_membership_id, legacy_athlete_id, goal_version_id,
        name, starts_on, ends_on, color_key, intent, created_by_user_id, idempotency_key
      ) values (
        v_organization_id, v_athlete_membership_id, p_legacy_athlete_id, p_goal_version_id,
        v_name, p_starts_on, p_ends_on, p_color_key, v_intent, auth.uid(), p_idempotency_key
      ) returning * into v_cycle;
    exception when unique_violation then
      select * into v_cycle from public.athlete_pilotage_cycles_v2
      where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
      if not found then raise; end if;
      if v_cycle.legacy_athlete_id <> p_legacy_athlete_id then raise exception 'pilotage_timeline_idempotency_conflict'; end if;
      return jsonb_build_object('id', v_cycle.id, 'revision', v_cycle.revision, 'changed', false);
    end;
  else
    if p_expected_revision is null or p_idempotency_key is not null then raise exception 'pilotage_timeline_validation_failed'; end if;
    select * into v_cycle from public.athlete_pilotage_cycles_v2 where id = p_cycle_id for update;
    if not found or v_cycle.archived_at is not null or v_cycle.organization_id <> v_organization_id
      or v_cycle.athlete_membership_id <> v_athlete_membership_id or v_cycle.legacy_athlete_id <> p_legacy_athlete_id then
      raise exception 'pilotage_timeline_target_unavailable';
    end if;
    if v_cycle.revision <> p_expected_revision then
      if v_cycle.name = v_name and v_cycle.starts_on = p_starts_on and v_cycle.ends_on = p_ends_on
        and v_cycle.color_key = p_color_key and v_cycle.intent is not distinct from v_intent
        and v_cycle.goal_version_id is not distinct from p_goal_version_id then
        return jsonb_build_object('id', v_cycle.id, 'revision', v_cycle.revision, 'changed', false);
      end if;
      raise exception 'pilotage_timeline_state_conflict';
    end if;
    update public.athlete_pilotage_cycles_v2
    set name = v_name, starts_on = p_starts_on, ends_on = p_ends_on, color_key = p_color_key,
      intent = v_intent, goal_version_id = p_goal_version_id, revision = revision + 1, updated_at = now()
    where id = v_cycle.id
    returning * into v_cycle;
  end if;
  return jsonb_build_object('id', v_cycle.id, 'revision', v_cycle.revision, 'changed', true);
end;
$$;

create or replace function public.save_athlete_pilotage_milestone_v2(
  p_milestone_id uuid,
  p_legacy_athlete_id uuid,
  p_kind text,
  p_title text,
  p_scheduled_for date,
  p_details text,
  p_goal_version_id uuid,
  p_expected_revision integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_target_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
  v_milestone public.athlete_pilotage_milestones_v2%rowtype;
  v_title text := nullif(btrim(p_title), '');
  v_details text := nullif(btrim(p_details), '');
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'pilotage_timeline_permission_denied';
  end if;
  if p_legacy_athlete_id is null or p_kind not in ('goal', 'competition') or v_title is null or length(v_title) > 160
    or p_scheduled_for is null or (v_details is not null and length(v_details) > 2000)
    or (p_kind = 'goal' and p_goal_version_id is null) then
    raise exception 'pilotage_timeline_validation_failed';
  end if;
  select count(*) into v_target_count from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then raise exception 'pilotage_timeline_target_unavailable'; end if;
  select target.organization_id, target.athlete_membership_id into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'pilotage_timeline_permission_denied';
  end if;
  if p_goal_version_id is not null and not exists (
    select 1 from public.athlete_goal_versions_v2 version
    join public.athlete_goal_requests_v2 request on request.id = version.request_id
    where version.id = p_goal_version_id and version.review_outcome = 'accepted'
      and request.organization_id = v_organization_id and request.athlete_membership_id = v_athlete_membership_id
  ) then raise exception 'pilotage_timeline_goal_unavailable'; end if;

  if p_milestone_id is null then
    if p_idempotency_key is null or p_expected_revision is not null then raise exception 'pilotage_timeline_validation_failed'; end if;
    select * into v_milestone from public.athlete_pilotage_milestones_v2
    where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
    if found then
      if v_milestone.legacy_athlete_id <> p_legacy_athlete_id or v_milestone.kind <> p_kind
        or v_milestone.title <> v_title or v_milestone.scheduled_for <> p_scheduled_for
        or v_milestone.details is distinct from v_details or v_milestone.goal_version_id is distinct from p_goal_version_id then
        raise exception 'pilotage_timeline_idempotency_conflict';
      end if;
      return jsonb_build_object('id', v_milestone.id, 'revision', v_milestone.revision, 'changed', false);
    end if;
    begin
      insert into public.athlete_pilotage_milestones_v2 (
        organization_id, athlete_membership_id, legacy_athlete_id, goal_version_id, kind,
        title, scheduled_for, details, created_by_user_id, idempotency_key
      ) values (
        v_organization_id, v_athlete_membership_id, p_legacy_athlete_id, p_goal_version_id, p_kind,
        v_title, p_scheduled_for, v_details, auth.uid(), p_idempotency_key
      ) returning * into v_milestone;
    exception when unique_violation then
      select * into v_milestone from public.athlete_pilotage_milestones_v2
      where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
      if not found then raise; end if;
      if v_milestone.legacy_athlete_id <> p_legacy_athlete_id then raise exception 'pilotage_timeline_idempotency_conflict'; end if;
      return jsonb_build_object('id', v_milestone.id, 'revision', v_milestone.revision, 'changed', false);
    end;
  else
    if p_expected_revision is null or p_idempotency_key is not null then raise exception 'pilotage_timeline_validation_failed'; end if;
    select * into v_milestone from public.athlete_pilotage_milestones_v2 where id = p_milestone_id for update;
    if not found or v_milestone.archived_at is not null or v_milestone.organization_id <> v_organization_id
      or v_milestone.athlete_membership_id <> v_athlete_membership_id or v_milestone.legacy_athlete_id <> p_legacy_athlete_id then
      raise exception 'pilotage_timeline_target_unavailable';
    end if;
    if v_milestone.revision <> p_expected_revision then
      if v_milestone.kind = p_kind and v_milestone.title = v_title and v_milestone.scheduled_for = p_scheduled_for
        and v_milestone.details is not distinct from v_details and v_milestone.goal_version_id is not distinct from p_goal_version_id then
        return jsonb_build_object('id', v_milestone.id, 'revision', v_milestone.revision, 'changed', false);
      end if;
      raise exception 'pilotage_timeline_state_conflict';
    end if;
    update public.athlete_pilotage_milestones_v2
    set kind = p_kind, title = v_title, scheduled_for = p_scheduled_for, details = v_details,
      goal_version_id = p_goal_version_id, revision = revision + 1, updated_at = now()
    where id = v_milestone.id
    returning * into v_milestone;
  end if;
  return jsonb_build_object('id', v_milestone.id, 'revision', v_milestone.revision, 'changed', true);
end;
$$;

create or replace function public.archive_athlete_pilotage_cycle_v2(p_cycle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare v_cycle public.athlete_pilotage_cycles_v2%rowtype;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then raise exception 'pilotage_timeline_permission_denied'; end if;
  select * into v_cycle from public.athlete_pilotage_cycles_v2 where id = p_cycle_id for update;
  if not found or (select count(*) from access_control.resolve_active_goal_target_v2(v_cycle.legacy_athlete_id)) <> 1
    or not exists (select 1 from access_control.resolve_active_goal_target_v2(v_cycle.legacy_athlete_id) target where target.organization_id = v_cycle.organization_id and target.athlete_membership_id = v_cycle.athlete_membership_id)
    or not access_control.current_user_can_manage_athlete(v_cycle.athlete_membership_id) then raise exception 'pilotage_timeline_permission_denied'; end if;
  if v_cycle.archived_at is not null then return jsonb_build_object('id', v_cycle.id, 'changed', false); end if;
  update public.athlete_pilotage_cycles_v2 set archived_at = now(), archived_by_user_id = auth.uid(), revision = revision + 1, updated_at = now() where id = v_cycle.id;
  return jsonb_build_object('id', v_cycle.id, 'changed', true);
end;
$$;

create or replace function public.archive_athlete_pilotage_milestone_v2(p_milestone_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare v_milestone public.athlete_pilotage_milestones_v2%rowtype;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then raise exception 'pilotage_timeline_permission_denied'; end if;
  select * into v_milestone from public.athlete_pilotage_milestones_v2 where id = p_milestone_id for update;
  if not found or (select count(*) from access_control.resolve_active_goal_target_v2(v_milestone.legacy_athlete_id)) <> 1
    or not exists (select 1 from access_control.resolve_active_goal_target_v2(v_milestone.legacy_athlete_id) target where target.organization_id = v_milestone.organization_id and target.athlete_membership_id = v_milestone.athlete_membership_id)
    or not access_control.current_user_can_manage_athlete(v_milestone.athlete_membership_id) then raise exception 'pilotage_timeline_permission_denied'; end if;
  if v_milestone.archived_at is not null then return jsonb_build_object('id', v_milestone.id, 'changed', false); end if;
  update public.athlete_pilotage_milestones_v2 set archived_at = now(), archived_by_user_id = auth.uid(), revision = revision + 1, updated_at = now() where id = v_milestone.id;
  return jsonb_build_object('id', v_milestone.id, 'changed', true);
end;
$$;

revoke all on function public.get_athlete_pilotage_timeline_v2(uuid, date, date) from public, anon;
revoke all on function public.save_athlete_pilotage_cycle_v2(uuid, uuid, text, date, date, text, text, uuid, integer, uuid) from public, anon;
revoke all on function public.save_athlete_pilotage_milestone_v2(uuid, uuid, text, text, date, text, uuid, integer, uuid) from public, anon;
revoke all on function public.archive_athlete_pilotage_cycle_v2(uuid) from public, anon;
revoke all on function public.archive_athlete_pilotage_milestone_v2(uuid) from public, anon;
grant execute on function public.get_athlete_pilotage_timeline_v2(uuid, date, date) to authenticated;
grant execute on function public.save_athlete_pilotage_cycle_v2(uuid, uuid, text, date, date, text, text, uuid, integer, uuid) to authenticated;
grant execute on function public.save_athlete_pilotage_milestone_v2(uuid, uuid, text, text, date, text, uuid, integer, uuid) to authenticated;
grant execute on function public.archive_athlete_pilotage_cycle_v2(uuid) to authenticated;
grant execute on function public.archive_athlete_pilotage_milestone_v2(uuid) to authenticated;

comment on table public.athlete_pilotage_cycles_v2 is
  'P03 temporal training cycles. Overlaps are deliberately allowed and legacy weekly color data is untouched.';
comment on table public.athlete_pilotage_milestones_v2 is
  'P03 dated goals and competitions. Goal milestones may reference one accepted immutable Goals V2 version.';
comment on function public.get_athlete_pilotage_timeline_v2(uuid, date, date) is
  'P03 authorized read projection for the coach Pilotage month timeline.';
