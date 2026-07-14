-- L05: additive access-control V2 foundation.
-- This migration does not alter legacy tables, policies, functions, or data.
-- It must be applied only through an approved Supabase migration procedure.

create schema if not exists access_control;

revoke all on schema access_control from public;
revoke all on schema access_control from anon;
grant usage on schema access_control to authenticated;

create table if not exists access_control.accounts (
  user_id uuid primary key references auth.users (id) on delete restrict,
  account_status text not null default 'unverified'
    check (account_status in ('unverified', 'active', 'suspended', 'disabled')),
  platform_role text
    check (platform_role is null or platform_role in (
      'platform_owner',
      'platform_administrator',
      'platform_support'
    )),
  migration_state text not null default 'unmigrated'
    check (migration_state in (
      'unmigrated',
      'observed_athlete',
      'ambiguous',
      'verified'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists access_control.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists access_control.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id)
    on delete restrict,
  user_id uuid not null references access_control.accounts (user_id)
    on delete restrict,
  role text not null check (role in (
    'organization_owner',
    'organization_administrator',
    'coach',
    'assistant_coach',
    'practitioner',
    'athlete'
  )),
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'archived', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (organization_id, user_id, role),
  unique (organization_id, id),
  check ((status = 'ended') = (ended_at is not null))
);

create table if not exists access_control.coach_athlete_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id)
    on delete restrict,
  coach_membership_id uuid not null,
  athlete_membership_id uuid not null,
  access_role text not null check (access_role in (
    'coach',
    'assistant_coach',
    'practitioner'
  )),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'ended', 'archived')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, coach_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  check (coach_membership_id <> athlete_membership_id),
  check (ends_at is null or ends_at > starts_at)
);

create unique index if not exists coach_athlete_access_open_unique
  on access_control.coach_athlete_access (
    coach_membership_id,
    athlete_membership_id,
    access_role
  )
  where status in ('pending', 'active', 'paused');

create table if not exists access_control.access_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references access_control.organizations (id)
    on delete restrict,
  delegator_membership_id uuid not null,
  delegatee_membership_id uuid not null,
  athlete_membership_id uuid not null,
  capabilities text[] not null
    check (cardinality(capabilities) > 0),
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (organization_id, delegator_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  foreign key (organization_id, delegatee_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id)
    on delete restrict,
  check (delegator_membership_id <> delegatee_membership_id),
  check (expires_at > starts_at),
  check ((status = 'revoked') = (revoked_at is not null))
);

create table if not exists access_control.pilots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references access_control.organizations (id)
    on delete restrict,
  user_id uuid references access_control.accounts (user_id)
    on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'disabled', 'expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(organization_id, user_id) = 1),
  check (ends_at is null or ends_at > starts_at)
);

create unique index if not exists access_control_active_user_pilot_unique
  on access_control.pilots (user_id)
  where status = 'active' and user_id is not null;

create unique index if not exists access_control_active_organization_pilot_unique
  on access_control.pilots (organization_id)
  where status = 'active' and organization_id is not null;

create index if not exists access_control_memberships_user_status_idx
  on access_control.organization_memberships (user_id, status, organization_id);

create index if not exists access_control_memberships_organization_status_idx
  on access_control.organization_memberships (organization_id, status, role);

create index if not exists access_control_coach_athlete_actor_idx
  on access_control.coach_athlete_access (
    coach_membership_id,
    status,
    athlete_membership_id
  );

create index if not exists access_control_coach_athlete_subject_idx
  on access_control.coach_athlete_access (
    athlete_membership_id,
    status,
    coach_membership_id
  );

create index if not exists access_control_delegations_delegatee_idx
  on access_control.access_delegations (
    delegatee_membership_id,
    athlete_membership_id,
    status,
    expires_at
  );

create or replace function access_control.enforce_coach_athlete_access_integrity()
returns trigger
language plpgsql
set search_path = pg_catalog, access_control
as $$
declare
  v_coach_role text;
  v_coach_status text;
  v_athlete_role text;
  v_athlete_status text;
