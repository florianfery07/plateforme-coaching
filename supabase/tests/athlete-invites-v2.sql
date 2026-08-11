-- L11 local SQL proof. Synthetic data only; no remote Supabase resource is contacted.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'invited-athlete@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'disabled-athlete@example.test'),
  ('00000000-0000-0000-0000-000000000013', 'existing-member@example.test'),
  ('00000000-0000-0000-0000-000000000014', 'expired-invite@example.test'),
  ('00000000-0000-0000-0000-000000000015', 'revoked-invite@example.test')
on conflict do nothing;

insert into public.athletes (id, active, email) values
  ('10000000-0000-0000-0000-000000000011', true, 'legacy-target@example.test'),
  ('10000000-0000-0000-0000-000000000012', true, 'legacy-expired@example.test'),
  ('10000000-0000-0000-0000-000000000013', true, 'legacy-disabled@example.test'),
  ('10000000-0000-0000-0000-000000000014', true, 'legacy-existing@example.test'),
  ('10000000-0000-0000-0000-000000000015', true, 'legacy-revoked@example.test')
on conflict do nothing;

insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000011', 'Invites V2 organization'),
  ('20000000-0000-0000-0000-000000000012', 'Invites V2 foreign organization')
on conflict do nothing;
insert into access_control.accounts (user_id, account_status, migration_state) values
  ('00000000-0000-0000-0000-000000000003', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000004', 'active', 'verified'),
  ('00000000-0000-0000-0000-000000000012', 'disabled', 'verified'),
  ('00000000-0000-0000-0000-000000000013', 'active', 'verified')
on conflict (user_id) do update set account_status = excluded.account_status, migration_state = excluded.migration_state;
insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000004', 'assistant_coach', 'active'),
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', 'athlete', 'active')
on conflict (id) do update set status = excluded.status;
insert into access_control.pilots (user_id, status) values
  ('00000000-0000-0000-0000-000000000003', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'active')
on conflict do nothing;

do $$
declare
  v_created jsonb;
  v_token text;
  v_invite_id uuid;
  v_result jsonb;
  v_rejected boolean;
  v_before_legacy_email text;
begin
  if not (select relrowsecurity from pg_class where oid = 'access_control.athlete_invites'::regclass) then
    raise exception 'Invite table must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'access_control.athlete_invites', 'select')
    or has_table_privilege('authenticated', 'access_control.athlete_invites', 'select') then
    raise exception 'Invite metadata must not be directly readable';
  end if;
  if has_function_privilege('anon', 'public.create_athlete_invite_v2(uuid, uuid)', 'execute')
    or has_function_privilege('anon', 'public.consume_athlete_invite_v2(text)', 'execute') then
    raise exception 'Anon must not execute invite RPCs';
  end if;
  if not has_function_privilege('authenticated', 'public.create_athlete_invite_v2(uuid, uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.consume_athlete_invite_v2(text)', 'execute') then
    raise exception 'Authenticated role needs only the controlled RPC capability';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.consume_athlete_invite_v2(text)'::regprocedure) is not true
    or not exists (select 1 from pg_proc where oid = 'public.consume_athlete_invite_v2(text)'::regprocedure and 'search_path=pg_catalog, public, extensions, access_control' = any(proconfig)) then
    raise exception 'Consume RPC must be SECURITY DEFINER with a fixed search path';
  end if;

  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011');
    raise exception 'Unauthenticated creation accepted';
  exception when others then
    if sqlerrm <> 'invite_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
  begin
    perform public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000012');
    raise exception 'Non-coach role created an invitation';
  exception when others then
    if sqlerrm <> 'invite_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  v_created := public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011');
  v_token := v_created->>'token';
  v_invite_id := (v_created->>'inviteId')::uuid;
  if v_token !~ '^v2i_[0-9a-f]{64}$' or (select token_hash = digest(v_token, 'sha256') from access_control.athlete_invites where id = v_invite_id) is not true then
    raise exception 'Invite must return one opaque capability and persist only its hash';
  end if;
  if (select count(*) from access_control.athlete_invites where status = 'active') <> 1 then
    raise exception 'Expected one active invitation';
  end if;
  if position(v_token in public.list_athlete_invites_v2('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011')::text) > 0 then
    raise exception 'The safe invite list must never disclose a raw token';
  end if;
  begin
    perform public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011');
    raise exception 'A second active invitation was accepted';
  exception when others then
    if sqlerrm <> 'invite_already_active' then raise; end if;
  end;

  select email into v_before_legacy_email from public.athletes where id = '10000000-0000-0000-0000-000000000011';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000012', false);
  begin
    perform public.consume_athlete_invite_v2(v_token);
    raise exception 'Disabled V2 account consumed an invitation';
  exception when others then
    if sqlerrm <> 'invite_account_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', false);
  begin
    perform public.consume_athlete_invite_v2(v_token);
    raise exception 'Existing foreign membership consumed an invitation';
  exception when others then
    if sqlerrm <> 'invite_account_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', false);
  v_result := public.consume_athlete_invite_v2(v_token);
  if v_result->>'legacyAthleteId' <> '10000000-0000-0000-0000-000000000011'
    or (select count(*) from access_control.organization_memberships where user_id = '00000000-0000-0000-0000-000000000011' and role = 'athlete' and status = 'active') <> 1
    or (select count(*) from access_control.coach_athlete_access where coach_membership_id = '30000000-0000-0000-0000-000000000011' and status = 'active') <> 1
    or (select count(*) from access_control.legacy_athlete_links where legacy_athlete_id = '10000000-0000-0000-0000-000000000011' and verification_method = 'invitation_v2') <> 1
    or (select user_id from public.athletes where id = '10000000-0000-0000-0000-000000000011') <> '00000000-0000-0000-0000-000000000011'::uuid
    or (select email from public.athletes where id = '10000000-0000-0000-0000-000000000011') <> v_before_legacy_email then
    raise exception 'Consumption must atomically create only the intended V2 relationship and legacy user binding';
  end if;
  begin
    perform public.consume_athlete_invite_v2(v_token);
    raise exception 'Consumed token was reusable';
  exception when others then
    if sqlerrm <> 'invite_invalid_or_unavailable' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  v_created := public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000011');
  update access_control.athlete_invites
  set created_at = now() - interval '2 seconds',
      expires_at = now() - interval '1 second'
  where id = (v_created->>'inviteId')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000014', false);
  if public.consume_athlete_invite_v2(v_created->>'token')->>'code' <> 'invite_invalid_or_unavailable' then
    raise exception 'Expired token was accepted';
  end if;
  if (select status from access_control.athlete_invites where id = (v_created->>'inviteId')::uuid) <> 'expired' then
    raise exception 'Expired invite must transition to expired';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  v_created := public.create_athlete_invite_v2('10000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000011');
  v_token := v_created->>'token';
  v_invite_id := (v_created->>'inviteId')::uuid;
  v_result := public.revoke_athlete_invite_v2(v_invite_id, '30000000-0000-0000-0000-000000000011');
  if v_result->>'status' <> 'revoked' then
    raise exception 'Revocation returned an unexpected state';
  end if;
  if (select revoked_at is not null from access_control.athlete_invites where id = v_invite_id) is not true then
    raise exception 'Revocation timestamp was not persisted';
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000015', false);
  begin
    perform public.consume_athlete_invite_v2(v_token);
    raise exception 'Revoked invitation was consumed';
  exception when others then
    if sqlerrm <> 'invite_invalid_or_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  if public.revoke_athlete_invite_v2(v_invite_id, '30000000-0000-0000-0000-000000000011')->>'status' <> 'revoked'
    or (select consumed_at is null and consumed_by_user_id is null from access_control.athlete_invites where id = v_invite_id) is not true
    or exists (select 1 from access_control.legacy_athlete_links where legacy_athlete_id = '10000000-0000-0000-0000-000000000015') then
    raise exception 'Revoked invitation must remain idempotent and create no association';
  end if;
end;
$$;

reset all;
