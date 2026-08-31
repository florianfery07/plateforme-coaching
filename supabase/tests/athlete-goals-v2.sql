-- L16b SQL proof: permissions, workflow, idempotence, immutability and legacy isolation.

do $$
declare
  v_request_id uuid;
  v_second_request_id uuid;
  v_result jsonb;
  v_history jsonb;
  v_current jsonb;
  v_state jsonb;
  v_baseline_version_id uuid;
  v_before_legacy jsonb;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.athlete_goal_requests_v2'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.athlete_goal_versions_v2'::regclass) then
    raise exception 'Goal V2 tables must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.athlete_goal_requests_v2', 'select')
    or has_table_privilege('authenticated', 'public.athlete_goal_versions_v2', 'select') then
    raise exception 'Goal V2 tables must not be directly readable';
  end if;
  if has_function_privilege('anon', 'public.open_athlete_goal_request_v2(uuid, uuid)', 'execute')
    or has_function_privilege('anon', 'public.list_athlete_goal_history_v2(uuid)', 'execute')
    or has_function_privilege('anon', 'public.get_athlete_goal_state_v2(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.submit_athlete_goal_version_v2(uuid, text, text, text, uuid)', 'execute') then
    raise exception 'Goal V2 RPC privileges are not minimal';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.open_athlete_goal_request_v2(uuid, uuid)'::regprocedure) is not true
    or not exists (select 1 from pg_proc where oid = 'public.open_athlete_goal_request_v2(uuid, uuid)'::regprocedure and 'search_path=pg_catalog, public, access_control' = any(proconfig)) then
    raise exception 'Goal V2 RPC must be SECURITY DEFINER with a fixed search path';
  end if;

  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000001');
    raise exception 'Unauthenticated goal request was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000024', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000002');
    raise exception 'Non-pilot goal request was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000025', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000003');
    raise exception 'Inactive account goal request was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000004');
    raise exception 'Athlete opened a coach-only goal request';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000026', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000004');
    raise exception 'Coach without athlete access opened a goal request';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000022', '70000000-0000-0000-0000-000000000005');
    raise exception 'Unmapped athlete goal request was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_target_unavailable' then raise; end if;
  end;
  begin
    perform public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000023', '70000000-0000-0000-0000-000000000006');
    raise exception 'Archived athlete goal request was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_target_unavailable' then raise; end if;
  end;

  select jsonb_build_object('short', short_goal, 'medium', medium_goal, 'long', long_goal)
  into v_before_legacy from public.athletes where id = '10000000-0000-0000-0000-000000000021';
  v_result := public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000007');
  v_request_id := (v_result->>'requestId')::uuid;
  if v_result->>'status' <> 'requested' or v_result->>'changed' <> 'true'
    or (select count(*) from public.athlete_goal_versions_v2 where request_id = v_request_id and source = 'legacy_baseline' and revision_number = 0 and review_outcome = 'accepted') <> 1
    or v_before_legacy <> (select jsonb_build_object('short', short_goal, 'medium', medium_goal, 'long', long_goal) from public.athletes where id = '10000000-0000-0000-0000-000000000021') then
    raise exception 'Opening must preserve legacy values and create exactly one immutable baseline';
  end if;
  v_baseline_version_id := (select id from public.athlete_goal_versions_v2 where request_id = v_request_id and source = 'legacy_baseline');
  if public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000007')->>'changed' <> 'false'
    or public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000008')->>'requestId' <> v_request_id::text then
    raise exception 'Opening must be idempotent and allow only one open request';
  end if;
  v_current := public.get_athlete_current_goal_v2('10000000-0000-0000-0000-000000000021');
  v_state := public.get_athlete_goal_state_v2('10000000-0000-0000-0000-000000000021');
  if v_current->'current'->>'shortGoal' <> 'Legacy court'
    or v_state->'openRequest'->>'requestId' <> v_request_id::text
    or v_state->'openRequest'->>'status' <> 'requested'
    or v_state->'openRequest'->'latestVersion'->>'source' <> 'legacy_baseline'
    or jsonb_array_length(v_state->'history') <> 1 then
    raise exception 'The initial V2 current goal must be the read-only legacy baseline';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  begin
    perform public.submit_athlete_goal_version_v2(v_request_id, 'Court', 'Moyen', 'Long', '71000000-0000-0000-0000-000000000001');
    raise exception 'Coach submitted an athlete goal version';
  exception when others then
    if sqlerrm <> 'athlete_goal_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  begin
    perform public.submit_athlete_goal_version_v2(v_request_id, ' ', '', '', '71000000-0000-0000-0000-000000000002');
    raise exception 'Blank goal version was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_validation_failed' then raise; end if;
  end;
  v_result := public.submit_athlete_goal_version_v2(v_request_id, 'Court V1', 'Moyen V1', 'Long V1', '71000000-0000-0000-0000-000000000003');
  if v_result->>'status' <> 'submitted' or v_result->>'changed' <> 'true' then raise exception 'Athlete submission did not transition to submitted'; end if;
  if public.submit_athlete_goal_version_v2(v_request_id, 'Court V1', 'Moyen V1', 'Long V1', '71000000-0000-0000-0000-000000000003')->>'changed' <> 'false' then
    raise exception 'Athlete submission must be idempotent';
  end if;
  begin
    perform public.submit_athlete_goal_version_v2(v_request_id, 'Court duplicate', 'Moyen', 'Long', '71000000-0000-0000-0000-000000000004');
    raise exception 'Second submission without review was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_state_conflict' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  v_result := public.request_athlete_goal_changes_v2(v_request_id, 'Préciser la progression.');
  if v_result->>'status' <> 'changes_requested' or v_result->>'changed' <> 'true' then raise exception 'Change request did not persist'; end if;
  if public.request_athlete_goal_changes_v2(v_request_id, 'Préciser la progression.')->>'changed' <> 'false' then
    raise exception 'Change request must be idempotent';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  v_result := public.submit_athlete_goal_version_v2(v_request_id, 'Court V2', 'Moyen V2', 'Long V2', '71000000-0000-0000-0000-000000000005');
  if v_result->>'revisionNumber' <> '2' or v_result->>'status' <> 'submitted' then raise exception 'Revision after changes was not created'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  v_result := public.accept_athlete_goal_request_v2(v_request_id, 'Validé.');
  if v_result->>'status' <> 'accepted' or v_result->>'changed' <> 'true' then raise exception 'Acceptance did not close the request'; end if;
  if public.accept_athlete_goal_request_v2(v_request_id, 'Validé.')->>'changed' <> 'false' then raise exception 'Acceptance must be idempotent'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  v_current := public.get_athlete_current_goal_v2('10000000-0000-0000-0000-000000000021');
  v_history := public.list_athlete_goal_history_v2('10000000-0000-0000-0000-000000000021');
  v_state := public.get_athlete_goal_state_v2('10000000-0000-0000-0000-000000000021');
  if v_current->'current'->>'shortGoal' <> 'Court V2'
    or jsonb_array_length(v_history) <> 3
    or v_state->>'openRequest' is not null
    or v_state->'current'->>'shortGoal' <> 'Court V2'
    or jsonb_array_length(v_state->'history') <> 3
    or exists (select 1 from public.athlete_goal_versions_v2 where request_id = v_request_id and source = 'athlete_submission' and review_outcome is null)
    or v_before_legacy <> (select jsonb_build_object('short', short_goal, 'medium', medium_goal, 'long', long_goal) from public.athletes where id = '10000000-0000-0000-0000-000000000021') then
    raise exception 'Acceptance must make only the approved V2 version current and leave legacy untouched';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
  begin
    perform public.get_athlete_current_goal_v2('10000000-0000-0000-0000-000000000021');
    raise exception 'Archived athlete remained available to Goals V2';
  exception when others then
    if sqlerrm <> 'athlete_goal_target_unavailable' then raise; end if;
  end;
  perform public.restore_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');

  begin
    update public.athlete_goal_versions_v2 set short_goal = 'tampered' where id = v_baseline_version_id;
    raise exception 'Goal version content was mutable';
  exception when others then
    if sqlerrm <> 'athlete_goal_version_immutable' then raise; end if;
  end;
  begin
    delete from public.athlete_goal_versions_v2 where id = v_baseline_version_id;
    raise exception 'Goal version deletion was accepted';
  exception when others then
    if sqlerrm <> 'athlete_goal_version_immutable' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  v_result := public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000009');
  v_second_request_id := (v_result->>'requestId')::uuid;
  if (select count(*) from public.athlete_goal_versions_v2 where request_id = v_second_request_id and source = 'legacy_baseline') <> 0 then
    raise exception 'A later request must reuse accepted V2 history, not copy legacy again';
  end if;
  if public.cancel_athlete_goal_request_v2(v_second_request_id)->>'changed' <> 'true'
    or public.cancel_athlete_goal_request_v2(v_second_request_id)->>'changed' <> 'false' then
    raise exception 'Cancellation must be idempotent';
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  begin
    perform public.submit_athlete_goal_version_v2(v_second_request_id, 'After cancel', null, null, '71000000-0000-0000-0000-000000000006');
    raise exception 'Cancelled request accepted a new version';
  exception when others then
    if sqlerrm <> 'athlete_goal_state_conflict' then raise; end if;
  end;

  -- Leaves one submitted request for the concurrent acceptance proof in the runner.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  v_result := public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '70000000-0000-0000-0000-000000000010');
  v_second_request_id := (v_result->>'requestId')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  perform public.submit_athlete_goal_version_v2(v_second_request_id, 'Concurrent court', 'Concurrent medium', 'Concurrent long', '71000000-0000-0000-0000-000000000007');
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
do $$
declare v_denied boolean := false;
begin
  begin
    perform 1 from public.athlete_goal_requests_v2;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Authenticated users must not read goal workflow tables directly'; end if;
end;
$$;
reset role;
reset all;

select 'athlete-goals-v2 SQL tests passed' as result;
