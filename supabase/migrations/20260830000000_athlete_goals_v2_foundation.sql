-- L16b: additive, pilot-ready Goals V2 foundation.
-- Legacy goal columns and history remain unchanged. V2 writes never update them.

create table if not exists public.athlete_goal_requests_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id) on delete restrict,
  athlete_membership_id uuid not null,
  -- Deliberately no FK: the legacy deletion flow still exists outside this pilot.
  legacy_athlete_id uuid not null,
  requested_by_user_id uuid not null references access_control.accounts (user_id) on delete restrict,
  idempotency_key uuid not null,
  status text not null default 'requested'
    check (status in ('requested', 'submitted', 'changes_requested', 'accepted', 'cancelled')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  review_note text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (requested_by_user_id, idempotency_key),
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id) on delete restrict,
  check (
    (status = 'requested' and submitted_at is null and reviewed_at is null and reviewed_by_user_id is null and closed_at is null)
    or (status = 'submitted' and submitted_at is not null and reviewed_at is null and reviewed_by_user_id is null and closed_at is null)
    or (status = 'changes_requested' and submitted_at is not null and reviewed_at is not null and reviewed_by_user_id is not null and closed_at is null)
    or (status = 'accepted' and submitted_at is not null and reviewed_at is not null and reviewed_by_user_id is not null and closed_at is not null)
    or (status = 'cancelled' and closed_at is not null)
  )
);

create table if not exists public.athlete_goal_versions_v2 (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.athlete_goal_requests_v2 (id) on delete restrict,
  revision_number integer not null check (revision_number >= 0),
  source text not null check (source in ('legacy_baseline', 'athlete_submission')),
  short_goal text,
  medium_goal text,
  long_goal text,
  submitted_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  idempotency_key uuid,
  submitted_at timestamptz not null default now(),
  review_outcome text check (review_outcome in ('accepted', 'changes_requested')),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  review_note text,
  unique (request_id, revision_number),
  unique (request_id, idempotency_key),
  check (
    (source = 'legacy_baseline' and revision_number = 0 and idempotency_key is null)
    or (source = 'athlete_submission' and revision_number > 0 and idempotency_key is not null)
  ),
  check (
    source = 'legacy_baseline'
    or coalesce(length(btrim(short_goal)), 0) + coalesce(length(btrim(medium_goal)), 0) + coalesce(length(btrim(long_goal)), 0) > 0
  ),
  check (
    (review_outcome is null and reviewed_at is null and reviewed_by_user_id is null and review_note is null)
    or (review_outcome is not null and reviewed_at is not null and reviewed_by_user_id is not null)
  )
);

create unique index if not exists athlete_goal_requests_v2_one_open_request_idx
  on public.athlete_goal_requests_v2 (organization_id, athlete_membership_id)
  where status in ('requested', 'submitted', 'changes_requested');
create index if not exists athlete_goal_requests_v2_athlete_status_idx
  on public.athlete_goal_requests_v2 (organization_id, athlete_membership_id, status, created_at desc);
create index if not exists athlete_goal_versions_v2_request_revision_idx
  on public.athlete_goal_versions_v2 (request_id, revision_number desc);
create index if not exists athlete_goal_versions_v2_current_idx
  on public.athlete_goal_versions_v2 (reviewed_at desc)
  where review_outcome = 'accepted';
create unique index if not exists athlete_goal_versions_v2_one_accepted_submission_idx
  on public.athlete_goal_versions_v2 (request_id)
  where source = 'athlete_submission' and review_outcome = 'accepted';

alter table public.athlete_goal_requests_v2 enable row level security;
alter table public.athlete_goal_versions_v2 enable row level security;
revoke all on table public.athlete_goal_requests_v2, public.athlete_goal_versions_v2 from public, anon, authenticated;

create or replace function access_control.resolve_active_goal_target_v2(p_legacy_athlete_id uuid)
returns table (organization_id uuid, athlete_membership_id uuid)
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select link.organization_id, link.athlete_membership_id
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
   and membership.role = 'athlete'
   and membership.status = 'active'
  join public.athletes athlete
    on athlete.id = link.legacy_athlete_id
   and athlete.active is true
  where link.legacy_athlete_id = p_legacy_athlete_id
    and link.status = 'active';
