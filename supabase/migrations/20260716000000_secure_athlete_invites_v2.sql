-- L11: additive, pilot-only athlete invitation capability.
-- This migration never changes the legacy invitation RPC or its token column.

create table if not exists access_control.athlete_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id) on delete restrict,
  coach_membership_id uuid not null,
  legacy_athlete_id uuid not null references public.athletes (id) on delete restrict,
  token_hash bytea not null unique,
  status text not null default 'active'
    check (status in ('active', 'consumed', 'revoked', 'expired')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, coach_membership_id)
    references access_control.organization_memberships (organization_id, id) on delete restrict,
  check (expires_at > created_at),
  check (
    (status = 'consumed') = (consumed_at is not null and consumed_by_user_id is not null)
  ),
  check ((status = 'revoked') = (revoked_at is not null)),
  check (not (consumed_at is not null and revoked_at is not null))
);

create unique index if not exists athlete_invites_one_active_target_idx
  on access_control.athlete_invites (organization_id, legacy_athlete_id)
  where status = 'active';
create index if not exists athlete_invites_creator_status_idx
  on access_control.athlete_invites (coach_membership_id, status, expires_at);

alter table access_control.athlete_invites enable row level security;
revoke all on table access_control.athlete_invites from public, anon, authenticated;

-- L11 is the explicit origin of an Access Control link created by an accepted V2 invite.
alter table access_control.legacy_athlete_links
  drop constraint if exists legacy_athlete_links_verification_method_check;
alter table access_control.legacy_athlete_links
  add constraint legacy_athlete_links_verification_method_check
  check (verification_method in ('manual', 'controlled_backfill', 'invitation_v2'));

