-- P05.C security, validation, projection and snapshot proof.
do $$ declare v_function regprocedure; begin
  foreach v_function in array array[
    'public.upsert_workout_library_structure_v2(uuid,jsonb,integer,uuid)'::regprocedure,
    'public.upsert_calendar_workout_structure_v2(uuid,jsonb,integer,uuid)'::regprocedure,
    'public.create_calendar_workout_structure_snapshot_v2(uuid,uuid,uuid)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'execute') or not has_function_privilege('authenticated', v_function, 'execute') then raise exception 'unexpected RPC privilege: %', v_function; end if;
    if not exists (select 1 from pg_proc where oid = v_function and proconfig @> array['search_path=pg_catalog, public, access_control']) then raise exception 'unlocked search_path: %', v_function; end if;
  end loop;
end $$;

do $$ begin
  set local role anon;
  begin perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[]}', 0, '80000000-0000-0000-0000-000000000301'); raise exception 'anon accepted'; exception when insufficient_privilege then null; end;
end $$;

do $$ declare v_result jsonb; v_template uuid; v_snapshot uuid; v_before jsonb; begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false}]}', 0, '80000000-0000-0000-0000-000000000301'); raise exception 'unauth accepted'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000303', false);
  begin perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false}]}', 0, '80000000-0000-0000-0000-000000000302'); raise exception 'non pilot accepted'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  begin perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[]}', 0, '80000000-0000-0000-0000-000000000303'); raise exception 'invalid document accepted'; exception when others then if sqlerrm <> 'workout_structure_validation_failed' then raise; end if; end;
  v_result := public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"set","kind":"repeat","repetitions":2,"steps":[{"id":"effort","kind":"effort","durationSeconds":300,"isSpecific":true,"intensity":{"zone":"Z5"}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}', 0, '80000000-0000-0000-0000-000000000304');
  v_template := (v_result->>'structureId')::uuid;
  if v_result->>'revision' <> '1' or v_result->>'totalDurationSeconds' <> '1440' or v_result->>'specificDurationSeconds' <> '600' or (select total_duration from public.workout_library where id = '70000000-0000-0000-0000-000000000301') <> '24min' or (select expected_specific_duration from public.workout_library where id = '70000000-0000-0000-0000-000000000301') <> '10min' or (select blocks from public.workout_library where id = '70000000-0000-0000-0000-000000000301') <> '[{"legacy": true}]'::jsonb then raise exception 'valid library projection failed'; end if;
  if (public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"set","kind":"repeat","repetitions":2,"steps":[{"id":"effort","kind":"effort","durationSeconds":300,"isSpecific":true,"intensity":{"zone":"Z5"}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}', 0, '80000000-0000-0000-0000-000000000304')->>'changed') <> 'false' then raise exception 'library idempotence failed'; end if;
  v_result := public.create_calendar_workout_structure_snapshot_v2('71000000-0000-0000-0000-000000000301', v_template, '80000000-0000-0000-0000-000000000305');
  v_snapshot := (v_result->>'structureId')::uuid;
  if (select source_structure_id from public.workout_structures_v2 where id = v_snapshot) <> v_template or (select document from public.workout_structures_v2 where id = v_snapshot) <> (select document from public.workout_structures_v2 where id = v_template) then raise exception 'snapshot did not preserve exact source'; end if;
  v_before := (select document from public.workout_structures_v2 where id = v_snapshot);
  perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"new","kind":"free","durationSeconds":1800,"isSpecific":true}]}', 1, '80000000-0000-0000-0000-000000000306');
  if (select document from public.workout_structures_v2 where id = v_snapshot) <> v_before then raise exception 'library revision changed snapshot'; end if;
  v_result := public.upsert_calendar_workout_structure_v2('71000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false},{"id":"b","kind":"effort","durationSeconds":30,"isSpecific":true}]}', 1, '80000000-0000-0000-0000-000000000307');
  if v_result->>'revision' <> '2' or (select source_structure_id from public.workout_structures_v2 where id = (v_result->>'structureId')::uuid) <> v_template or (select duration from public.calendar_workouts where id = '71000000-0000-0000-0000-000000000301') <> '00:01:30' then raise exception 'authorized calendar update failed'; end if;
  begin perform public.upsert_calendar_workout_structure_v2('71000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false}]}', 1, '80000000-0000-0000-0000-000000000308'); raise exception 'stale calendar revision accepted'; exception when others then if sqlerrm <> 'workout_structure_revision_conflict' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', false);
  begin perform public.upsert_calendar_workout_structure_v2('71000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false}]}', 2, '80000000-0000-0000-0000-000000000309'); raise exception 'unmanaged coach accepted'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
  update public.athletes set active = false where id = '10000000-0000-0000-0000-000000000301';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  begin perform public.upsert_calendar_workout_structure_v2('71000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"a","kind":"warmup","durationSeconds":60,"isSpecific":false}]}', 2, '80000000-0000-0000-0000-000000000310'); raise exception 'archived athlete accepted'; exception when others then if sqlerrm <> 'workout_structure_target_unavailable' then raise; end if; end;
  update public.athletes set active = true where id = '10000000-0000-0000-0000-000000000301';
end $$;

do $$ begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  perform set_config('app.p05.force_projection_failure', 'on', false);
  begin perform public.upsert_workout_library_structure_v2('70000000-0000-0000-0000-000000000301', '{"schemaVersion":1,"blocks":[{"id":"rollback","kind":"free","durationSeconds":60,"isSpecific":false}]}', 2, '80000000-0000-0000-0000-000000000311'); raise exception 'projection failure accepted'; exception when others then if sqlerrm <> 'p05_test_projection_failure' then raise; end if; end;
  perform set_config('app.p05.force_projection_failure', 'off', false);
  if (select count(*) from public.workout_structures_v2 where idempotency_key = '80000000-0000-0000-0000-000000000311') <> 0 then raise exception 'projection failure did not rollback structure'; end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
do $$ begin
  begin perform 1 from public.workout_structures_v2; raise exception 'direct table select accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role; reset all;
select 'workout-structures-v2 SQL tests passed' as result;