$$;

create or replace function access_control.protect_athlete_goal_version_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'athlete_goal_version_immutable';
  end if;

  if new.id is distinct from old.id
    or new.request_id is distinct from old.request_id
    or new.revision_number is distinct from old.revision_number
    or new.source is distinct from old.source
    or new.short_goal is distinct from old.short_goal
    or new.medium_goal is distinct from old.medium_goal
    or new.long_goal is distinct from old.long_goal
    or new.submitted_by_user_id is distinct from old.submitted_by_user_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.submitted_at is distinct from old.submitted_at then
    raise exception 'athlete_goal_version_immutable';
  end if;

  if old.review_outcome is not null
    or old.reviewed_at is not null
    or old.reviewed_by_user_id is not null
    or old.review_note is not null
    or new.review_outcome is null
    or new.reviewed_at is null
    or new.reviewed_by_user_id is null then
    raise exception 'athlete_goal_version_immutable';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'protect_athlete_goal_version_v2'
      and tgrelid = 'public.athlete_goal_versions_v2'::regclass
      and not tgisinternal
  ) then
    create trigger protect_athlete_goal_version_v2
      before update or delete on public.athlete_goal_versions_v2
      for each row execute function access_control.protect_athlete_goal_version_v2();
  end if;
end;
$$;

create or replace function public.open_athlete_goal_request_v2(
  p_legacy_athlete_id uuid,
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
  v_request public.athlete_goal_requests_v2%rowtype;
  v_legacy_goal record;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_legacy_athlete_id is null or p_idempotency_key is null then
    raise exception 'athlete_goal_validation_failed';
  end if;

  select count(*) into v_target_count
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then
    raise exception 'athlete_goal_target_unavailable';
  end if;
  select target.organization_id, target.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'athlete_goal_permission_denied';
  end if;

  select * into v_request
  from public.athlete_goal_requests_v2
  where requested_by_user_id = auth.uid() and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_request.legacy_athlete_id <> p_legacy_athlete_id then
      raise exception 'athlete_goal_idempotency_conflict';
    end if;
    return jsonb_build_object('requestId', v_request.id, 'status', v_request.status, 'changed', false);
  end if;

  select * into v_request
  from public.athlete_goal_requests_v2
  where organization_id = v_organization_id
    and athlete_membership_id = v_athlete_membership_id
    and status in ('requested', 'submitted', 'changes_requested')
  for update;
  if found then
    return jsonb_build_object('requestId', v_request.id, 'status', v_request.status, 'changed', false);
  end if;

  begin
    insert into public.athlete_goal_requests_v2 (
      organization_id, athlete_membership_id, legacy_athlete_id, requested_by_user_id, idempotency_key
    ) values (
      v_organization_id, v_athlete_membership_id, p_legacy_athlete_id, auth.uid(), p_idempotency_key
    ) returning * into v_request;
  exception when unique_violation then
    select * into v_request
    from public.athlete_goal_requests_v2
    where organization_id = v_organization_id
      and athlete_membership_id = v_athlete_membership_id
      and status in ('requested', 'submitted', 'changes_requested')
    for update;
    if not found then raise; end if;
    return jsonb_build_object('requestId', v_request.id, 'status', v_request.status, 'changed', false);
  end;

  if not exists (
    select 1
    from public.athlete_goal_versions_v2 version
    join public.athlete_goal_requests_v2 request on request.id = version.request_id
    where request.organization_id = v_organization_id
      and request.athlete_membership_id = v_athlete_membership_id
      and version.review_outcome = 'accepted'
  ) then
    select short_goal, medium_goal, long_goal into v_legacy_goal
    from public.athletes
    where id = p_legacy_athlete_id
    for update;

    insert into public.athlete_goal_versions_v2 (
      request_id, revision_number, source, short_goal, medium_goal, long_goal,
      submitted_by_user_id, review_outcome, reviewed_at, reviewed_by_user_id
    ) values (
      v_request.id, 0, 'legacy_baseline', v_legacy_goal.short_goal, v_legacy_goal.medium_goal, v_legacy_goal.long_goal,
      auth.uid(), 'accepted', now(), auth.uid()
    );
  end if;

  return jsonb_build_object('requestId', v_request.id, 'status', 'requested', 'changed', true);
end;
$$;

create or replace function public.cancel_athlete_goal_request_v2(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_request public.athlete_goal_requests_v2%rowtype;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_request_id is null then raise exception 'athlete_goal_validation_failed'; end if;

  select * into v_request from public.athlete_goal_requests_v2 where id = p_request_id for update;
  if not found then raise exception 'athlete_goal_target_unavailable'; end if;
  if not access_control.current_user_can_manage_athlete(v_request.athlete_membership_id) then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if (select count(*) from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id)) <> 1
    or not exists (select 1 from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id) target where target.organization_id = v_request.organization_id and target.athlete_membership_id = v_request.athlete_membership_id) then
    raise exception 'athlete_goal_target_unavailable';
  end if;
  if v_request.status = 'cancelled' then
    return jsonb_build_object('requestId', v_request.id, 'status', 'cancelled', 'changed', false);
  end if;
  if v_request.status = 'accepted' then raise exception 'athlete_goal_state_conflict'; end if;

  update public.athlete_goal_requests_v2
  set status = 'cancelled', closed_at = now(), updated_at = now()
  where id = v_request.id;
  return jsonb_build_object('requestId', v_request.id, 'status', 'cancelled', 'changed', true);