begin
  select role, status
  into v_coach_role, v_coach_status
  from access_control.organization_memberships
  where id = new.coach_membership_id;

  select role, status
  into v_athlete_role, v_athlete_status
  from access_control.organization_memberships
  where id = new.athlete_membership_id;

  if v_coach_role is distinct from new.access_role then
    raise exception 'Coach membership role must match access role';
  end if;

  if v_athlete_role is distinct from 'athlete' then
    raise exception 'Athlete access target must have athlete membership role';
  end if;

  if new.status = 'active'
    and (v_coach_status is distinct from 'active' or v_athlete_status is distinct from 'active') then
    raise exception 'Active athlete access requires active memberships';
  end if;

  return new;
end;
$$;

create or replace function access_control.enforce_delegation_integrity()
returns trigger
language plpgsql
set search_path = pg_catalog, access_control
as $$
declare
  v_delegator_role text;
  v_delegator_status text;
  v_delegatee_role text;
  v_delegatee_status text;
  v_athlete_role text;
  v_athlete_status text;
begin
  select role, status
  into v_delegator_role, v_delegator_status
  from access_control.organization_memberships
  where id = new.delegator_membership_id;

  select role, status
  into v_delegatee_role, v_delegatee_status
  from access_control.organization_memberships
  where id = new.delegatee_membership_id;

  select role, status
  into v_athlete_role, v_athlete_status
  from access_control.organization_memberships
  where id = new.athlete_membership_id;

  if v_delegator_role is distinct from 'coach'
    or v_delegator_status is distinct from 'active' then
    raise exception 'Delegation requires an active coach delegator';
  end if;

  if v_delegatee_role not in ('coach', 'assistant_coach', 'practitioner')
    or v_delegatee_status is distinct from 'active' then
    raise exception 'Delegation requires an active coaching delegatee';
  end if;

  if v_athlete_role is distinct from 'athlete'
    or v_athlete_status is distinct from 'active' then
    raise exception 'Delegation requires an active athlete target';
  end if;

  if not exists (
    select 1
    from access_control.coach_athlete_access relation
    where relation.organization_id = new.organization_id
      and relation.coach_membership_id = new.delegator_membership_id
      and relation.athlete_membership_id = new.athlete_membership_id
      and relation.access_role = 'coach'
      and relation.status = 'active'
  ) then
    raise exception 'Delegator requires active coach access to athlete';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'enforce_coach_athlete_access_integrity'
      and tgrelid = 'access_control.coach_athlete_access'::regclass
      and not tgisinternal
  ) then
    create trigger enforce_coach_athlete_access_integrity
      before insert or update on access_control.coach_athlete_access
      for each row execute function access_control.enforce_coach_athlete_access_integrity();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'enforce_delegation_integrity'
      and tgrelid = 'access_control.access_delegations'::regclass
      and not tgisinternal
  ) then
    create trigger enforce_delegation_integrity
      before insert or update on access_control.access_delegations
      for each row execute function access_control.enforce_delegation_integrity();
  end if;
end;
$$;

comment on schema access_control is
  'L05 additive authorization V2 data. It is isolated from legacy application tables.';
comment on table access_control.accounts is
  'Server-side account state and migration observation. A row is not an authorization grant.';
comment on table access_control.organizations is
  'Tenant boundary for future MyRidePlan authorization V2 resources.';
comment on table access_control.organization_memberships is
  'Organization-scoped role assignment. Legacy code does not read this table in L05.';
comment on table access_control.coach_athlete_access is
  'Explicit coach, assistant, or practitioner access relation to an athlete membership.';
comment on table access_control.access_delegations is
  'Time-bounded capability delegation. It cannot replace server authorization.';
comment on table access_control.pilots is
  'Explicit V2 pilot allowlist. It does not activate the public feature flag.';
comment on function access_control.enforce_coach_athlete_access_integrity() is
  'Prevents a relationship from assigning coaching access to an incompatible membership role.';
comment on function access_control.enforce_delegation_integrity() is
  'Requires an active authorized coach to delegate only to an active coaching member.';

create or replace function access_control.current_account_is_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select coalesce((
    select account_status = 'active'
    from access_control.accounts
    where user_id = auth.uid()
  ), false);
