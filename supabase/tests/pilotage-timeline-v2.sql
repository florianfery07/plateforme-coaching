-- P03 SQL proof: secure temporal cycles, dated milestones, Goals V2 linkage and legacy isolation.

do $$
declare
  v_goal_request_id uuid;
  v_goal_version_id uuid;
  v_cycle jsonb;
  v_updated_cycle jsonb;
  v_milestone jsonb;
  v_timeline jsonb;
  v_legacy_counts jsonb;
  v_first_archive jsonb;
  v_second_archive jsonb;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.athlete_pilotage_cycles_v2'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.athlete_pilotage_milestones_v2'::regclass) then
    raise exception 'Pilotage timeline tables must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.athlete_pilotage_cycles_v2', 'select')
    or has_table_privilege('authenticated', 'public.athlete_pilotage_milestones_v2', 'insert')
    or has_function_privilege('anon', 'public.get_athlete_pilotage_timeline_v2(uuid,date,date)', 'execute')
    or not has_function_privilege('authenticated', 'public.save_athlete_pilotage_cycle_v2(uuid,uuid,text,date,date,text,text,uuid,integer,uuid)', 'execute') then
    raise exception 'Pilotage timeline privileges are not minimal';
  end if;
  if exists (
    select 1
    from pg_proc
    where oid in (
      'public.get_athlete_pilotage_timeline_v2(uuid,date,date)'::regprocedure,
      'public.save_athlete_pilotage_cycle_v2(uuid,uuid,text,date,date,text,text,uuid,integer,uuid)'::regprocedure,
      'public.save_athlete_pilotage_milestone_v2(uuid,uuid,text,text,date,text,uuid,integer,uuid)'::regprocedure,
      'public.archive_athlete_pilotage_cycle_v2(uuid)'::regprocedure,
      'public.archive_athlete_pilotage_milestone_v2(uuid)'::regprocedure
    )
      and (prosecdef is not true or not ('search_path=pg_catalog, public, access_control' = any(proconfig)))
  ) then
    raise exception 'Pilotage timeline RPC must fix its search path';
  end if;

  v_legacy_counts := jsonb_build_object(
    'week_colors', (select count(*) from public.athlete_week_colors where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_planning', (select count(*) from public.athlete_week_planning where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'calendar_workouts', (select count(*) from public.calendar_workouts where athlete_id = '10000000-0000-0000-0000-000000000021')
  );

  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.get_athlete_pilotage_timeline_v2('10000000-0000-0000-0000-000000000021', date '2026-09-01', date '2026-09-30');
    raise exception 'Unauthenticated timeline read was accepted';
  exception when others then if sqlerrm <> 'pilotage_timeline_permission_denied' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000024', false);
  begin
    perform public.save_athlete_pilotage_cycle_v2(null, '10000000-0000-0000-0000-000000000021', 'Refus', date '2026-09-01', date '2026-09-02', 'blue', null, null, null, '81000000-0000-0000-0000-000000000001');
    raise exception 'Non-pilot cycle creation was accepted';
  exception when others then if sqlerrm <> 'pilotage_timeline_permission_denied' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000026', false);
  begin
    perform public.get_athlete_pilotage_timeline_v2('10000000-0000-0000-0000-000000000021', date '2026-09-01', date '2026-09-30');
    raise exception 'Coach without access read a timeline';
  exception when others then if sqlerrm <> 'pilotage_timeline_permission_denied' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  begin
    perform public.save_athlete_pilotage_cycle_v2(null, '10000000-0000-0000-0000-000000000023', 'Refus archive', date '2026-09-01', date '2026-09-02', 'blue', null, null, null, '81000000-0000-0000-0000-000000000002');
    raise exception 'Archived athlete cycle creation was accepted';
  exception when others then if sqlerrm <> 'pilotage_timeline_target_unavailable' then raise; end if; end;

  -- Create one accepted, immutable Goals V2 version to prove a dated objective is linked rather than copied from legacy text.
  v_goal_request_id := (public.open_athlete_goal_request_v2('10000000-0000-0000-0000-000000000021', '82000000-0000-0000-0000-000000000001')->>'requestId')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
  v_goal_version_id := (public.submit_athlete_goal_version_v2(v_goal_request_id, 'France CX', 'Coupe nationale', 'Projet international', '82000000-0000-0000-0000-000000000002')->>'versionId')::uuid;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', false);
  perform public.accept_athlete_goal_request_v2(v_goal_request_id, 'Objectif validé.');

  v_cycle := public.save_athlete_pilotage_cycle_v2(
    null, '10000000-0000-0000-0000-000000000021', 'Préparation générale',
    date '2026-09-01', date '2026-09-21', 'blue', 'Construire le socle.',
    v_goal_version_id, null, '81000000-0000-0000-0000-000000000003'
  );
  if v_cycle->>'changed' <> 'true' or v_cycle->>'revision' <> '1' then raise exception 'Cycle creation failed'; end if;
  if public.save_athlete_pilotage_cycle_v2(
    null, '10000000-0000-0000-0000-000000000021', 'Préparation générale',
    date '2026-09-01', date '2026-09-21', 'blue', 'Construire le socle.',
    v_goal_version_id, null, '81000000-0000-0000-0000-000000000003'
  )->>'changed' <> 'false' then raise exception 'Cycle creation was not idempotent'; end if;
  begin
    perform public.save_athlete_pilotage_cycle_v2(
      null, '10000000-0000-0000-0000-000000000021', 'Autre cycle',
      date '2026-09-01', date '2026-09-21', 'blue', null, null, null, '81000000-0000-0000-0000-000000000003'
    );
    raise exception 'Conflicting cycle idempotency key was accepted';
  exception when others then if sqlerrm <> 'pilotage_timeline_idempotency_conflict' then raise; end if; end;
  perform public.save_athlete_pilotage_cycle_v2(
    null, '10000000-0000-0000-0000-000000000021', 'Développement puissance',
    date '2026-09-08', date '2026-09-28', 'orange', 'Intensité contrôlée.',
    null, null, '81000000-0000-0000-0000-000000000004'
  );
  perform public.save_athlete_pilotage_cycle_v2(
    null, '10000000-0000-0000-0000-000000000021', 'Technique CX',
    date '2026-09-15', date '2026-09-24', 'emerald', null,
    null, null, '81000000-0000-0000-0000-000000000005'
  );

  v_updated_cycle := public.save_athlete_pilotage_cycle_v2(
    (v_cycle->>'id')::uuid, '10000000-0000-0000-0000-000000000021', 'Préparation générale',
    date '2026-09-01', date '2026-09-22', 'blue', 'Construire le socle.',
    v_goal_version_id, 1, null
  );
  if v_updated_cycle->>'changed' <> 'true' or v_updated_cycle->>'revision' <> '2' then raise exception 'Cycle update failed'; end if;
  begin
    perform public.save_athlete_pilotage_cycle_v2(
      (v_cycle->>'id')::uuid, '10000000-0000-0000-0000-000000000021', 'Préparation générale modifiée',
      date '2026-09-01', date '2026-09-22', 'blue', null, v_goal_version_id, 1, null
    );
    raise exception 'Stale cycle update was accepted';
  exception when others then if sqlerrm <> 'pilotage_timeline_state_conflict' then raise; end if; end;

  v_milestone := public.save_athlete_pilotage_milestone_v2(
    null, '10000000-0000-0000-0000-000000000021', 'goal', 'France CX', date '2026-10-12',
    'Objectif principal de la période.', v_goal_version_id, null, '83000000-0000-0000-0000-000000000001'
  );
  perform public.save_athlete_pilotage_milestone_v2(
    null, '10000000-0000-0000-0000-000000000021', 'competition', 'Manche Coupe de France', date '2026-09-20',
    'Course préparatoire.', null, null, '83000000-0000-0000-0000-000000000002'
  );
  if v_milestone->>'changed' <> 'true'
    or public.save_athlete_pilotage_milestone_v2(
      null, '10000000-0000-0000-0000-000000000021', 'goal', 'France CX', date '2026-10-12',
      'Objectif principal de la période.', v_goal_version_id, null, '83000000-0000-0000-0000-000000000001'
    )->>'changed' <> 'false' then raise exception 'Milestone create was not idempotent'; end if;

  v_timeline := public.get_athlete_pilotage_timeline_v2('10000000-0000-0000-0000-000000000021', date '2026-09-01', date '2026-10-31');
  if jsonb_array_length(v_timeline->'cycles') <> 3
    or jsonb_array_length(v_timeline->'milestones') <> 2
    or v_timeline->'milestones'->0->>'goalVersionId' <> v_goal_version_id::text
    or v_timeline->'milestones'->0->'goalSummary'->>'shortGoal' <> 'France CX' then
    raise exception 'Timeline read did not preserve overlapping cycles and Goal V2 linkage';
  end if;
  if v_legacy_counts <> jsonb_build_object(
    'week_colors', (select count(*) from public.athlete_week_colors where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'week_planning', (select count(*) from public.athlete_week_planning where athlete_id = '10000000-0000-0000-0000-000000000021'),
    'calendar_workouts', (select count(*) from public.calendar_workouts where athlete_id = '10000000-0000-0000-0000-000000000021')
  ) then raise exception 'Pilotage timeline changed legacy calendar data'; end if;

  v_first_archive := public.archive_athlete_pilotage_cycle_v2((v_cycle->>'id')::uuid);
  v_second_archive := public.archive_athlete_pilotage_cycle_v2((v_cycle->>'id')::uuid);
  if v_first_archive->>'changed' <> 'true'
    or v_second_archive->>'changed' <> 'false'
    or exists (
      select 1 from public.athlete_pilotage_cycles_v2
      where id = (v_cycle->>'id')::uuid and archived_at is null
    ) then
    raise exception 'Cycle archival was not idempotent or remained visible: %, %, %',
      v_first_archive, v_second_archive,
      exists (select 1 from public.athlete_pilotage_cycles_v2 where id = (v_cycle->>'id')::uuid and archived_at is null);
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', false);
do $$
declare v_denied boolean := false;
begin
  begin
    perform 1 from public.athlete_pilotage_cycles_v2;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'Authenticated users must not directly read timeline tables'; end if;
end;
$$;
reset role;
reset all;

select 'pilotage-timeline-v2 SQL tests passed' as result;