end;
$$;

create or replace function public.submit_athlete_goal_version_v2(
  p_request_id uuid,
  p_short_goal text,
  p_medium_goal text,
  p_long_goal text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_request public.athlete_goal_requests_v2%rowtype;
  v_version public.athlete_goal_versions_v2%rowtype;
  v_revision_number integer;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_request_id is null or p_idempotency_key is null
    or coalesce(length(btrim(p_short_goal)), 0) + coalesce(length(btrim(p_medium_goal)), 0) + coalesce(length(btrim(p_long_goal)), 0) = 0 then
    raise exception 'athlete_goal_validation_failed';
  end if;

  select * into v_request from public.athlete_goal_requests_v2 where id = p_request_id for update;
  if not found then raise exception 'athlete_goal_target_unavailable'; end if;
  if not exists (
    select 1 from access_control.organization_memberships membership
    where membership.id = v_request.athlete_membership_id
      and membership.organization_id = v_request.organization_id
      and membership.user_id = auth.uid()
      and membership.role = 'athlete'
      and membership.status = 'active'
  ) or (select count(*) from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id)) <> 1
  or not exists (
    select 1 from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id) target
    where target.organization_id = v_request.organization_id and target.athlete_membership_id = v_request.athlete_membership_id
  ) then
    raise exception 'athlete_goal_permission_denied';
  end if;

  select * into v_version
  from public.athlete_goal_versions_v2
  where request_id = v_request.id and idempotency_key = p_idempotency_key
  for update;
  if found then
    return jsonb_build_object('requestId', v_request.id, 'versionId', v_version.id, 'revisionNumber', v_version.revision_number, 'status', v_request.status, 'changed', false);
  end if;
  if v_request.status not in ('requested', 'changes_requested') then
    raise exception 'athlete_goal_state_conflict';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.athlete_goal_versions_v2 where request_id = v_request.id;
  insert into public.athlete_goal_versions_v2 (
    request_id, revision_number, source, short_goal, medium_goal, long_goal, submitted_by_user_id, idempotency_key
  ) values (
    v_request.id, v_revision_number, 'athlete_submission', nullif(btrim(p_short_goal), ''), nullif(btrim(p_medium_goal), ''), nullif(btrim(p_long_goal), ''), auth.uid(), p_idempotency_key
  ) returning * into v_version;
  update public.athlete_goal_requests_v2
  set status = 'submitted', submitted_at = now(), reviewed_at = null, reviewed_by_user_id = null, review_note = null, updated_at = now()
  where id = v_request.id;
  return jsonb_build_object('requestId', v_request.id, 'versionId', v_version.id, 'revisionNumber', v_version.revision_number, 'status', 'submitted', 'changed', true);