create or replace function public.create_athlete_invite_v2(
  p_legacy_athlete_id uuid,
  p_coach_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, access_control
as $$
declare
  v_user_id uuid := auth.uid();
  v_organization_id uuid;
  v_token text;
  v_invite_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if v_user_id is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'invite_permission_denied';
  end if;

  select membership.organization_id into v_organization_id
  from access_control.organization_memberships membership
  where membership.id = p_coach_membership_id
    and membership.user_id = v_user_id
    and membership.role = 'coach'
    and membership.status = 'active';
  if v_organization_id is null then
    raise exception 'invite_permission_denied';
  end if;

  perform 1 from public.athletes athlete
  where athlete.id = p_legacy_athlete_id
    and athlete.active is true
    and athlete.user_id is null
  for update;
  if not found then
    raise exception 'invite_target_unavailable';
  end if;

  if exists (
    select 1 from access_control.legacy_athlete_links link
    where link.legacy_athlete_id = p_legacy_athlete_id
      and link.status = 'active'
  ) then
    raise exception 'invite_target_unavailable';
  end if;

  update access_control.athlete_invites
  set status = 'expired', updated_at = now()
  where organization_id = v_organization_id
    and legacy_athlete_id = p_legacy_athlete_id
    and status = 'active'
    and expires_at <= now();

  if exists (
    select 1 from access_control.athlete_invites invite
    where invite.organization_id = v_organization_id
      and invite.legacy_athlete_id = p_legacy_athlete_id
      and invite.status = 'active'
  ) then
    raise exception 'invite_already_active';
  end if;

  v_token := 'v2i_' || encode(gen_random_bytes(32), 'hex');
  insert into access_control.athlete_invites (
    organization_id, coach_membership_id, legacy_athlete_id, token_hash, expires_at
  ) values (
    v_organization_id, p_coach_membership_id, p_legacy_athlete_id,
    digest(v_token, 'sha256'), v_expires_at
  ) returning id into v_invite_id;

  return jsonb_build_object(
    'inviteId', v_invite_id,
    'token', v_token,
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function public.list_athlete_invites_v2(
  p_legacy_athlete_id uuid,
  p_coach_membership_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions, access_control
as $$
declare
  v_organization_id uuid;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'invite_permission_denied';
  end if;

  select membership.organization_id into v_organization_id
  from access_control.organization_memberships membership
  where membership.id = p_coach_membership_id
    and membership.user_id = auth.uid()
    and membership.role = 'coach'
    and membership.status = 'active';
  if v_organization_id is null then
    raise exception 'invite_permission_denied';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', invite.id,
      'status', case when invite.status = 'active' and invite.expires_at <= now() then 'expired' else invite.status end,
      'expiresAt', invite.expires_at,
      'createdAt', invite.created_at,
      'consumedAt', invite.consumed_at,
      'revokedAt', invite.revoked_at
    ) order by invite.created_at desc)
    from access_control.athlete_invites invite
    where invite.organization_id = v_organization_id
      and invite.coach_membership_id = p_coach_membership_id
      and invite.legacy_athlete_id = p_legacy_athlete_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.revoke_athlete_invite_v2(
  p_invite_id uuid,
  p_coach_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, access_control
as $$
declare
  v_invite access_control.athlete_invites%rowtype;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'invite_permission_denied';
  end if;

  select invite.* into v_invite
  from access_control.athlete_invites invite
  join access_control.organization_memberships membership
    on membership.id = invite.coach_membership_id
   and membership.organization_id = invite.organization_id
  where invite.id = p_invite_id
    and invite.coach_membership_id = p_coach_membership_id
    and membership.user_id = auth.uid()
    and membership.role = 'coach'
    and membership.status = 'active'
  for update;
  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_invite.status = 'consumed' then
    raise exception 'invite_already_consumed';
  end if;
  if v_invite.status = 'revoked' then
    return jsonb_build_object('inviteId', v_invite.id, 'status', 'revoked');
  end if;
  if v_invite.status = 'active' and v_invite.expires_at <= now() then
    update access_control.athlete_invites
    set status = 'expired', updated_at = now()
    where id = v_invite.id;
    return jsonb_build_object('inviteId', v_invite.id, 'status', 'expired');
  end if;

  update access_control.athlete_invites
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where id = v_invite.id;
  return jsonb_build_object('inviteId', v_invite.id, 'status', 'revoked');
end;
$$;

create or replace function public.consume_athlete_invite_v2(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, access_control
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite access_control.athlete_invites%rowtype;
  v_athlete_membership_id uuid;
  v_existing_account_status text;
  v_existing_membership_count integer;
begin
  if v_user_id is null or p_token is null or length(p_token) <> 68
    or p_token !~ '^v2i_[0-9a-f]{64}$' then
    raise exception 'invite_invalid_or_unavailable';
  end if;

  select invite.* into v_invite
  from access_control.athlete_invites invite
  where invite.token_hash = digest(p_token, 'sha256')
  for update;
  if not found then
    raise exception 'invite_invalid_or_unavailable';
  end if;
  if v_invite.status = 'active' and v_invite.expires_at <= now() then
    update access_control.athlete_invites
    set status = 'expired', updated_at = now()
    where id = v_invite.id;
    return jsonb_build_object('kind', 'error', 'code', 'invite_invalid_or_unavailable');
  end if;
  if v_invite.status <> 'active' then
    raise exception 'invite_invalid_or_unavailable';
  end if;

  if not exists (
    select 1
    from access_control.organization_memberships membership
    join access_control.accounts account on account.user_id = membership.user_id
    where membership.id = v_invite.coach_membership_id
      and membership.organization_id = v_invite.organization_id
      and membership.role = 'coach'
      and membership.status = 'active'
      and account.account_status = 'active'
  ) then
    raise exception 'invite_invalid_or_unavailable';
  end if;

  select account_status into v_existing_account_status
  from access_control.accounts where user_id = v_user_id for update;
  if v_existing_account_status is not null and v_existing_account_status <> 'active' then
    raise exception 'invite_account_unavailable';
  end if;
  if v_existing_account_status is null then
    insert into access_control.accounts (user_id, account_status, migration_state)
    values (v_user_id, 'active', 'verified');
  end if;

  select count(*) into v_existing_membership_count
  from access_control.organization_memberships membership
  where membership.user_id = v_user_id and membership.status = 'active';
  if v_existing_membership_count > 0
    or exists (select 1 from public.athletes athlete where athlete.user_id = v_user_id and athlete.id <> v_invite.legacy_athlete_id)
    or exists (select 1 from access_control.legacy_athlete_links link where link.legacy_athlete_id = v_invite.legacy_athlete_id and link.status = 'active') then
    raise exception 'invite_account_unavailable';
  end if;

  perform 1 from public.athletes athlete
  where athlete.id = v_invite.legacy_athlete_id
    and athlete.active is true
    and athlete.user_id is null
  for update;
  if not found then
    raise exception 'invite_invalid_or_unavailable';
  end if;

  insert into access_control.organization_memberships (
    organization_id, user_id, role, status
  ) values (
    v_invite.organization_id, v_user_id, 'athlete', 'active'
  ) returning id into v_athlete_membership_id;

  insert into access_control.coach_athlete_access (
    organization_id, coach_membership_id, athlete_membership_id, access_role, status
  ) values (
    v_invite.organization_id, v_invite.coach_membership_id, v_athlete_membership_id, 'coach', 'active'
  );

  insert into access_control.legacy_athlete_links (
    legacy_athlete_id, organization_id, athlete_membership_id, status,
    verification_method, verified_by_user_id
  ) values (
    v_invite.legacy_athlete_id, v_invite.organization_id, v_athlete_membership_id, 'active',
    'invitation_v2', v_user_id
  );

  update public.athletes
  set user_id = v_user_id
  where id = v_invite.legacy_athlete_id and user_id is null;
  if not found then
    raise exception 'invite_invalid_or_unavailable';
  end if;

  update access_control.athlete_invites
  set status = 'consumed', consumed_at = now(), consumed_by_user_id = v_user_id, updated_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'legacyAthleteId', v_invite.legacy_athlete_id,
    'athleteMembershipId', v_athlete_membership_id,
    'organizationId', v_invite.organization_id
  );
end;
$$;

revoke all on function public.create_athlete_invite_v2(uuid, uuid) from public, anon;
revoke all on function public.list_athlete_invites_v2(uuid, uuid) from public, anon;
revoke all on function public.revoke_athlete_invite_v2(uuid, uuid) from public, anon;
revoke all on function public.consume_athlete_invite_v2(text) from public, anon;
grant execute on function public.create_athlete_invite_v2(uuid, uuid) to authenticated;
grant execute on function public.list_athlete_invites_v2(uuid, uuid) to authenticated;
grant execute on function public.revoke_athlete_invite_v2(uuid, uuid) to authenticated;
grant execute on function public.consume_athlete_invite_v2(text) to authenticated;

comment on table access_control.athlete_invites is
  'L11 pilot-only invitation metadata. It stores only a SHA-256 token hash; the raw invitation capability is returned once by its creation RPC.';
comment on function public.consume_athlete_invite_v2(text) is
  'L11 atomic single-use invitation consumption. It creates the V2 athlete identity and explicit mapping, then links the legacy athlete user_id solely for legacy read compatibility.';
