-- L09bis local-only proof for the explicit legacy-to-V2 bridge.
insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Bridge organization'),
  ('20000000-0000-0000-0000-000000000002', 'Other organization');
insert into access_control.accounts (user_id, account_status) values
  ('00000000-0000-0000-0000-000000000001', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'active'),
  ('00000000-0000-0000-0000-000000000009', 'active'),
  ('00000000-0000-0000-0000-000000000010', 'active');
insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'athlete', 'active');
insert into access_control.coach_athlete_access (organization_id, coach_membership_id, athlete_membership_id, access_role, status) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'coach', 'active'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000010', 'coach', 'active');
insert into access_control.pilots (user_id, status) values ('00000000-0000-0000-0000-000000000003', 'active');
insert into public.athlete_groups (id, name) values
  ('40000000-0000-0000-0000-000000000001', 'Bridge group'),
  ('40000000-0000-0000-0000-000000000002', 'Empty group');
insert into public.athletes (id, user_id, active, email) values
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', true, 'other-athlete@example.test');
insert into public.athlete_group_members (group_id, athlete_id) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010');
insert into access_control.legacy_group_links (legacy_group_id, organization_id, verification_method)
  values ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'manual');
insert into access_control.legacy_athlete_links (legacy_athlete_id, organization_id, athlete_membership_id, verification_method) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'manual'),
  ('10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000010', 'manual');

do $$ declare v_result jsonb; v_before integer; begin
  if not (select relrowsecurity from pg_class where oid = 'access_control.legacy_group_links'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'access_control.legacy_athlete_links'::regclass) then raise exception 'Bridge RLS is required'; end if;
  if has_function_privilege('anon', 'public.resolve_legacy_group_bridge_v2(uuid)', 'execute') then raise exception 'anon must not execute bridge RPC'; end if;
  perform set_config('request.jwt.claim.sub', '', false);
  if public.resolve_legacy_group_bridge_v2('40000000-0000-0000-0000-000000000001')->>'code' <> 'permission_denied' then raise exception 'Unauthenticated caller must fail'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
  if public.resolve_legacy_group_bridge_v2('40000000-0000-0000-0000-000000000001')->>'code' <> 'permission_denied' then raise exception 'Non-pilot must fail'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  select count(*) into v_before from public.group_sessions_v2;
  v_result := public.resolve_legacy_group_bridge_v2('40000000-0000-0000-0000-000000000001');
  if v_result->>'kind' <> 'success' or v_result->>'organizationId' <> '20000000-0000-0000-0000-000000000001'
    or v_result->>'coachMembershipId' <> '30000000-0000-0000-0000-000000000003'
    or jsonb_array_length(v_result->'athleteMembershipIds') <> 2 then raise exception 'Explicit bridge result is invalid'; end if;
  if (select count(*) from public.group_sessions_v2) <> v_before then raise exception 'Bridge must not create Groups V2 sessions'; end if;
  if public.resolve_legacy_group_bridge_v2('40000000-0000-0000-0000-000000000002')->>'code' <> 'organization_missing' then raise exception 'Unmapped group must fail'; end if;
end $$;

do $$ begin
  begin insert into access_control.legacy_group_links (legacy_group_id, organization_id, verification_method) values ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'manual'); raise exception 'Ambiguous group link accepted'; exception when unique_violation then null; end;
  if (select prosecdef from pg_proc where oid = 'public.resolve_legacy_group_bridge_v2(uuid)'::regprocedure) is not true then raise exception 'Bridge RPC must be SECURITY DEFINER'; end if;
end $$;
reset all;