end;
$$;

create or replace function public.accept_athlete_goal_request_v2(p_request_id uuid, p_review_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_request public.athlete_goal_requests_v2%rowtype;
  v_version public.athlete_goal_versions_v2%rowtype;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_request_id is null then raise exception 'athlete_goal_validation_failed'; end if;
  select * into v_request from public.athlete_goal_requests_v2 where id = p_request_id for update;
  if not found then raise exception 'athlete_goal_target_unavailable'; end if;
  if not access_control.current_user_can_manage_athlete(v_request.athlete_membership_id)
    or (select count(*) from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id)) <> 1
    or not exists (select 1 from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id) target where target.organization_id = v_request.organization_id and target.athlete_membership_id = v_request.athlete_membership_id) then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if v_request.status = 'accepted' then
    return jsonb_build_object('requestId', v_request.id, 'status', 'accepted', 'changed', false);
  end if;
  if v_request.status <> 'submitted' then raise exception 'athlete_goal_state_conflict'; end if;
  select * into v_version from public.athlete_goal_versions_v2
  where request_id = v_request.id and source = 'athlete_submission' and review_outcome is null
  order by revision_number desc limit 1 for update;
  if not found then raise exception 'athlete_goal_state_conflict'; end if;
  update public.athlete_goal_versions_v2
  set review_outcome = 'accepted', reviewed_at = now(), reviewed_by_user_id = auth.uid(), review_note = nullif(btrim(p_review_note), '')
  where id = v_version.id;
  update public.athlete_goal_requests_v2
  set status = 'accepted', reviewed_at = now(), reviewed_by_user_id = auth.uid(), review_note = nullif(btrim(p_review_note), ''), closed_at = now(), updated_at = now()
  where id = v_request.id;
  return jsonb_build_object('requestId', v_request.id, 'versionId', v_version.id, 'status', 'accepted', 'changed', true);
end;
$$;

create or replace function public.request_athlete_goal_changes_v2(p_request_id uuid, p_review_note text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_request public.athlete_goal_requests_v2%rowtype;
  v_version public.athlete_goal_versions_v2%rowtype;
  v_note text := nullif(btrim(p_review_note), '');
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_request_id is null or v_note is null then raise exception 'athlete_goal_validation_failed'; end if;
  select * into v_request from public.athlete_goal_requests_v2 where id = p_request_id for update;
  if not found then raise exception 'athlete_goal_target_unavailable'; end if;
  if not access_control.current_user_can_manage_athlete(v_request.athlete_membership_id)
    or (select count(*) from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id)) <> 1
    or not exists (select 1 from access_control.resolve_active_goal_target_v2(v_request.legacy_athlete_id) target where target.organization_id = v_request.organization_id and target.athlete_membership_id = v_request.athlete_membership_id) then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if v_request.status = 'changes_requested' then
    return jsonb_build_object('requestId', v_request.id, 'status', 'changes_requested', 'changed', false);
  end if;
  if v_request.status <> 'submitted' then raise exception 'athlete_goal_state_conflict'; end if;
  select * into v_version from public.athlete_goal_versions_v2
  where request_id = v_request.id and source = 'athlete_submission' and review_outcome is null
  order by revision_number desc limit 1 for update;
  if not found then raise exception 'athlete_goal_state_conflict'; end if;
  update public.athlete_goal_versions_v2
  set review_outcome = 'changes_requested', reviewed_at = now(), reviewed_by_user_id = auth.uid(), review_note = v_note
  where id = v_version.id;
  update public.athlete_goal_requests_v2
  set status = 'changes_requested', reviewed_at = now(), reviewed_by_user_id = auth.uid(), review_note = v_note, updated_at = now()
  where id = v_request.id;
  return jsonb_build_object('requestId', v_request.id, 'versionId', v_version.id, 'status', 'changes_requested', 'changed', true);
end;
$$;

create or replace function public.get_athlete_current_goal_v2(p_legacy_athlete_id uuid)
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
  v_current jsonb;
