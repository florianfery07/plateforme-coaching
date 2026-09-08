-- P05.F local evidence: one canonical Groups V2 session and one independent structured snapshot.
do $$ begin
  set local role anon;
  begin
    perform public.create_structured_group_session_v2(
      '20000000-0000-0000-0000-000000000301', date '2026-09-15',
      array['30000000-0000-0000-0000-000000000304'::uuid], null,
      'Anon groupe', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"anon","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000501'
    );
    raise exception 'anon accepted';
  exception when insufficient_privilege then null; end;
end $$;

do $$ begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000303', false);
  begin
    perform public.create_structured_group_session_v2(
      '20000000-0000-0000-0000-000000000301', date '2026-09-15',
      array['30000000-0000-0000-0000-000000000304'::uuid], null,
      'Non pilote', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"non-pilot","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000506'
    );
    raise exception 'non-pilot accepted';
  exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
end $$;

create or replace function public.p05f_test_snapshot_failure() returns trigger language plpgsql as $$
begin
  if current_setting('app.p05f.force_snapshot_failure', true) = 'on' and new.group_session_id is not null then
    raise exception 'p05f_test_snapshot_failure';
  end if;
  return new;
end;
$$;
create trigger p05f_test_snapshot_failure before insert on public.workout_structures_v2
  for each row execute function public.p05f_test_snapshot_failure();

do $$ declare v_before integer; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  select count(*) into v_before from public.group_sessions_v2;
  perform set_config('app.p05f.force_snapshot_failure', 'on', false);
  begin
    perform public.create_structured_group_session_v2(
      '20000000-0000-0000-0000-000000000301', date '2026-09-16',
      array['30000000-0000-0000-0000-000000000304'::uuid], null,
      'Rollback groupe', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"rollback","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000507'
    );
    raise exception 'snapshot failure accepted';
  exception when others then if sqlerrm <> 'p05f_test_snapshot_failure' then raise; end if; end;
  perform set_config('app.p05f.force_snapshot_failure', 'off', false);
  if (select count(*) from public.group_sessions_v2) <> v_before then raise exception 'failed structured snapshot retained a group parent'; end if;
end $$;

do $$
declare v_source jsonb; v_created jsonb; v_session uuid; v_before_document jsonb; v_calendar_count integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  v_source := public.create_structured_workout_library_v2(
    'P05F VO2 groupe', 'Route', 'VO2', 'Fixture locale', 7, 8,
    '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"set","kind":"repeat","repetitions":2,"steps":[{"id":"effort","kind":"effort","durationSeconds":180,"isSpecific":true,"intensity":{"zone":"Z5"}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}'::jsonb,
    '80000000-0000-0000-0000-000000000502'
  );
  select count(*) into v_calendar_count from public.calendar_workouts;
  v_created := public.create_structured_group_session_v2(
    '20000000-0000-0000-0000-000000000301', date '2026-09-15',
    array['30000000-0000-0000-0000-000000000304'::uuid],
    (v_source->>'libraryWorkoutId')::uuid, '', '', '', '', null, null, null,
    '80000000-0000-0000-0000-000000000503'
  );
  v_session := (v_created->>'groupSessionId')::uuid;
  if v_created->>'changed' <> 'true' or v_created->>'totalDurationSeconds' <> '1200'
    or v_created->>'specificDurationSeconds' <> '360'
    or (select count(*) from public.group_sessions_v2 where id = v_session and structured_workout_v2) <> 1
    or (select count(*) from public.group_session_participants_v2 where group_session_id = v_session and assignment_status = 'active') <> 1
    or (select count(*) from public.workout_structures_v2 where group_session_id = v_session and is_current) <> 1
    or (select count(*) from public.calendar_workouts) <> v_calendar_count then
    raise exception 'structured group schedule did not preserve canonical group invariants';
  end if;
  if (public.create_structured_group_session_v2(
    '20000000-0000-0000-0000-000000000301', date '2026-09-15',
    array['30000000-0000-0000-0000-000000000304'::uuid],
    (v_source->>'libraryWorkoutId')::uuid, '', '', '', '', null, null, null,
    '80000000-0000-0000-0000-000000000503'
  )->>'changed') <> 'false' or (select count(*) from public.group_sessions_v2 where structured_workout_v2) <> 1 then
    raise exception 'structured group idempotence failed';
  end if;
  v_before_document := (select document from public.workout_structures_v2 where group_session_id = v_session and is_current);
  perform public.upsert_workout_library_structure_v2(
    (v_source->>'libraryWorkoutId')::uuid,
    '{"schemaVersion":1,"blocks":[{"id":"replacement","kind":"free","durationSeconds":300,"isSpecific":false}]}'::jsonb,
    1, '80000000-0000-0000-0000-000000000504'
  );
  if (select document from public.workout_structures_v2 where group_session_id = v_session and is_current) <> v_before_document then
    raise exception 'library revision mutated group snapshot';
  end if;
  perform public.update_structured_group_session_v2(
    v_session, 'VO2 groupe révisée', 'Route', 'VO2', 'Nouvelle consigne.', 6, null,
    '{"schemaVersion":1,"blocks":[{"id":"new","kind":"free","durationSeconds":900,"isSpecific":false}]}'::jsonb,
    1, 1, '80000000-0000-0000-0000-000000000505'
  );
  if (select title from public.group_sessions_v2 where id = v_session) <> 'VO2 groupe révisée'
    or (select count(*) from public.workout_structures_v2 where group_session_id = v_session and is_current) <> 1
    or (select count(*) from public.workout_structures_v2 where group_session_id = v_session) <> 2 then
    raise exception 'structured group revision failed';
  end if;
  begin
    perform public.update_group_session_v2(v_session, 2, jsonb_build_object('scheduledFor', '2026-09-15', 'title', 'Bypass', 'blocks', '[]'::jsonb));
    raise exception 'generic group update changed structured snapshot';
  exception when others then if sqlerrm <> 'workout_structure_target_requires_structured_update' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000304', false);
  if (public.get_group_session_structure_v2(v_session)->>'revision') <> '2' then raise exception 'assigned athlete cannot read the structured group snapshot'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', false);
  begin perform public.get_group_session_structure_v2(v_session); raise exception 'unmanaged coach read group snapshot'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
end $$;

do $$ begin
  if exists (
    select 1 from public.workout_structures_v2
    where num_nonnulls(library_workout_id, calendar_workout_id, group_session_id) <> 1
  ) then raise exception 'structure target exclusivity failed'; end if;
  if not exists (select 1 from pg_indexes where indexname = 'workout_structures_v2_group_session_current_unique') then
    raise exception 'structured group current index is missing';
  end if;
end $$;

do $$ declare v_function regprocedure; begin
  foreach v_function in array array[
    'public.create_structured_group_session_v2(uuid,date,uuid[],uuid,text,text,text,text,numeric,numeric,jsonb,uuid)'::regprocedure,
    'public.get_group_session_structure_v2(uuid)'::regprocedure,
    'public.update_structured_group_session_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,integer,uuid)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'execute') or not has_function_privilege('authenticated', v_function, 'execute') then raise exception 'unexpected RPC privilege: %', v_function; end if;
    if not exists (select 1 from pg_proc where oid = v_function and proconfig @> array['search_path=pg_catalog, public, access_control, groups_v2']) then raise exception 'unlocked search path: %', v_function; end if;
  end loop;
end $$;

select 'structured-group-sessions-v2 SQL tests passed' as result;
