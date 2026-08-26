-- L15b SQL proof for the atomic completion RPC.

do $$
begin
  if has_function_privilege('anon', 'public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text)', 'execute') then
    raise exception 'anon must not execute workout completion';
  end if;
  if not has_function_privilege('authenticated', 'public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text)', 'execute') then
    raise exception 'authenticated must execute workout completion';
  end if;
  if not exists (
    select 1
    from pg_proc procedure
    where procedure.oid = 'public.complete_workout_with_feedback_v2(uuid, text, numeric, numeric, numeric, integer, integer, text)'::regprocedure
      and procedure.proconfig @> array['search_path=pg_catalog, public, access_control']
  ) then
    raise exception 'workout completion RPC must lock its search_path';
  end if;
end;
$$;

do $$
begin
  set local role anon;
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'anon must be refused before executing workout completion';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Unauthenticated user must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000010', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000153', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Non-pilot must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Inactive account must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Unassigned actor must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000152', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Unmapped athlete workout must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_target_unavailable' then raise; end if;
  end;

  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000153', '1h00', 6, 6, 7, 8, 4, 'Local test'
    );
    raise exception 'Foreign athlete workout must be refused';
  exception when others then
    if sqlerrm <> 'workout_completion_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  v_result := public.complete_workout_with_feedback_v2(
    '11000000-0000-0000-0000-000000000151', '1h15', 6, 6, 7, 8, 4, 'Validation réussie'
  );

  if v_result->>'workoutId' <> '11000000-0000-0000-0000-000000000151'
    or v_result->>'completed' <> 'true'
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000151') is not true
    or (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 1 then
    raise exception 'Successful completion must persist one feedback and completed state';
  end if;

  perform public.complete_workout_with_feedback_v2(
    '11000000-0000-0000-0000-000000000151', '1h15', 6, 6, 7, 8, 4, 'Validation réussie'
  );
  if (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 1 then
    raise exception 'Repeated completion must not duplicate feedback';
  end if;
end;
$$;

do $$
begin
  update public.calendar_workouts set completed = false, non_done = false where id = '11000000-0000-0000-0000-000000000151';
  delete from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  perform set_config('app.l15b.force_feedback_failure', 'on', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Failure test'
    );
    raise exception 'Feedback failure must abort completion';
  exception when others then
    if sqlerrm <> 'l15b_test_feedback_failure' then raise; end if;
  end;
  perform set_config('app.l15b.force_feedback_failure', 'off', false);
  if (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 0
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000151') then
    raise exception 'Feedback failure must leave no partial completion';
  end if;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
  perform set_config('app.l15b.force_workout_failure', 'on', false);
  begin
    perform public.complete_workout_with_feedback_v2(
      '11000000-0000-0000-0000-000000000151', '1h00', 6, 6, 7, 8, 4, 'Failure test'
    );
    raise exception 'Workout update failure must abort completion';
  exception when others then
    if sqlerrm <> 'l15b_test_workout_failure' then raise; end if;
  end;
  perform set_config('app.l15b.force_workout_failure', 'off', false);
  if (select count(*) from public.workout_feedbacks where workout_id = '11000000-0000-0000-0000-000000000151') <> 0
    or (select completed from public.calendar_workouts where id = '11000000-0000-0000-0000-000000000151') then
    raise exception 'Workout update failure must roll back feedback and completion';
  end if;
end;
$$;
