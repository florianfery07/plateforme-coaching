-- L12: additive, pilot-only athlete lifecycle. The legacy athlete row remains
-- the source of truth for active status; this migration never deletes it.

create table if not exists access_control.athlete_lifecycle_events_v2 (
  id uuid primary key default gen_random_uuid(),
  legacy_athlete_id uuid not null,
  organization_id uuid not null,
  athlete_membership_id uuid not null,
  actor_user_id uuid not null,
  event_type text not null check (event_type in ('archived', 'restored')),
  created_at timestamptz not null default now()
);

create index if not exists athlete_lifecycle_events_v2_athlete_created_idx
  on access_control.athlete_lifecycle_events_v2 (legacy_athlete_id, created_at desc);

alter table access_control.athlete_lifecycle_events_v2 enable row level security;
revoke all on table access_control.athlete_lifecycle_events_v2 from public, anon, authenticated;

create or replace function public.archive_legacy_athlete_v2(
  p_legacy_athlete_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_link_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
  v_active boolean;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_lifecycle_permission_denied';
  end if;

  select count(*) into v_link_count
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = p_legacy_athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if v_link_count <> 1 then
    raise exception 'athlete_lifecycle_target_unavailable';
  end if;

  select link.organization_id, link.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = p_legacy_athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'athlete_lifecycle_permission_denied';
  end if;

  select athlete.active into v_active
  from public.athletes athlete
  where athlete.id = p_legacy_athlete_id
  for update;
  if not found then
    raise exception 'athlete_lifecycle_target_unavailable';
  end if;

  if v_active is false then
    return jsonb_build_object(
      'athleteId', p_legacy_athlete_id,
      'status', 'archived',
      'changed', false
    );
  end if;

  update public.athletes
  set active = false
  where id = p_legacy_athlete_id;

  insert into access_control.athlete_lifecycle_events_v2 (
    legacy_athlete_id,
    organization_id,
    athlete_membership_id,
    actor_user_id,
    event_type
  ) values (
    p_legacy_athlete_id,
    v_organization_id,
    v_athlete_membership_id,
    auth.uid(),
    'archived'
  );

  return jsonb_build_object(
    'athleteId', p_legacy_athlete_id,
    'status', 'archived',
    'changed', true
  );
end;
$$;

create or replace function public.restore_legacy_athlete_v2(
  p_legacy_athlete_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_link_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
  v_active boolean;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_lifecycle_permission_denied';
  end if;

  select count(*) into v_link_count
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = p_legacy_athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if v_link_count <> 1 then
    raise exception 'athlete_lifecycle_target_unavailable';
  end if;

  select link.organization_id, link.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = p_legacy_athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'athlete_lifecycle_permission_denied';
  end if;

  select athlete.active into v_active
  from public.athletes athlete
  where athlete.id = p_legacy_athlete_id
  for update;
  if not found then
    raise exception 'athlete_lifecycle_target_unavailable';
  end if;

  if v_active is true then
    return jsonb_build_object(
      'athleteId', p_legacy_athlete_id,
      'status', 'active',
      'changed', false
    );
  end if;

  update public.athletes
  set active = true
  where id = p_legacy_athlete_id;

  insert into access_control.athlete_lifecycle_events_v2 (
    legacy_athlete_id,
    organization_id,
    athlete_membership_id,
    actor_user_id,
    event_type
  ) values (
    p_legacy_athlete_id,
    v_organization_id,
    v_athlete_membership_id,
    auth.uid(),
    'restored'
  );

  return jsonb_build_object(
    'athleteId', p_legacy_athlete_id,
    'status', 'active',
    'changed', true
  );
end;
$$;

revoke all on function public.archive_legacy_athlete_v2(uuid) from public, anon;
revoke all on function public.restore_legacy_athlete_v2(uuid) from public, anon;
grant execute on function public.archive_legacy_athlete_v2(uuid) to authenticated;
grant execute on function public.restore_legacy_athlete_v2(uuid) to authenticated;

comment on table access_control.athlete_lifecycle_events_v2 is
  'L12 append-only lifecycle audit for the pilot archive/restore RPCs. It intentionally keeps identifier snapshots so a later approved privacy purge does not erase its audit record.';
comment on function public.archive_legacy_athlete_v2(uuid) is
  'L12 atomic athlete archive. It changes only public.athletes.active and appends one audit event; no dependent legacy row is deleted.';
comment on function public.restore_legacy_athlete_v2(uuid) is
  'L12 atomic athlete restoration. It reactivates only public.athletes.active and appends one audit event.';
