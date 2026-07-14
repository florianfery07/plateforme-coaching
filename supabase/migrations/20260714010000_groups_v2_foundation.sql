-- L09: additive, inactive foundation for group sessions V2.
-- This migration never alters legacy group, calendar, Auth, or RLS resources.
-- Apply only through an approved Supabase migration procedure after L05.

create schema if not exists groups_v2;

revoke all on schema groups_v2 from public, anon;
grant usage on schema groups_v2 to authenticated;

create table if not exists public.group_sessions_v2 (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id)
    on delete restrict,
  created_by_membership_id uuid not null,
  source_group_session_id uuid references public.group_sessions_v2 (id)
    on delete restrict,
  scheduled_for date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'deleted')),
  title text not null check (length(trim(title)) between 1 and 160),
  workout_type text not null default '',
  subcategory text not null default '',
  description text not null default '',
  duration text not null default '',
  expected_rpe text not null default '',
  expected_rpe_global numeric,
  expected_specific_duration text not null default '',
  expected_rpe_specific numeric,
  blocks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(blocks) = 'array'),
  version integer not null default 1 check (version > 0),
  cancelled_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (organization_id, created_by_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  check (
    (status = 'scheduled' and cancelled_at is null and deleted_at is null)
    or (status = 'cancelled' and cancelled_at is not null and deleted_at is null)
    or (status = 'deleted' and deleted_at is not null)
  )
);

create table if not exists public.group_session_participants_v2 (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid not null,
  organization_id uuid not null,
  athlete_membership_id uuid not null,
  assignment_status text not null default 'active'
    check (assignment_status in ('active', 'removed')),
  assigned_at timestamptz not null default now(),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_session_id, athlete_membership_id),
  foreign key (group_session_id, organization_id)
    references public.group_sessions_v2 (id, organization_id)
    on delete restrict,
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  check (
    (assignment_status = 'active' and removed_at is null)
    or (assignment_status = 'removed' and removed_at is not null)
  )
);

create table if not exists public.group_session_events_v2 (
  id uuid primary key default gen_random_uuid(),
  group_session_id uuid not null references public.group_sessions_v2 (id)
    on delete restrict,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'updated', 'duplicated', 'participant_added',
    'participant_removed', 'cancelled', 'deleted'
  )),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists group_sessions_v2_organization_schedule_idx
  on public.group_sessions_v2 (organization_id, scheduled_for, status);
create index if not exists group_sessions_v2_source_idx
  on public.group_sessions_v2 (source_group_session_id)
  where source_group_session_id is not null;
create index if not exists group_session_participants_v2_athlete_idx
  on public.group_session_participants_v2 (
    athlete_membership_id, assignment_status, group_session_id
  );
create index if not exists group_session_participants_v2_session_idx
  on public.group_session_participants_v2 (
    group_session_id, assignment_status, athlete_membership_id
  );
create index if not exists group_session_events_v2_session_created_idx
  on public.group_session_events_v2 (group_session_id, created_at desc);

create or replace function groups_v2.enforce_group_session_integrity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_role text;
  v_status text;
  v_source_organization_id uuid;
begin
  select role, status into v_role, v_status
  from access_control.organization_memberships
  where id = new.created_by_membership_id
    and organization_id = new.organization_id;

  if v_role not in (
    'organization_owner', 'organization_administrator', 'coach', 'assistant_coach'
  ) or v_status is distinct from 'active' then
    raise exception 'Group session owner must be an active management membership';
  end if;

  if new.source_group_session_id is not null then
    select organization_id into v_source_organization_id
    from public.group_sessions_v2 where id = new.source_group_session_id;
    if v_source_organization_id is distinct from new.organization_id then
      raise exception 'Group session duplication must remain in one organization';
    end if;
  end if;

  return new;
end;
$$;

create or replace function groups_v2.enforce_group_session_participant_integrity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_role text;
  v_status text;
begin
  select role, status into v_role, v_status
  from access_control.organization_memberships
  where id = new.athlete_membership_id
    and organization_id = new.organization_id;

  if v_role is distinct from 'athlete' then
    raise exception 'Group session participant must be an athlete membership';
  end if;
  if tg_op = 'INSERT' and v_status is distinct from 'active' then
    raise exception 'Group session participant must be active when assigned';
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'enforce_group_session_integrity'
    and tgrelid = 'public.group_sessions_v2'::regclass and not tgisinternal) then
    create trigger enforce_group_session_integrity before insert or update
      on public.group_sessions_v2 for each row
      execute function groups_v2.enforce_group_session_integrity();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'enforce_group_session_participant_integrity'
    and tgrelid = 'public.group_session_participants_v2'::regclass and not tgisinternal) then
    create trigger enforce_group_session_participant_integrity before insert or update
      on public.group_session_participants_v2 for each row
      execute function groups_v2.enforce_group_session_participant_integrity();
  end if;