$$;

create or replace function access_control.current_user_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select exists (
    select 1
    from access_control.accounts
    where user_id = auth.uid()
      and account_status = 'active'
      and platform_role in ('platform_owner', 'platform_administrator')
  );
$$;

create or replace function access_control.current_user_is_active_member(
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select access_control.current_account_is_active()
    and exists (
      select 1
      from access_control.organization_memberships
      where organization_id = p_organization_id
        and user_id = auth.uid()
        and status = 'active'
    );
$$;

create or replace function access_control.current_user_can_access_athlete(
  p_athlete_membership_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select access_control.current_account_is_active()
    and exists (
      select 1
      from access_control.organization_memberships athlete_membership
      where athlete_membership.id = p_athlete_membership_id
        and athlete_membership.role = 'athlete'
        and athlete_membership.status = 'active'
        and (
          athlete_membership.user_id = auth.uid()
          or exists (
            select 1
            from access_control.coach_athlete_access relation
            join access_control.organization_memberships actor_membership
              on actor_membership.id = relation.coach_membership_id
            where relation.athlete_membership_id = athlete_membership.id
              and relation.status = 'active'
              and actor_membership.user_id = auth.uid()
              and actor_membership.status = 'active'
          )
          or exists (
            select 1
            from access_control.access_delegations delegation
            join access_control.organization_memberships delegatee_membership
              on delegatee_membership.id = delegation.delegatee_membership_id
            where delegation.athlete_membership_id = athlete_membership.id
              and delegation.status = 'active'
              and delegation.starts_at <= now()
              and delegation.expires_at > now()
              and delegation.capabilities && array['athlete.read', 'athlete.manage']
              and delegatee_membership.user_id = auth.uid()
              and delegatee_membership.status = 'active'
          )
        )
    );
$$;

create or replace function access_control.current_user_can_manage_athlete(
  p_athlete_membership_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select access_control.current_account_is_active()
    and exists (
      select 1
      from access_control.organization_memberships athlete_membership
      where athlete_membership.id = p_athlete_membership_id
        and athlete_membership.role = 'athlete'
        and athlete_membership.status = 'active'
        and (
          exists (
            select 1
            from access_control.coach_athlete_access relation
            join access_control.organization_memberships actor_membership
              on actor_membership.id = relation.coach_membership_id
            where relation.athlete_membership_id = athlete_membership.id
              and relation.status = 'active'
              and relation.access_role = 'coach'
              and actor_membership.user_id = auth.uid()
              and actor_membership.status = 'active'
          )
          or exists (
            select 1
            from access_control.access_delegations delegation
            join access_control.organization_memberships delegatee_membership
              on delegatee_membership.id = delegation.delegatee_membership_id
            where delegation.athlete_membership_id = athlete_membership.id
              and delegation.status = 'active'
              and delegation.starts_at <= now()
              and delegation.expires_at > now()
              and delegation.capabilities @> array['athlete.manage']
              and delegatee_membership.user_id = auth.uid()
              and delegatee_membership.status = 'active'
          )
        )
    );
$$;

create or replace function access_control.current_user_is_pilot()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
  select access_control.current_account_is_active()
    and exists (
      select 1
      from access_control.pilots pilot
      where pilot.status = 'active'
        and pilot.starts_at <= now()
        and (pilot.ends_at is null or pilot.ends_at > now())
        and (
          pilot.user_id = auth.uid()
          or exists (
            select 1
            from access_control.organization_memberships membership
            where membership.organization_id = pilot.organization_id
              and membership.user_id = auth.uid()
              and membership.status = 'active'
          )
        )
    );
$$;

create or replace function public.get_access_context_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  return jsonb_build_object(
    'userId', v_user_id,
    'accountStatus', coalesce((
      select account_status
      from access_control.accounts
      where user_id = v_user_id
    ), 'unverified'),
    'isPilot', access_control.current_user_is_pilot(),
    'isPlatformAdministrator', access_control.current_user_is_platform_admin(),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', membership.id,
        'organizationId', membership.organization_id,
        'role', membership.role,
        'status', membership.status
      ) order by membership.created_at)
      from access_control.organization_memberships membership
      where membership.user_id = v_user_id
    ), '[]'::jsonb),
    'athletePermissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'athleteMembershipId', target.athlete_membership_id,
        'canAccess', access_control.current_user_can_access_athlete(
          target.athlete_membership_id
        ),
        'canManage', access_control.current_user_can_manage_athlete(
          target.athlete_membership_id
        )
      ) order by target.athlete_membership_id)
      from (
        select membership.id as athlete_membership_id
        from access_control.organization_memberships membership
        where membership.user_id = v_user_id
          and membership.role = 'athlete'
        union
        select relation.athlete_membership_id
        from access_control.coach_athlete_access relation
        join access_control.organization_memberships actor_membership
          on actor_membership.id = relation.coach_membership_id
        where actor_membership.user_id = v_user_id
          and relation.status = 'active'
        union
        select delegation.athlete_membership_id
        from access_control.access_delegations delegation
        join access_control.organization_memberships delegatee_membership
          on delegatee_membership.id = delegation.delegatee_membership_id
        where delegatee_membership.user_id = v_user_id
          and delegation.status = 'active'
      ) target
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function access_control.current_account_is_active() from public, anon;
revoke all on function access_control.current_user_is_platform_admin() from public, anon;
revoke all on function access_control.current_user_is_active_member(uuid) from public, anon;
revoke all on function access_control.current_user_can_access_athlete(uuid) from public, anon;
revoke all on function access_control.current_user_can_manage_athlete(uuid) from public, anon;
revoke all on function access_control.current_user_is_pilot() from public, anon;
revoke all on function public.get_access_context_v2() from public, anon;

