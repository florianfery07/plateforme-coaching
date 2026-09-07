-- P05.E local proof: atomic scheduling, independent snapshots and role-scoped reads.
do $$ begin
  set local role anon;
  begin
    perform public.create_structured_calendar_workout_v2(
      '10000000-0000-0000-0000-000000000301', '2026-09-10', null, 'Anon', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"a","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000321'
    );
    raise exception 'anon accepted';
  exception when insufficient_privilege then null; end;
end $$;

do $$ declare v_result jsonb; v_calendar uuid; v_source uuid; begin

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  v_result := public.create_structured_calendar_workout_v2(
    '10000000-0000-0000-0000-000000000301', '2026-09-10', null, 'VO2 calendrier', 'Route', 'VO2', 'Rester régulier.', 7, 8,
    '{"schemaVersion":1,"blocks":[{"id":"warmup","kind":"warmup","durationSeconds":600,"isSpecific":false},{"id":"repeat","kind":"repeat","repetitions":2,"steps":[{"id":"effort","kind":"effort","durationSeconds":240,"isSpecific":true,"intensity":{"zone":"Z5"}},{"id":"recovery","kind":"recovery","durationSeconds":120,"isSpecific":false}]}]}'::jsonb,
    '80000000-0000-0000-0000-000000000322'
  );
  v_calendar := (v_result->>'calendarWorkoutId')::uuid;
  if v_result->>'changed' <> 'true' or v_result->>'totalDurationSeconds' <> '1320' or v_result->>'specificDurationSeconds' <> '480'
    or (select count(*) from public.calendar_workouts where id = v_calendar and structured_workout_v2) <> 1
    or (select blocks from public.calendar_workouts where id = v_calendar) <> '[]'::jsonb then
    raise exception 'direct structured schedule was not atomic or changed legacy blocks';
  end if;
  if (public.create_structured_calendar_workout_v2(
    '10000000-0000-0000-0000-000000000301', '2026-09-10', null, 'ignored', 'Route', '', '', null, null,
    '{"schemaVersion":1,"blocks":[{"id":"ignored","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
    '80000000-0000-0000-0000-000000000322'
  )->>'changed') <> 'false' or (select count(*) from public.calendar_workouts where structured_workout_v2) <> 1 then
    raise exception 'schedule idempotence failed';
  end if;

  v_source := (select id from public.workout_structures_v2 where library_workout_id = '70000000-0000-0000-0000-000000000301' and is_current);
  v_result := public.create_structured_calendar_workout_v2(
    '10000000-0000-0000-0000-000000000301', '2026-09-11', '70000000-0000-0000-0000-000000000301', '', '', '', '', null, null, null,
    '80000000-0000-0000-0000-000000000323'
  );
  if (select source_structure_id from public.workout_structures_v2 where id = (v_result->>'structureId')::uuid) <> v_source then
    raise exception 'library schedule did not retain exact source revision';
  end if;
  v_result := public.update_structured_calendar_workout_v2(
    v_calendar, 'VO2 calendrier modifiée', 'Route', 'VO2', 'Nouvelle consigne.', 6, null,
    '{"schemaVersion":1,"blocks":[{"id":"free","kind":"free","durationSeconds":900,"isSpecific":false}]}'::jsonb,
    1, '80000000-0000-0000-0000-000000000324'
  );
  if v_result->>'revision' <> '2' or (select title from public.calendar_workouts where id = v_calendar) <> 'VO2 calendrier modifiée'
    or (select count(*) from public.workout_structures_v2 where calendar_workout_id = v_calendar and is_current) <> 1 then
    raise exception 'calendar snapshot update failed';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000304', false);
  if (public.get_calendar_workout_structure_v2(v_calendar)->>'revision') <> '2' then raise exception 'own athlete cannot read snapshot'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', false);
  begin perform public.get_calendar_workout_structure_v2(v_calendar); raise exception 'unmanaged coach read snapshot'; exception when others then if sqlerrm <> 'workout_structure_permission_denied' then raise; end if; end;
end $$;

-- A snapshot failure must roll back its parent calendar row in the same RPC transaction.
create or replace function public.p05e_test_snapshot_failure() returns trigger language plpgsql as $$
begin
  if current_setting('app.p05e.force_snapshot_failure', true) = 'on' and new.calendar_workout_id is not null then
    raise exception 'p05e_test_snapshot_failure';
  end if;
  return new;
end; $$;
create trigger p05e_test_snapshot_failure
  before insert on public.workout_structures_v2
  for each row execute function public.p05e_test_snapshot_failure();

do $$ begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  perform set_config('app.p05e.force_snapshot_failure', 'on', false);
  begin
    perform public.create_structured_calendar_workout_v2(
      '10000000-0000-0000-0000-000000000301', '2026-09-12', null, 'Rollback calendrier', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"rollback","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000325'
    );
    raise exception 'snapshot failure accepted';
  exception when others then
    if sqlerrm <> 'p05e_test_snapshot_failure' then raise; end if;
  end;
  perform set_config('app.p05e.force_snapshot_failure', 'off', false);
  if exists (select 1 from public.calendar_workouts where title = 'Rollback calendrier') then
    raise exception 'calendar parent survived a failed snapshot';
  end if;
end $$;

do $$ begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', false);
  update public.athletes set active = false where id = '10000000-0000-0000-0000-000000000301';
  begin
    perform public.create_structured_calendar_workout_v2(
      '10000000-0000-0000-0000-000000000301', '2026-09-13', null, 'Athlète archivé', 'Route', '', '', null, null,
      '{"schemaVersion":1,"blocks":[{"id":"archived","kind":"free","durationSeconds":60,"isSpecific":false}]}'::jsonb,
      '80000000-0000-0000-0000-000000000326'
    );
    raise exception 'archived athlete accepted';
  exception when others then
    if sqlerrm <> 'workout_structure_target_unavailable' then raise; end if;
  end;
  update public.athletes set active = true where id = '10000000-0000-0000-0000-000000000301';
end $$;

do $$ declare v_function regprocedure; begin
  foreach v_function in array array[
    'public.create_structured_calendar_workout_v2(uuid,text,uuid,text,text,text,text,numeric,numeric,jsonb,uuid)'::regprocedure,
    'public.get_calendar_workout_structure_v2(uuid)'::regprocedure,
    'public.update_structured_calendar_workout_v2(uuid,text,text,text,text,numeric,numeric,jsonb,integer,uuid)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'execute') or not has_function_privilege('authenticated', v_function, 'execute') then raise exception 'unexpected RPC privilege: %', v_function; end if;
    if not exists (select 1 from pg_proc where oid = v_function and proconfig @> array['search_path=pg_catalog, public, access_control']) then raise exception 'unlocked search path: %', v_function; end if;
  end loop;
end $$;

select 'structured-calendar-workouts-v2 SQL tests passed' as result;
