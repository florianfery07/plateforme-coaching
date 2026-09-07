-- P05.D: builder creation/read proof. All rows live only in the isolated Docker database.
create or replace function public.p05_test_library_create_failure() returns trigger language plpgsql as $$
begin
  if current_setting('app.p05.force_library_create_failure', true) = 'on' then raise exception 'p05_test_library_create_failure'; end if;
  return new;
end; $$;
create trigger p05_test_library_create_failure before insert on public.workout_structures_v2 for each row execute function public.p05_test_library_create_failure();

do $$ declare v_function regprocedure; begin
  foreach v_function in array array[
    'public.create_structured_workout_library_v2(text,text,text,text,numeric,numeric,jsonb,uuid)'::regprocedure,
    'public.get_workout_library_structure_v2(uuid)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'execute') or not has_function_privilege('authenticated', v_function, 'execute') then raise exception 'unexpected RPC privilege: %', v_function; end if;
    if not exists (select 1 from pg_proc where oid = v_function and proconfig @> array['search_path=pg_catalog, public, access_control']) then raise exception 'unlocked search_path: %', v_function; end if;
  end loop;
end $$;

do $$ begin
  set local role anon;
  begin perform public.create_structured_workout_library_v2('Anon', 'Route', '', '', null, null, '{"schemaVersion":1,"blocks":[{"id":"anon","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb, '80000000-0000-0000-0000-000000000401'); raise exception 'anon accepted'; exception when insufficient_privilege then null; end;
end $$;

do $$ declare v_created jsonb; v_read jsonb; v_count integer; begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform public.create_structured_workout_library_v2('No auth', 'Route', '', '', null, null, '{"schemaVersion":1,"blocks":[{"id":"unauth","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb, '80000000-0000-0000-0000-000000000402'); raise exception 'unauth accepted'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000303', false);
  begin perform public.create_structured_workout_library_v2('Not pilot', 'Route', '', '', null, null, '{"schemaVersion":1,"blocks":[{"id":"not-pilot","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb, '80000000-0000-0000-0000-000000000403'); raise exception 'non-pilot accepted'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  v_created := public.create_structured_workout_library_v2('P05 V2 VO2', 'Route', 'VO2', 'Synthétique', 7, 8, '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"set","kind":"repeat","repetitions":3,"steps":[{"id":"effort","kind":"effort","durationSeconds":180,"isSpecific":true,"intensity":{"zone":"Z5","targetRpe":8}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}'::jsonb, '80000000-0000-0000-0000-000000000404');
  if v_created->>'changed' <> 'true' or v_created->>'revision' <> '1' or v_created->>'totalDurationSeconds' <> '1500' or v_created->>'specificDurationSeconds' <> '540' then raise exception 'creation projection invalid: %', v_created; end if;
  v_read := public.get_workout_library_structure_v2((v_created->>'libraryWorkoutId')::uuid);
  if v_read->>'structureId' <> v_created->>'structureId' or v_read->'document'->'blocks'->0->>'id' <> 'warmup' then raise exception 'read did not return canonical document'; end if;
  if (public.create_structured_workout_library_v2('P05 V2 VO2', 'Route', 'VO2', 'Synthétique', 7, 8, '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"set","kind":"repeat","repetitions":3,"steps":[{"id":"effort","kind":"effort","durationSeconds":180,"isSpecific":true,"intensity":{"zone":"Z5","targetRpe":8}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}'::jsonb, '80000000-0000-0000-0000-000000000404')->>'changed') <> 'false' then raise exception 'creation idempotence failed'; end if;
  select count(*) into v_count from public.workout_structures_v2 where library_workout_id = (v_created->>'libraryWorkoutId')::uuid;
  if v_count <> 1 then raise exception 'idempotent create made % structures', v_count; end if;
  perform set_config('app.p05.force_library_create_failure', 'on', false);
  begin perform public.create_structured_workout_library_v2('Rollback', 'Route', '', '', null, null, '{"schemaVersion":1,"blocks":[{"id":"rollback","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb, '80000000-0000-0000-0000-000000000405'); raise exception 'forced insert accepted'; exception when others then if sqlerrm <> 'p05_test_library_create_failure' then raise; end if; end;
  perform set_config('app.p05.force_library_create_failure', 'off', false);
  if exists (select 1 from public.workout_library where title = 'Rollback') or exists (select 1 from public.workout_structures_v2 where idempotency_key = '80000000-0000-0000-0000-000000000405') then raise exception 'atomic create did not rollback'; end if;
end $$;

select 'structured-workout-library-v2 SQL tests passed' as result;
