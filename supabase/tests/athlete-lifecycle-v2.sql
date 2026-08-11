-- L12 SQL proof. Every identity and row is synthetic and local to Docker.

do $$
declare
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
begin
  if not (select relrowsecurity from pg_class where oid = 'access_control.athlete_lifecycle_events_v2'::regclass) then
    raise exception 'Athlete lifecycle audit table must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'access_control.athlete_lifecycle_events_v2', 'select')
    or has_table_privilege('authenticated', 'access_control.athlete_lifecycle_events_v2', 'select') then
    raise exception 'Lifecycle audit data must not be directly readable';
  end if;
  if has_function_privilege('anon', 'public.archive_legacy_athlete_v2(uuid)', 'execute')
    or has_function_privilege('anon', 'public.restore_legacy_athlete_v2(uuid)', 'execute') then
    raise exception 'Anon must not execute athlete lifecycle RPCs';
  end if;
  if not has_function_privilege('authenticated', 'public.archive_legacy_athlete_v2(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.restore_legacy_athlete_v2(uuid)', 'execute') then
    raise exception 'Authenticated role requires only the controlled lifecycle RPCs';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.archive_legacy_athlete_v2(uuid)'::regprocedure) is not true
    or not exists (select 1 from pg_proc where oid = 'public.archive_legacy_athlete_v2(uuid)'::regprocedure and 'search_path=pg_catalog, public, access_control' = any(proconfig))
    or (select prosecdef from pg_proc where oid = 'public.restore_legacy_athlete_v2(uuid)'::regprocedure) is not true
    or not exists (select 1 from pg_proc where oid = 'public.restore_legacy_athlete_v2(uuid)'::regprocedure and 'search_path=pg_catalog, public, access_control' = any(proconfig)) then
    raise exception 'Lifecycle RPCs must be SECURITY DEFINER with a fixed search path';
  end if;

  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
    raise exception 'Unauthenticated actor archived an athlete';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000009', false);
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
    raise exception 'Inactive account archived an athlete';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
    raise exception 'Non-pilot archived an athlete';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000022');
    raise exception 'Unmapped athlete was accepted';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_target_unavailable' then raise; end if;
  end;
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000023');
    raise exception 'Foreign organization athlete was accepted';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_permission_denied' then raise; end if;
  end;
  begin
    perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000024');
    raise exception 'Unmanaged athlete was accepted';
  exception when others then
    if sqlerrm <> 'athlete_lifecycle_permission_denied' then raise; end if;
  end;

  select jsonb_build_object(
    'athletes', (select count(*) from public.athletes where id = '10000000-0000-0000-0000-000000000021'),
    'calendar_workouts', (select count(*) from public.calendar_workouts where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'workout_feedbacks', (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000021'),
    'proposals', (select count(*) from public.athlete_proposals where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_colors', (select count(*) from public.athlete_week_colors where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_notes', (select count(*) from public.athlete_week_notes where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_planning', (select count(*) from public.athlete_week_planning where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'observations', (select count(*) from public.athlete_observations where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'goal_history', (select count(*) from public.athlete_goal_history where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'test_history', (select count(*) from public.athlete_test_history where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'group_memberships', (select count(*) from public.athlete_group_members where athlete_id = '10000000-0000-0000-0000-000000000021')
  ) into v_before;

  v_result := public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
  if v_result <> jsonb_build_object('athleteId', '10000000-0000-0000-0000-000000000021', 'status', 'archived', 'changed', true)
    or (select active from public.athletes where id = '10000000-0000-0000-0000-000000000021') is not false
    or (select count(*) from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and event_type = 'archived') <> 1 then
    raise exception 'Archive did not atomically persist the expected state and audit event';
  end if;

  select jsonb_build_object(
    'athletes', (select count(*) from public.athletes where id = '10000000-0000-0000-0000-000000000021'),
    'calendar_workouts', (select count(*) from public.calendar_workouts where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'workout_feedbacks', (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000021'),
    'proposals', (select count(*) from public.athlete_proposals where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_colors', (select count(*) from public.athlete_week_colors where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_notes', (select count(*) from public.athlete_week_notes where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_planning', (select count(*) from public.athlete_week_planning where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'observations', (select count(*) from public.athlete_observations where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'goal_history', (select count(*) from public.athlete_goal_history where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'test_history', (select count(*) from public.athlete_test_history where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'group_memberships', (select count(*) from public.athlete_group_members where athlete_id = '10000000-0000-0000-0000-000000000021')
  ) into v_after;
  if v_before <> v_after then
    raise exception 'Archive must not delete or mutate any dependent legacy data';
  end if;

  v_result := public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
  if v_result->>'changed' <> 'false'
    or (select count(*) from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and event_type = 'archived') <> 1 then
    raise exception 'Archive must be idempotent';
  end if;

  v_result := public.restore_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
  if v_result <> jsonb_build_object('athleteId', '10000000-0000-0000-0000-000000000021', 'status', 'active', 'changed', true)
    or (select active from public.athletes where id = '10000000-0000-0000-0000-000000000021') is not true
    or (select count(*) from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and event_type = 'restored') <> 1 then
    raise exception 'Restore did not atomically persist the expected state and audit event';
  end if;

  v_result := public.restore_legacy_athlete_v2('10000000-0000-0000-0000-000000000021');
  if v_result->>'changed' <> 'false'
    or (select count(*) from access_control.athlete_lifecycle_events_v2 where legacy_athlete_id = '10000000-0000-0000-0000-000000000021' and event_type = 'restored') <> 1 then
    raise exception 'Restore must be idempotent';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from access_control.athlete_lifecycle_events_v2;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'Authenticated users must not read lifecycle audit events directly';
  end if;
end;
$$;
reset role;
reset all;

select 'athlete-lifecycle-v2 SQL tests passed' as result;