end;
$$;

create or replace function groups_v2.current_management_membership(p_organization_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_membership_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  select membership.id into v_membership_id
  from access_control.organization_memberships membership
  join access_control.accounts account on account.user_id = membership.user_id
  where membership.organization_id = p_organization_id and membership.user_id = auth.uid()
    and membership.status = 'active' and account.account_status = 'active'
    and membership.role in ('organization_owner', 'organization_administrator', 'coach', 'assistant_coach')
  order by case membership.role when 'organization_owner' then 1
    when 'organization_administrator' then 2 when 'coach' then 3 else 4 end
  limit 1;
  if v_membership_id is null then raise exception 'Active management membership is required'; end if;
  return v_membership_id;
end;
$$;

create or replace function groups_v2.current_management_membership_is_admin(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
  select exists (
    select 1 from access_control.organization_memberships membership
    where membership.id = p_membership_id
      and membership.role in ('organization_owner', 'organization_administrator')
      and membership.status = 'active'
  );
$$;

create or replace function groups_v2.assert_manage_participants(
  p_organization_id uuid, p_actor_membership_id uuid, p_participant_membership_ids uuid[]
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_expected_count integer;
begin
  if coalesce(cardinality(p_participant_membership_ids), 0) = 0 then
    raise exception 'A group session requires at least one participant';
  end if;
  if exists (select 1 from unnest(p_participant_membership_ids) participant_id where participant_id is null) then
    raise exception 'Participant identifiers cannot be null';
  end if;
  if (select count(distinct participant_id) from unnest(p_participant_membership_ids) participant_id)
    <> cardinality(p_participant_membership_ids) then
    raise exception 'Participant identifiers must be unique';
  end if;
  v_expected_count := cardinality(p_participant_membership_ids);
  if (select count(*) from access_control.organization_memberships membership
      where membership.organization_id = p_organization_id
        and membership.id = any(p_participant_membership_ids)
        and membership.role = 'athlete' and membership.status = 'active') <> v_expected_count then
    raise exception 'Every participant must be an active athlete in the organization';
  end if;
  if not groups_v2.current_management_membership_is_admin(p_actor_membership_id)
    and exists (select 1 from unnest(p_participant_membership_ids) participant_id
      where not access_control.current_user_can_manage_athlete(participant_id)) then
    raise exception 'Actor cannot manage every requested participant';
  end if;
end;
$$;

create or replace function groups_v2.current_user_can_read_group_session(p_group_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
  select exists (
    select 1 from public.group_sessions_v2 session
    where session.id = p_group_session_id and (
      exists (select 1 from access_control.organization_memberships membership
        join access_control.accounts account on account.user_id = membership.user_id
        where membership.organization_id = session.organization_id
          and membership.user_id = auth.uid() and membership.status = 'active'
          and account.account_status = 'active'
          and membership.role in ('organization_owner', 'organization_administrator'))
      or exists (select 1 from public.group_session_participants_v2 participant
        join access_control.organization_memberships athlete_membership
          on athlete_membership.id = participant.athlete_membership_id
        where participant.group_session_id = session.id and participant.assignment_status = 'active'
          and athlete_membership.user_id = auth.uid() and athlete_membership.status = 'active')
      or exists (select 1 from public.group_session_participants_v2 participant
        where participant.group_session_id = session.id and participant.assignment_status = 'active'
          and access_control.current_user_can_access_athlete(participant.athlete_membership_id))
    )
  );
$$;

create or replace function groups_v2.current_user_can_manage_group_session(p_group_session_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_session public.group_sessions_v2%rowtype;
  v_actor_membership_id uuid;
begin
  select * into v_session from public.group_sessions_v2 where id = p_group_session_id;
  if not found then return false; end if;
  begin
    v_actor_membership_id := groups_v2.current_management_membership(v_session.organization_id);
  exception when others then return false;
  end;
  if groups_v2.current_management_membership_is_admin(v_actor_membership_id) then return true; end if;
  return not exists (
    select 1 from public.group_session_participants_v2 participant
    where participant.group_session_id = v_session.id and participant.assignment_status = 'active'
      and not access_control.current_user_can_manage_athlete(participant.athlete_membership_id)
  );
end;
$$;

create or replace function groups_v2.assert_session_mutable(
  p_group_session_id uuid, p_expected_version integer
)
returns public.group_sessions_v2
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_session public.group_sessions_v2%rowtype;
begin
  if p_expected_version is null or p_expected_version < 1 then
    raise exception 'Expected version must be a positive integer';
  end if;
  select * into v_session from public.group_sessions_v2
  where id = p_group_session_id for update;
  if not found then raise exception 'Group session was not found'; end if;
  if v_session.version <> p_expected_version then raise exception 'Group session version conflict'; end if;
  if v_session.status <> 'scheduled' then raise exception 'Only scheduled group sessions can be changed'; end if;
  if not groups_v2.current_user_can_manage_group_session(v_session.id) then
    raise exception 'Actor cannot manage this group session';
  end if;
  return v_session;
end;
$$;

create or replace function groups_v2.record_group_session_event(
  p_group_session_id uuid, p_event_type text, p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
begin
  insert into public.group_session_events_v2 (group_session_id, actor_user_id, event_type, payload)
  values (p_group_session_id, auth.uid(), p_event_type, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.create_group_session_v2(
  p_organization_id uuid, p_scheduled_for date, p_session_data jsonb,
  p_participant_membership_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_actor_membership_id uuid;
  v_session public.group_sessions_v2%rowtype;
  v_blocks jsonb;
begin
  if jsonb_typeof(p_session_data) is distinct from 'object' then
    raise exception 'Session data must be a JSON object';
  end if;
  if p_scheduled_for is null then raise exception 'A scheduled date is required'; end if;
  if length(trim(coalesce(p_session_data ->> 'title', ''))) not between 1 and 160 then
    raise exception 'Session title must contain between 1 and 160 characters';
  end if;
  v_blocks := coalesce(p_session_data -> 'blocks', '[]'::jsonb);
  if jsonb_typeof(v_blocks) is distinct from 'array' then raise exception 'Session blocks must be a JSON array'; end if;
  v_actor_membership_id := groups_v2.current_management_membership(p_organization_id);
  perform groups_v2.assert_manage_participants(
    p_organization_id, v_actor_membership_id, p_participant_membership_ids
  );
  insert into public.group_sessions_v2 (
    organization_id, created_by_membership_id, scheduled_for, title, workout_type,
    subcategory, description, duration, expected_rpe, expected_rpe_global,
    expected_specific_duration, expected_rpe_specific, blocks
  ) values (
    p_organization_id, v_actor_membership_id, p_scheduled_for,
    trim(p_session_data ->> 'title'), coalesce(p_session_data ->> 'workoutType', ''),
    coalesce(p_session_data ->> 'subcategory', ''), coalesce(p_session_data ->> 'description', ''),
    coalesce(p_session_data ->> 'duration', ''), coalesce(p_session_data ->> 'expectedRpe', ''),
    nullif(p_session_data ->> 'expectedRpeGlobal', '')::numeric,
    coalesce(p_session_data ->> 'expectedSpecificDuration', ''),
    nullif(p_session_data ->> 'expectedRpeSpecific', '')::numeric, v_blocks
  ) returning * into v_session;
  insert into public.group_session_participants_v2 (
    group_session_id, organization_id, athlete_membership_id
  ) select v_session.id, p_organization_id, participant_id
    from unnest(p_participant_membership_ids) participant_id;
  perform groups_v2.record_group_session_event(v_session.id, 'created',
    jsonb_build_object('participantCount', cardinality(p_participant_membership_ids)));
  return jsonb_build_object('sessionId', v_session.id, 'status', v_session.status, 'version', v_session.version);
end;
$$;

create or replace function public.update_group_session_v2(
  p_group_session_id uuid, p_expected_version integer, p_session_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_session public.group_sessions_v2%rowtype;
  v_updated public.group_sessions_v2%rowtype;
  v_blocks jsonb;
begin
  if jsonb_typeof(p_session_data) is distinct from 'object' then raise exception 'Session data must be a JSON object'; end if;
  if coalesce(p_session_data ->> 'scheduledFor', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'A scheduled date in YYYY-MM-DD format is required';
  end if;
  if length(trim(coalesce(p_session_data ->> 'title', ''))) not between 1 and 160 then
    raise exception 'Session title must contain between 1 and 160 characters';
  end if;
  v_blocks := coalesce(p_session_data -> 'blocks', '[]'::jsonb);
  if jsonb_typeof(v_blocks) is distinct from 'array' then raise exception 'Session blocks must be a JSON array'; end if;
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  update public.group_sessions_v2 set
    scheduled_for = (p_session_data ->> 'scheduledFor')::date,
    title = trim(p_session_data ->> 'title'), workout_type = coalesce(p_session_data ->> 'workoutType', ''),
    subcategory = coalesce(p_session_data ->> 'subcategory', ''), description = coalesce(p_session_data ->> 'description', ''),
    duration = coalesce(p_session_data ->> 'duration', ''), expected_rpe = coalesce(p_session_data ->> 'expectedRpe', ''),
    expected_rpe_global = nullif(p_session_data ->> 'expectedRpeGlobal', '')::numeric,
    expected_specific_duration = coalesce(p_session_data ->> 'expectedSpecificDuration', ''),
    expected_rpe_specific = nullif(p_session_data ->> 'expectedRpeSpecific', '')::numeric,
    blocks = v_blocks, version = version + 1, updated_at = now()
  where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_updated.id, 'updated', jsonb_build_object('version', v_updated.version));
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

create or replace function public.add_group_session_participant_v2(
  p_group_session_id uuid, p_expected_version integer, p_athlete_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_session public.group_sessions_v2%rowtype;
  v_actor_membership_id uuid;
  v_updated public.group_sessions_v2%rowtype;
begin
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  v_actor_membership_id := groups_v2.current_management_membership(v_session.organization_id);
  perform groups_v2.assert_manage_participants(v_session.organization_id, v_actor_membership_id, array[p_athlete_membership_id]);
  insert into public.group_session_participants_v2 (
    group_session_id, organization_id, athlete_membership_id, assignment_status, removed_at
  ) values (v_session.id, v_session.organization_id, p_athlete_membership_id, 'active', null)
  on conflict (group_session_id, athlete_membership_id) do update
    set assignment_status = 'active', assigned_at = now(), removed_at = null, updated_at = now();
  update public.group_sessions_v2 set version = version + 1, updated_at = now()
    where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_session.id, 'participant_added',
    jsonb_build_object('athleteMembershipId', p_athlete_membership_id));
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

create or replace function public.remove_group_session_participant_v2(
  p_group_session_id uuid, p_expected_version integer, p_athlete_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_session public.group_sessions_v2%rowtype;
  v_updated public.group_sessions_v2%rowtype;
begin
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  update public.group_session_participants_v2 set assignment_status = 'removed', removed_at = now(), updated_at = now()
  where group_session_id = v_session.id and athlete_membership_id = p_athlete_membership_id
    and assignment_status = 'active';
  if not found then raise exception 'Active participant was not found'; end if;
  update public.group_sessions_v2 set version = version + 1, updated_at = now()
    where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_session.id, 'participant_removed',
    jsonb_build_object('athleteMembershipId', p_athlete_membership_id));
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

create or replace function public.duplicate_group_session_v2(
  p_group_session_id uuid, p_expected_version integer, p_scheduled_for date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_source public.group_sessions_v2%rowtype;
  v_actor_membership_id uuid;
  v_target public.group_sessions_v2%rowtype;
  v_participant_ids uuid[];
begin
  if p_scheduled_for is null then raise exception 'A duplicate requires a scheduled date'; end if;
  v_source := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  v_actor_membership_id := groups_v2.current_management_membership(v_source.organization_id);
  select coalesce(array_agg(athlete_membership_id order by athlete_membership_id), '{}') into v_participant_ids
  from public.group_session_participants_v2
  where group_session_id = v_source.id and assignment_status = 'active';
  perform groups_v2.assert_manage_participants(v_source.organization_id, v_actor_membership_id, v_participant_ids);
  insert into public.group_sessions_v2 (
    organization_id, created_by_membership_id, source_group_session_id, scheduled_for, title,
    workout_type, subcategory, description, duration, expected_rpe, expected_rpe_global,
    expected_specific_duration, expected_rpe_specific, blocks
  ) values (
    v_source.organization_id, v_actor_membership_id, v_source.id, p_scheduled_for, v_source.title,
    v_source.workout_type, v_source.subcategory, v_source.description, v_source.duration,
    v_source.expected_rpe, v_source.expected_rpe_global, v_source.expected_specific_duration,
    v_source.expected_rpe_specific, v_source.blocks
  ) returning * into v_target;
  insert into public.group_session_participants_v2 (group_session_id, organization_id, athlete_membership_id)
  select v_target.id, v_target.organization_id, participant_id from unnest(v_participant_ids) participant_id;
  update public.group_sessions_v2 set version = version + 1, updated_at = now()
    where id = v_source.id returning * into v_source;
  perform groups_v2.record_group_session_event(v_target.id, 'created',
    jsonb_build_object('participantCount', cardinality(v_participant_ids)));
  perform groups_v2.record_group_session_event(v_source.id, 'duplicated',
    jsonb_build_object('duplicateSessionId', v_target.id, 'version', v_source.version));
  return jsonb_build_object('sessionId', v_target.id, 'status', v_target.status, 'version', v_target.version);
end;
$$;

create or replace function public.cancel_group_session_v2(
  p_group_session_id uuid, p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_session public.group_sessions_v2%rowtype; v_updated public.group_sessions_v2%rowtype;
begin
  v_session := groups_v2.assert_session_mutable(p_group_session_id, p_expected_version);
  update public.group_sessions_v2 set status = 'cancelled', cancelled_at = now(), version = version + 1,
    updated_at = now() where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_session.id, 'cancelled');
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

create or replace function public.delete_group_session_v2(
  p_group_session_id uuid, p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare v_session public.group_sessions_v2%rowtype; v_updated public.group_sessions_v2%rowtype;
begin
  if p_expected_version is null or p_expected_version < 1 then raise exception 'Expected version must be a positive integer'; end if;
  select * into v_session from public.group_sessions_v2 where id = p_group_session_id for update;
  if not found then raise exception 'Group session was not found'; end if;
  if v_session.version <> p_expected_version then raise exception 'Group session version conflict'; end if;
  if v_session.status = 'deleted' then raise exception 'Group session is already deleted'; end if;
  if not groups_v2.current_user_can_manage_group_session(v_session.id) then raise exception 'Actor cannot manage this group session'; end if;
  update public.group_sessions_v2 set status = 'deleted', deleted_at = now(), version = version + 1,
    updated_at = now() where id = v_session.id returning * into v_updated;
  perform groups_v2.record_group_session_event(v_session.id, 'deleted');
  return jsonb_build_object('sessionId', v_updated.id, 'status', v_updated.status, 'version', v_updated.version);
end;
$$;

revoke all on table public.group_sessions_v2, public.group_session_participants_v2,
  public.group_session_events_v2 from public, anon, authenticated;
grant select on table public.group_sessions_v2, public.group_session_participants_v2,
  public.group_session_events_v2 to authenticated;
revoke all on function public.create_group_session_v2(uuid, date, jsonb, uuid[]) from public, anon;
revoke all on function public.update_group_session_v2(uuid, integer, jsonb) from public, anon;
revoke all on function public.add_group_session_participant_v2(uuid, integer, uuid) from public, anon;
revoke all on function public.remove_group_session_participant_v2(uuid, integer, uuid) from public, anon;
revoke all on function public.duplicate_group_session_v2(uuid, integer, date) from public, anon;
revoke all on function public.cancel_group_session_v2(uuid, integer) from public, anon;
revoke all on function public.delete_group_session_v2(uuid, integer) from public, anon;
grant execute on function public.create_group_session_v2(uuid, date, jsonb, uuid[]) to authenticated;
grant execute on function public.update_group_session_v2(uuid, integer, jsonb) to authenticated;
grant execute on function public.add_group_session_participant_v2(uuid, integer, uuid) to authenticated;
grant execute on function public.remove_group_session_participant_v2(uuid, integer, uuid) to authenticated;
grant execute on function public.duplicate_group_session_v2(uuid, integer, date) to authenticated;
grant execute on function public.cancel_group_session_v2(uuid, integer) to authenticated;
grant execute on function public.delete_group_session_v2(uuid, integer) to authenticated;

alter table public.group_sessions_v2 enable row level security;
alter table public.group_session_participants_v2 enable row level security;
alter table public.group_session_events_v2 enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'group_sessions_v2' and policyname = 'read authorized group sessions v2') then
    create policy "read authorized group sessions v2" on public.group_sessions_v2 for select to authenticated
      using (groups_v2.current_user_can_read_group_session(id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'group_session_participants_v2' and policyname = 'read authorized group session participants v2') then
    create policy "read authorized group session participants v2" on public.group_session_participants_v2 for select to authenticated
      using (groups_v2.current_user_can_read_group_session(group_session_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'group_session_events_v2' and policyname = 'read authorized group session events v2') then
    create policy "read authorized group session events v2" on public.group_session_events_v2 for select to authenticated
      using (groups_v2.current_user_can_read_group_session(group_session_id));
  end if;
end;
$$;

comment on schema groups_v2 is
  'L09 internal guards for the additive, feature-flagged group sessions V2 foundation.';
comment on table public.group_sessions_v2 is
  'Canonical group session. One row stores shared workout content; legacy calendar_workouts is untouched.';
comment on table public.group_session_participants_v2 is
  'Independent participant assignment history for group sessions V2; it never creates per-athlete workout copies.';
comment on table public.group_session_events_v2 is
  'Append-only audit history written only by group session V2 transactional RPCs.';
