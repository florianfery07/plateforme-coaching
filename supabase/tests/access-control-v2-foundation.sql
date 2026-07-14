do $$
begin
  if (select count(*) from access_control.accounts where migration_state = 'observed_athlete') <> 2 then
    raise exception 'Backfill must create exactly two observed athlete accounts';
  end if;
  if exists (select 1 from access_control.organization_memberships) then
    raise exception 'Backfill must not invent memberships';
  end if;
  if exists (
    select 1
    from access_control.accounts
    where user_id = '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'Backfill must not infer a coach account';
  end if;
end;
$$;

update access_control.accounts
set account_status = 'active', migration_state = 'verified'
where user_id in (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

insert into access_control.accounts (user_id, account_status, migration_state, platform_role) values
  ('00000000-0000-0000-0000-000000000003', 'active', 'verified', null),
  ('00000000-0000-0000-0000-000000000004', 'active', 'verified', null),
  ('00000000-0000-0000-0000-000000000005', 'active', 'verified', null),
  ('00000000-0000-0000-0000-000000000006', 'active', 'verified', 'platform_administrator'),
  ('00000000-0000-0000-0000-000000000007', 'active', 'verified', null),
  ('00000000-0000-0000-0000-000000000008', 'active', 'verified', null),
  ('00000000-0000-0000-0000-000000000009', 'unverified', 'ambiguous', null),
  ('00000000-0000-0000-0000-000000000010', 'active', 'verified', null)
on conflict (user_id) do update
set account_status = excluded.account_status,
    migration_state = excluded.migration_state,
    platform_role = excluded.platform_role;

insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Synthetic pilot organization'),
  ('20000000-0000-0000-0000-000000000002', 'Synthetic isolated organization')
on conflict do nothing;

insert into access_control.organization_memberships (
  id, organization_id, user_id, role, status
) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'athlete', 'archived'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'coach', 'archived'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000007', 'assistant_coach', 'active'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000008', 'assistant_coach', 'active'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'athlete', 'active')
on conflict do nothing;

insert into access_control.coach_athlete_access (
  id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'coach', 'active'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 'coach', 'archived')
on conflict do nothing;

insert into access_control.access_delegations (
  id, organization_id, delegator_membership_id, delegatee_membership_id,
  athlete_membership_id, capabilities, status, starts_at, expires_at
) values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', array['athlete.read'], 'active', now() - interval '1 hour', now() + interval '1 hour'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000001', array['athlete.read'], 'active', now() - interval '2 hours', now() - interval '1 hour')
on conflict do nothing;

insert into access_control.pilots (id, user_id, status) values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'active')
on conflict do nothing;

do $$
declare
  v_rejected boolean := false;
begin
  begin
    insert into access_control.coach_athlete_access (
      id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
    ) values (
      '40000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000010',
      'coach',
      'active'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Athlete membership must not create coach access';
  end if;

  v_rejected := false;
  begin
    insert into access_control.coach_athlete_access (
      id, organization_id, coach_membership_id, athlete_membership_id, access_role, status
    ) values (
      '40000000-0000-0000-0000-000000000004',
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000001',
      'coach',
      'active'
    );
  exception when foreign_key_violation then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Cross-organization relationship must be rejected';
  end if;

  v_rejected := false;
  begin
    insert into access_control.access_delegations (
      id, organization_id, delegator_membership_id, delegatee_membership_id,
      athlete_membership_id, capabilities, status, starts_at, expires_at
    ) values (
      '50000000-0000-0000-0000-000000000003',
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000004',
      '30000000-0000-0000-0000-000000000007',
      '30000000-0000-0000-0000-000000000001',
      array['athlete.read'],
      'active',
      now(),
      now() + interval '1 hour'
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Unlinked coach must not delegate athlete access';
  end if;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Unauthenticated actor must not access athlete';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  if not access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Athlete must access own active membership';
  end if;
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000002') then
    raise exception 'Athlete must not access archived athlete membership';
  end if;
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000010') then
    raise exception 'Athlete must not access another active athlete';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  if not access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Assigned coach must access linked athlete';
  end if;
  if not access_control.current_user_can_manage_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Assigned coach must manage linked athlete';
  end if;
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000002') then
    raise exception 'Coach must not access archived athlete';
  end if;
  if not access_control.current_user_is_pilot() then
    raise exception 'Explicit pilot user must be recognized';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Unlinked coach must not access athlete';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Archived coach membership must not access athlete';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', false);
  if not access_control.current_user_is_platform_admin() then
    raise exception 'Platform administrator must be recognized';
  end if;
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Platform administrator must not have routine athlete access';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000007', false);
  if not access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Valid delegation must grant athlete read access';
  end if;
  if access_control.current_user_can_manage_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Read-only delegation must not grant athlete manage access';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', false);
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Expired delegation must not grant access';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
  if access_control.current_user_can_access_athlete('30000000-0000-0000-0000-000000000001') then
    raise exception 'Unverified account must not access athlete';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$
begin
  if (select count(*) from access_control.accounts) <> 1 then
    raise exception 'RLS must expose only the current account';
  end if;
end;
$$;
reset role;

select 'access-control-v2 SQL tests passed' as result;