grant execute on function access_control.current_account_is_active() to authenticated;
grant execute on function access_control.current_user_is_platform_admin() to authenticated;
grant execute on function access_control.current_user_is_active_member(uuid) to authenticated;
grant execute on function access_control.current_user_can_access_athlete(uuid) to authenticated;
grant execute on function access_control.current_user_can_manage_athlete(uuid) to authenticated;
grant execute on function access_control.current_user_is_pilot() to authenticated;
grant execute on function public.get_access_context_v2() to authenticated;

alter table access_control.accounts enable row level security;
alter table access_control.organizations enable row level security;
alter table access_control.organization_memberships enable row level security;
alter table access_control.coach_athlete_access enable row level security;
alter table access_control.access_delegations enable row level security;
alter table access_control.pilots enable row level security;

grant select on access_control.accounts,
  access_control.organizations,
  access_control.organization_memberships,
  access_control.coach_athlete_access,
  access_control.access_delegations to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'access_control'
      and tablename = 'accounts'
      and policyname = 'read own access-control account'
  ) then
    create policy "read own access-control account"
      on access_control.accounts for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'access_control'
      and tablename = 'organizations'
      and policyname = 'read organizations with active membership'
  ) then
    create policy "read organizations with active membership"
      on access_control.organizations for select to authenticated
      using (access_control.current_user_is_active_member(id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'access_control'
      and tablename = 'organization_memberships'
      and policyname = 'read own organization memberships'
  ) then
    create policy "read own organization memberships"
      on access_control.organization_memberships for select to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'access_control'
      and tablename = 'coach_athlete_access'
      and policyname = 'read own athlete access relations'
  ) then
    create policy "read own athlete access relations"
      on access_control.coach_athlete_access for select to authenticated
      using (access_control.current_user_can_access_athlete(athlete_membership_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'access_control'
      and tablename = 'access_delegations'
      and policyname = 'read delegation as participant'
  ) then
    create policy "read delegation as participant"
      on access_control.access_delegations for select to authenticated
      using (
        exists (
          select 1
          from access_control.organization_memberships membership
          where membership.user_id = auth.uid()
            and membership.status = 'active'
            and membership.id in (delegator_membership_id, delegatee_membership_id)
        )
      );
  end if;
end;
$$;

-- No V2 policy is added to a legacy public table in L05. Legacy access remains
-- unchanged until a dedicated, tested cutover lot receives explicit approval.
