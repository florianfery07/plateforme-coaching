-- P04.B SQL proof: V2 feedback draft/finalization stays authorized, atomic,
-- idempotent and isolated from the legacy fallback path.

do $$
begin
  if has_function_privilege('anon', 'public.get_athlete_feedback_pilot_state_v3(uuid)', 'execute') then
    raise exception 'anon must not execute athlete feedback state RPC';
  end if;
  if has_function_privilege('anon', 'public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text)', 'execute')
    or has_function_privilege('anon', 'public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text)', 'execute') then
    raise exception 'anon must not execute athlete feedback V3 RPCs';
  end if;
  if not has_function_privilege('authenticated', 'public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text)', 'execute')
    or not has_function_privilege('authenticated', 'public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text)', 'execute') then
    raise exception 'authenticated must execute athlete feedback V3 RPCs';
  end if;
  if not exists (
    select 1 from pg_proc procedure
    where procedure.oid = 'public.save_workout_feedback_draft_v3(uuid, text, numeric, numeric, integer, integer, integer, text)'::regprocedure
      and procedure.proconfig @> array['search_path=pg_catalog, public, access_control']
  ) or not exists (
    select 1 from pg_proc procedure
    where procedure.oid = 'public.complete_workout_with_feedback_v3(uuid, text, numeric, numeric, integer, integer, integer, text)'::regprocedure
      and procedure.proconfig @> array['search_path=pg_catalog, public, access_control']
  ) then
    raise exception 'athlete feedback V3 RPCs must lock their search_path';
  end if;
end;
$$;

do $$
begin
  set local role anon;
  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 7, 4, 8, 4, ''
    );
    raise exception 'anon draft must be refused';
  exception when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.complete_workout_with_feedback_v3(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 7, 4, 8, 4, ''
    );
    raise exception 'unauthenticated feedback must be refused';
  exception when others then
    if sqlerrm <> 'athlete_feedback_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 7, 4, 8, 4, ''
    );
    raise exception 'inactive account must be refused';
  exception when others then
    if sqlerrm <> 'athlete_feedback_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000010', false);
  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000153', '1h00', 6, 7, 4, 8, 4, ''
    );
    raise exception 'foreign user must be refused';
  exception when others then
    if sqlerrm <> 'athlete_feedback_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000152', '1h00', 6, 7, 4, 8, 4, ''
    );
    raise exception 'unmapped athlete must be refused';
  exception when others then
    if sqlerrm <> 'athlete_feedback_target_unavailable' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_result jsonb;
  v_updated_at timestamptz;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  if (public.get_athlete_feedback_pilot_state_v3('10000000-0000-0000-0000-000000000015')->>'legacyAthleteId')
      <> '10000000-0000-0000-0000-000000000015' then
    raise exception 'active pilot state must return the explicit legacy athlete mapping';
  end if;
  v_result := public.save_workout_feedback_draft_v3(
    '11000000-0000-0000-0000-000000000151', '1h10', 7, 8, 1, null, null, ''
  );
  if v_result->>'completed' <> 'false'
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000151')
    or (select rpe from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 7
    or (select sensation from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 1 then
    raise exception 'draft must persist partial feedback without completing the session';
  end if;

  select updated_at into v_updated_at
  from public.workout_feedbacks
  where workout_id = '11000000-0000-0000-0000-000000000151';
  perform public.save_workout_feedback_draft_v3(
    '11000000-0000-0000-0000-000000000151', '1h10', 7, 8, 1, null, null, ''
  );
  if (select updated_at from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> v_updated_at then
    raise exception 'identical draft must be idempotent';
  end if;

  v_result := public.complete_workout_with_feedback_v3(
    '11000000-0000-0000-0000-000000000151', '1h10', 7, 8, 5, 8, 4, ''
  );
  if v_result->>'completed' <> 'true'
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000151') is not true
    or (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 1
    or (select rpe from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> (select rpe_global from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151')
    or (select sensation from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 5 then
    raise exception 'finalization must atomically persist the complete V2 feedback and legacy rpe mirror';
  end if;

  select updated_at into v_updated_at
  from public.workout_feedbacks
  where workout_id = '11000000-0000-0000-0000-000000000151';
  perform pg_sleep(0.01);
  perform public.complete_workout_with_feedback_v3(
    '11000000-0000-0000-0000-000000000151', '1h12', 8, 9, 4, 9, 5, 'Correction locale'
  );
  if (select real_duration from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> '1h12'
    or (select updated_at from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <= v_updated_at then
    raise exception 'correction after finalization must be atomic and refresh updated_at';
  end if;

  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000151', '1h00', 5, 6, 3, 5, 3, 'Stale draft'
    );
    raise exception 'draft must never overwrite a finalized feedback';
  exception when others then
    if sqlerrm <> 'athlete_feedback_draft_unavailable' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  perform public.complete_workout_with_feedback_v3(
    '11000000-0000-0000-0000-000000000154', '45 min', 6, null, 1, 7, 4, 'Sans spécifique'
  );
  if (select rpe_specific from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000154') is not null then
    raise exception 'non-specific workout must not persist a specific RPE';
  end if;
  begin
    perform public.complete_workout_with_feedback_v3(
      '11000000-0000-0000-0000-000000000154', '45 min', 6, 7, 3, 7, 4, ''
    );
    raise exception 'non-specific workout must reject a specific RPE';
  exception when others then
    if sqlerrm <> 'athlete_feedback_validation_failed' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  perform public.archive_legacy_athlete_v2('10000000-0000-0000-0000-000000000015');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  begin
    perform public.save_workout_feedback_draft_v3(
      '11000000-0000-0000-0000-000000000155', '1h00', 6, 7, 3, 7, 4, ''
    );
    raise exception 'archived athlete must be refused';
  exception when others then
    if sqlerrm <> 'athlete_feedback_target_unavailable' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
  perform public.restore_legacy_athlete_v2('10000000-0000-0000-0000-000000000015');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  perform public.save_workout_feedback_draft_v3(
    '11000000-0000-0000-0000-000000000155', '1h00', 6, 7, 3, 7, 4, ''
  );
end;
$$;

do $$
begin
  update public.calendar_workouts set completed = false, non_done = false where id = '11000000-0000-0000-0000-000000000155';
  delete from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000155';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  perform set_config('app.p04.force_feedback_failure', 'on', false);
  begin
    perform public.complete_workout_with_feedback_v3(
      '11000000-0000-0000-0000-000000000155', '1h00', 6, 7, 3, 7, 4, ''
    );
    raise exception 'forced feedback failure must abort finalization';
  exception when others then
    if sqlerrm <> 'p04_test_feedback_failure' then raise; end if;
  end;
  perform set_config('app.p04.force_feedback_failure', 'off', false);
  if (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000155') <> 0
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000155') then
    raise exception 'failed finalization must leave no partial state';
  end if;
end;
$$;
