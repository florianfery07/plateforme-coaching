-- L15c SQL proof for atomic, idempotent athlete proposal scheduling.

do $$
begin
  if has_function_privilege('anon', 'public.schedule_athlete_proposal_v2(uuid)', 'execute') then
    raise exception 'anon must not execute proposal scheduling';
  end if;
  if not has_function_privilege('authenticated', 'public.schedule_athlete_proposal_v2(uuid)', 'execute') then
    raise exception 'authenticated must execute proposal scheduling';
  end if;
  if not exists (
    select 1
    from pg_proc procedure
    where procedure.oid = 'public.schedule_athlete_proposal_v2(uuid)'::regprocedure
      and procedure.proconfig @> array['search_path=pg_catalog, public, access_control']
  ) then
    raise exception 'proposal scheduling RPC must lock its search_path';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'calendar_workouts'
      and indexname = 'calendar_workouts_source_proposal_id_unique'
      and indexdef like '%WHERE (source_proposal_id IS NOT NULL)%'
  ) then
    raise exception 'proposal source unique index must be partial';
  end if;
end;
$$;

do $$
begin
  set local role anon;
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
    raise exception 'anon must be refused before executing proposal scheduling';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
    raise exception 'Unauthenticated user must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000153', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
    raise exception 'Non-pilot must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000154', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
    raise exception 'Inactive account must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000151', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000153');
    raise exception 'Unmapped proposal must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_target_unavailable' then raise; end if;
  end;

  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000154');
    raise exception 'Coach without athlete access must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_permission_denied' then raise; end if;
  end;

  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000155');
    raise exception 'Archived athlete must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_target_unavailable' then raise; end if;
  end;

  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000156');
    raise exception 'Foreign athlete proposal must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_permission_denied' then raise; end if;
  end;

  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000157');
    raise exception 'Ambiguous legacy scheduled proposal must be refused';
  exception when others then
    if sqlerrm <> 'proposal_schedule_legacy_ambiguous' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_result jsonb;
  v_groups_before integer;
  v_invites_before integer;
  v_lifecycle_before integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000151', false);
  select count(*) into v_groups_before from public.group_sessions_v2;
  select count(*) into v_invites_before from access_control.athlete_invites;
  select count(*) into v_lifecycle_before from access_control.athlete_lifecycle_events_v2;

  v_result := public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
  if v_result->>'proposalId' <> '13000000-0000-0000-0000-000000000151'
    or v_result->>'status' <> 'Programmée'
    or v_result->>'created' <> 'true'
    or v_result->'workout'->>'source_proposal_id' <> '13000000-0000-0000-0000-000000000151'
    or (select status from public.athlete_proposals where id = '13000000-0000-0000-0000-000000000151') <> 'Programmée'
    or (select count(*) from public.calendar_workouts where source_proposal_id = '13000000-0000-0000-0000-000000000151') <> 1 then
    raise exception 'Successful scheduling must persist one linked workout and scheduled proposal';
  end if;

  if (select count(*) from public.group_sessions_v2) <> v_groups_before
    or (select count(*) from access_control.athlete_invites) <> v_invites_before
    or (select count(*) from access_control.athlete_lifecycle_events_v2) <> v_lifecycle_before then
    raise exception 'Proposal scheduling must not write Groups V2, invitations, or lifecycle';
  end if;

  v_result := public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000151');
  if v_result->>'created' <> 'false'
    or (select count(*) from public.calendar_workouts where source_proposal_id = '13000000-0000-0000-0000-000000000151') <> 1 then
    raise exception 'Repeated scheduling must be idempotent';
  end if;

  begin
    insert into public.calendar_workouts (athlete_id, date, source_proposal_id)
    values ('10000000-0000-0000-0000-000000000151', '2026-09-20', '13000000-0000-0000-0000-000000000151');
    raise exception 'Source proposal unique index must prevent duplicate workouts';
  exception when unique_violation then
    null;
  end;

  v_result := public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000152');
  if v_result->'workout'->>'workout_type' <> 'Repos'
    or v_result->'workout'->>'completed' <> 'true'
    or (select count(*) from public.calendar_workouts where source_proposal_id = '13000000-0000-0000-0000-000000000152') <> 1 then
    raise exception 'Rest proposal must preserve the legacy rest mapping';
  end if;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000151', false);
  perform set_config('app.l15c.force_workout_failure', 'on', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000159');
    raise exception 'Workout creation failure must abort proposal scheduling';
  exception when others then
    if sqlerrm <> 'l15c_test_workout_failure' then raise; end if;
  end;
  perform set_config('app.l15c.force_workout_failure', 'off', false);
  if (select count(*) from public.calendar_workouts where source_proposal_id = '13000000-0000-0000-0000-000000000159') <> 0
    or (select status from public.athlete_proposals where id = '13000000-0000-0000-0000-000000000159') <> 'À traiter' then
    raise exception 'Workout failure must leave no partial scheduling state';
  end if;

  perform set_config('app.l15c.force_proposal_failure', 'on', false);
  begin
    perform public.schedule_athlete_proposal_v2('13000000-0000-0000-0000-000000000160');
    raise exception 'Proposal update failure must abort proposal scheduling';
  exception when others then
    if sqlerrm <> 'l15c_test_proposal_failure' then raise; end if;
  end;
  perform set_config('app.l15c.force_proposal_failure', 'off', false);
  if (select count(*) from public.calendar_workouts where source_proposal_id = '13000000-0000-0000-0000-000000000160') <> 0
    or (select status from public.athlete_proposals where id = '13000000-0000-0000-0000-000000000160') <> 'À traiter' then
    raise exception 'Proposal update failure must roll back the workout creation';
  end if;
end;
$$;
