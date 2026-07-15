-- L09 local-only SQL evidence. No remote Supabase resource is contacted.

insert into access_control.organizations (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Groups V2 test organization')
on conflict do nothing;

insert into access_control.accounts (user_id, account_status) values
  ('00000000-0000-0000-0000-000000000001', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'active'),
  ('00000000-0000-0000-0000-000000000010', 'active')
on conflict do nothing;

insert into access_control.organization_memberships (id, organization_id, user_id, role, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'athlete', 'active'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'coach', 'active'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'athlete', 'active')
on conflict do nothing;

insert into access_control.coach_athlete_access (organization_id, coach_membership_id, athlete_membership_id, access_role, status) values
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'coach', 'active')
on conflict do nothing;

update access_control.organization_memberships
set role = 'organization_administrator'
where id = '30000000-0000-0000-0000-000000000004';

do $$
declare
  v_before integer;
  v_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  select count(*) into v_before from public.group_sessions_v2;

  begin
    perform public.create_group_session_v2(
      '20000000-0000-0000-0000-000000000001',
      date '2026-08-01',
      jsonb_build_object('title', 'Rollback test', 'blocks', jsonb_build_array()),
      array['99999999-0000-0000-0000-000000000001'::uuid]
    );
  exception when others then
    v_rejected := true;
  end;

  if not v_rejected then
    raise exception 'Invalid participant must reject the complete create transaction';
  end if;
  if (select count(*) from public.group_sessions_v2) <> v_before then
    raise exception 'Failed create must roll back the canonical session';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select set_config(
  'test.group_session_id',
  public.create_group_session_v2(
    '20000000-0000-0000-0000-000000000001',
    date '2026-08-01',
    jsonb_build_object(
      'title', 'Endurance collective',
      'workoutType', 'Endurance',
      'description', 'Fixture only',
      'duration', '1h30',
      'blocks', jsonb_build_array(jsonb_build_object('kind', 'steady'))
    ),
    array['30000000-0000-0000-0000-000000000001'::uuid]
  ) ->> 'sessionId',
  false
);

do $$
declare
  v_session_id uuid := current_setting('test.group_session_id')::uuid;
begin
  if (select status from public.group_sessions_v2 where id = v_session_id) <> 'scheduled' then
    raise exception 'Create RPC must create a scheduled session';
  end if;
  if (select count(*) from public.group_session_participants_v2 where group_session_id = v_session_id
      and assignment_status = 'active') <> 1 then
    raise exception 'Create RPC must create one independent active participant assignment';
  end if;
  if (select count(*) from public.group_session_events_v2 where group_session_id = v_session_id
      and event_type = 'created') <> 1 then
    raise exception 'Create RPC must write an audit event';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$
begin
  if (select count(*) from public.group_sessions_v2) <> 1 then
    raise exception 'Assigned athlete must read the group session through RLS';
  end if;
  if has_table_privilege(current_user, 'public.group_sessions_v2', 'INSERT') then
    raise exception 'Authenticated callers must not receive direct group session writes';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select public.update_group_session_v2(
  current_setting('test.group_session_id')::uuid,
  1,
  jsonb_build_object(
    'scheduledFor', '2026-08-02',
    'title', 'Endurance collective mise a jour',
    'blocks', jsonb_build_array()
  )
);

do $$
declare v_rejected boolean := false;
begin
  begin
    perform public.update_group_session_v2(
      current_setting('test.group_session_id')::uuid,
      1,
      jsonb_build_object('scheduledFor', '2026-08-02', 'title', 'Version obsolete', 'blocks', jsonb_build_array())
    );
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Stale optimistic version must be rejected'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select public.add_group_session_participant_v2(
  current_setting('test.group_session_id')::uuid,
  2,
  '30000000-0000-0000-0000-000000000010'
);
select public.remove_group_session_participant_v2(
  current_setting('test.group_session_id')::uuid,
  3,
  '30000000-0000-0000-0000-000000000010'
);
select public.add_group_session_participant_v2(
  current_setting('test.group_session_id')::uuid,
  4,
  '30000000-0000-0000-0000-000000000010'
);

do $$
declare v_session_id uuid := current_setting('test.group_session_id')::uuid;
begin
  if (select count(*) from public.group_session_participants_v2 where group_session_id = v_session_id) <> 2 then
    raise exception 'Participant re-add must preserve one durable assignment identity';
  end if;
  if (select version from public.group_sessions_v2 where id = v_session_id) <> 5 then
    raise exception 'Participant changes must advance the canonical version';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000010', false);
do $$
begin
  if (select count(*) from public.group_sessions_v2) <> 1 then
    raise exception 'Newly assigned athlete must read the group session through RLS';
  end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
select set_config(
  'test.duplicate_session_id',
  public.duplicate_group_session_v2(
    current_setting('test.group_session_id')::uuid,
    5,
    date '2026-08-08'
  ) ->> 'sessionId',
  false
);
select public.cancel_group_session_v2(current_setting('test.duplicate_session_id')::uuid, 1);
select public.delete_group_session_v2(current_setting('test.duplicate_session_id')::uuid, 2);

do $$
declare
  v_source_id uuid := current_setting('test.group_session_id')::uuid;
  v_duplicate_id uuid := current_setting('test.duplicate_session_id')::uuid;
  v_rejected boolean := false;
begin
  if (select source_group_session_id from public.group_sessions_v2 where id = v_duplicate_id) <> v_source_id then
    raise exception 'Duplicate must preserve source lineage without copying workouts per athlete';
  end if;
  if (select status from public.group_sessions_v2 where id = v_duplicate_id) <> 'deleted' then
    raise exception 'Delete RPC must be a historical soft delete';
  end if;
  begin
    perform public.cancel_group_session_v2(v_source_id, 5);
  exception when others then v_rejected := true;
  end;
  if not v_rejected then raise exception 'Concurrent stale cancellation must be rejected'; end if;
  if (select count(*) from public.group_session_events_v2 where group_session_id = v_source_id) < 5 then
    raise exception 'Expected audit history is incomplete';
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.group_sessions_v2_organization_schedule_idx') is null
    or to_regclass('public.group_session_participants_v2_athlete_idx') is null
    or to_regclass('public.group_session_events_v2_session_created_idx') is null then
    raise exception 'Expected query indexes are missing';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('group_sessions_v2', 'group_session_participants_v2', 'group_session_events_v2')) <> 3 then
    raise exception 'Every V2 table must have one explicit read policy';
  end if;
  if exists (
    select 1 from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'groups_v2')
      and procedure.proname like '%group_session%v2'
      and procedure.prosecdef is false
  ) then
    raise exception 'Public group-session RPCs must be SECURITY DEFINER';
  end if;
end;
$$;

reset all;
