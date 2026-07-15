-- L09bis: explicit, additive bridge from legacy groups to Access Control V2.
-- It never changes legacy rows or writes Groups V2 sessions.

create table if not exists access_control.legacy_group_links (
  legacy_group_id uuid primary key references public.athlete_groups (id) on delete restrict,
  organization_id uuid not null references access_control.organizations (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'disabled')),
  verification_method text not null check (verification_method in ('manual', 'controlled_backfill')),
  verified_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists access_control.legacy_athlete_links (
  legacy_athlete_id uuid not null references public.athletes (id) on delete restrict,
  organization_id uuid not null,
  athlete_membership_id uuid not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  verification_method text not null check (verification_method in ('manual', 'controlled_backfill')),
  verified_by_user_id uuid references access_control.accounts (user_id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (legacy_athlete_id, organization_id),
  unique (organization_id, athlete_membership_id),
  foreign key (organization_id, athlete_membership_id)
    references access_control.organization_memberships (organization_id, id) on delete restrict
);

create index if not exists legacy_group_links_organization_idx
  on access_control.legacy_group_links (organization_id) where status = 'active';
create index if not exists legacy_athlete_links_membership_idx
  on access_control.legacy_athlete_links (organization_id, athlete_membership_id)
  where status = 'active';

alter table access_control.legacy_group_links enable row level security;
alter table access_control.legacy_athlete_links enable row level security;
revoke all on table access_control.legacy_group_links, access_control.legacy_athlete_links
  from public, anon, authenticated;

create or replace function public.resolve_legacy_group_bridge_v2(p_legacy_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control, groups_v2
as $$
declare
  v_organization_id uuid;
  v_coach_membership_id uuid;
  v_participants uuid[];
  v_issue text;
begin
  if auth.uid() is null or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    return jsonb_build_object('kind', 'error', 'code', 'permission_denied');
  end if;
  if p_legacy_group_id is null or not exists (
    select 1 from public.athlete_groups where id = p_legacy_group_id
  ) then return jsonb_build_object('kind', 'error', 'code', 'invalid_group'); end if;

  select organization_id into v_organization_id
  from access_control.legacy_group_links
  where legacy_group_id = p_legacy_group_id and status = 'active';
  if v_organization_id is null then
    return jsonb_build_object('kind', 'error', 'code', 'organization_missing');
  end if;

  select membership.id into v_coach_membership_id
  from access_control.organization_memberships membership
  join access_control.accounts account on account.user_id = membership.user_id
  where membership.organization_id = v_organization_id and membership.user_id = auth.uid()
    and membership.status = 'active' and account.account_status = 'active'
    and membership.role in ('organization_owner', 'organization_administrator', 'coach', 'assistant_coach')
  order by membership.created_at limit 1;
  if v_coach_membership_id is null then
    return jsonb_build_object('kind', 'error', 'code', 'coach_membership_missing');
  end if;

  if not exists (select 1 from public.athlete_group_members where group_id = p_legacy_group_id) then
    return jsonb_build_object('kind', 'error', 'code', 'empty_group');
  end if;

  select case
    when exists (
      select 1 from public.athlete_group_members member
      join public.athletes athlete on athlete.id = member.athlete_id
      where member.group_id = p_legacy_group_id and athlete.active is false
    ) then 'athlete_archived'
    when exists (
      select 1 from public.athlete_group_members member
      left join access_control.legacy_athlete_links link
        on link.legacy_athlete_id = member.athlete_id and link.organization_id = v_organization_id and link.status = 'active'
      left join access_control.organization_memberships membership
        on membership.id = link.athlete_membership_id and membership.organization_id = v_organization_id
      where member.group_id = p_legacy_group_id
        and (link.athlete_membership_id is null or membership.role <> 'athlete' or membership.status <> 'active')
    ) then 'athlete_membership_missing'
    when exists (
      select 1 from public.athlete_group_members member
      join access_control.legacy_athlete_links link
        on link.legacy_athlete_id = member.athlete_id and link.organization_id = v_organization_id and link.status = 'active'
      where member.group_id = p_legacy_group_id
        and not access_control.current_user_can_manage_athlete(link.athlete_membership_id)
    ) then 'access_missing'
  end into v_issue;
  if v_issue is not null then return jsonb_build_object('kind', 'error', 'code', v_issue); end if;

  select array_agg(link.athlete_membership_id order by link.athlete_membership_id) into v_participants
  from public.athlete_group_members member
  join access_control.legacy_athlete_links link
    on link.legacy_athlete_id = member.athlete_id and link.organization_id = v_organization_id and link.status = 'active'
  where member.group_id = p_legacy_group_id;

  return jsonb_build_object('kind', 'success', 'legacyGroupId', p_legacy_group_id,
    'organizationId', v_organization_id, 'coachMembershipId', v_coach_membership_id,
    'athleteMembershipIds', to_jsonb(v_participants), 'confidence', 'explicit_verified',
    'readyForGroupsV2', true);
end;
$$;

revoke all on function public.resolve_legacy_group_bridge_v2(uuid) from public, anon;
grant execute on function public.resolve_legacy_group_bridge_v2(uuid) to authenticated;
comment on function public.resolve_legacy_group_bridge_v2(uuid) is
  'L09bis read-only bridge. It returns only explicit, active same-organization mappings and never writes legacy or Groups V2 data.';