begin
  if auth.uid() is null or not access_control.current_account_is_active() or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_legacy_athlete_id is null then raise exception 'athlete_goal_validation_failed'; end if;
  select count(*) into v_target_count
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then raise exception 'athlete_goal_target_unavailable'; end if;
  select target.organization_id, target.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then raise exception 'athlete_goal_permission_denied'; end if;
  select jsonb_build_object(
    'versionId', version.id, 'requestId', request.id, 'revisionNumber', version.revision_number,
    'source', version.source, 'shortGoal', version.short_goal, 'mediumGoal', version.medium_goal,
    'longGoal', version.long_goal, 'acceptedAt', version.reviewed_at
  ) into v_current
  from public.athlete_goal_versions_v2 version
  join public.athlete_goal_requests_v2 request on request.id = version.request_id
  where request.organization_id = v_organization_id
    and request.athlete_membership_id = v_athlete_membership_id
    and version.review_outcome = 'accepted'
  order by version.reviewed_at desc, version.revision_number desc
  limit 1;
  return jsonb_build_object('legacyAthleteId', p_legacy_athlete_id, 'current', v_current);
end;
$$;

create or replace function public.list_athlete_goal_history_v2(p_legacy_athlete_id uuid)
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
    raise exception 'athlete_goal_permission_denied';
  end if;
  if p_legacy_athlete_id is null then raise exception 'athlete_goal_validation_failed'; end if;
  select count(*) into v_target_count
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then raise exception 'athlete_goal_target_unavailable'; end if;
  select target.organization_id, target.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then raise exception 'athlete_goal_permission_denied'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'versionId', version.id, 'requestId', request.id, 'requestStatus', request.status,
      'revisionNumber', version.revision_number, 'source', version.source,
      'shortGoal', version.short_goal, 'mediumGoal', version.medium_goal, 'longGoal', version.long_goal,
      'submittedAt', version.submitted_at, 'reviewOutcome', version.review_outcome,
      'reviewedAt', version.reviewed_at, 'reviewNote', version.review_note
    ) order by request.created_at desc, version.revision_number desc)
    from public.athlete_goal_versions_v2 version
    join public.athlete_goal_requests_v2 request on request.id = version.request_id
    where request.organization_id = v_organization_id and request.athlete_membership_id = v_athlete_membership_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function access_control.resolve_active_goal_target_v2(uuid) from public, anon, authenticated;
revoke all on function access_control.protect_athlete_goal_version_v2() from public, anon, authenticated;
revoke all on function public.open_athlete_goal_request_v2(uuid, uuid) from public, anon;
revoke all on function public.cancel_athlete_goal_request_v2(uuid) from public, anon;
revoke all on function public.submit_athlete_goal_version_v2(uuid, text, text, text, uuid) from public, anon;
revoke all on function public.accept_athlete_goal_request_v2(uuid, text) from public, anon;
revoke all on function public.request_athlete_goal_changes_v2(uuid, text) from public, anon;
revoke all on function public.get_athlete_current_goal_v2(uuid) from public, anon;
revoke all on function public.list_athlete_goal_history_v2(uuid) from public, anon;
grant execute on function public.open_athlete_goal_request_v2(uuid, uuid) to authenticated;
grant execute on function public.cancel_athlete_goal_request_v2(uuid) to authenticated;
grant execute on function public.submit_athlete_goal_version_v2(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.accept_athlete_goal_request_v2(uuid, text) to authenticated;
grant execute on function public.request_athlete_goal_changes_v2(uuid, text) to authenticated;
grant execute on function public.get_athlete_current_goal_v2(uuid) to authenticated;
grant execute on function public.list_athlete_goal_history_v2(uuid) to authenticated;

comment on table public.athlete_goal_requests_v2 is
  'L16b Goal V2 workflow. It is isolated from legacy goal columns and only callable through controlled RPCs.';
comment on table public.athlete_goal_versions_v2 is
  'L16b append-only goal revisions. Content is immutable; one review outcome may be attached once by an authorized coach.';
comment on function public.open_athlete_goal_request_v2(uuid, uuid) is
  'L16b atomic goal-update request opening with a one-time legacy read baseline and no legacy write.';
