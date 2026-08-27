-- L15d SQL proof for atomic, idempotent workout taxonomy commands.

do $$
declare
  v_function regprocedure;
begin
  foreach v_function in array array[
    'public.rename_workout_category_v2(uuid,text,text)'::regprocedure,
    'public.rename_workout_subcategory_v2(uuid,text,text)'::regprocedure,
    'public.delete_workout_category_v2(text)'::regprocedure,
    'public.delete_workout_subcategory_v2(text)'::regprocedure
  ] loop
    if has_function_privilege('anon', v_function, 'execute') then
      raise exception 'anon must not execute %', v_function;
    end if;
    if not has_function_privilege('authenticated', v_function, 'execute') then
      raise exception 'authenticated must execute %', v_function;
    end if;
    if not exists (
      select 1 from pg_proc procedure
      where procedure.oid = v_function
        and procedure.proconfig @> array['search_path=pg_catalog, public, access_control']
    ) then
      raise exception 'taxonomy RPC must lock its search_path: %', v_function;
    end if;
  end loop;
end;
$$;

do $$
begin
  set local role anon;
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', null);
    raise exception 'anon must be refused before taxonomy execution';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', null);
    raise exception 'unauthenticated user must be refused';
  exception when others then
    if sqlerrm <> 'workout_taxonomy_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000172', false);
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', null);
    raise exception 'non-pilot must be refused';
  exception when others then
    if sqlerrm <> 'workout_taxonomy_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000173', false);
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', null);
    raise exception 'inactive account must be refused';
  exception when others then
    if sqlerrm <> 'workout_taxonomy_permission_denied' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000174', false);
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', null);
    raise exception 'non-coach must be refused';
  exception when others then
    if sqlerrm <> 'workout_taxonomy_permission_denied' then raise; end if;
  end;
end;
$$;

do $$
declare
  v_result jsonb;
  v_calendar_before integer;
  v_groups_before integer;
  v_invites_before integer;
  v_lifecycle_before integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000171', false);
  select count(*) into v_calendar_before from public.calendar_workouts;
  select count(*) into v_groups_before from public.group_sessions_v2;
  select count(*) into v_invites_before from access_control.athlete_invites;
  select count(*) into v_lifecycle_before from access_control.athlete_lifecycle_events_v2;

  v_result := public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', 'bg-indigo-500');
  if v_result->>'kind' <> 'category'
    or v_result->>'name' <> 'Route V2'
    or v_result->>'color' <> 'bg-indigo-500'
    or v_result->>'changed' <> 'true'
    or v_result->>'updatedWorkoutCount' <> '2'
    or (select name from public.workout_categories where id = '71000000-0000-0000-0000-000000000171') <> 'Route V2'
    or (select count(*) from public.workout_library where category = 'Route V2') <> 2
    or (select count(*) from public.workout_library where category = 'Route') <> 0 then
    raise exception 'category rename must atomically propagate to workout library';
  end if;

  v_result := public.rename_workout_subcategory_v2('72000000-0000-0000-0000-000000000171', 'Endurance V2', 'bg-amber-500');
  if v_result->>'kind' <> 'subcategory'
    or v_result->>'name' <> 'Endurance V2'
    or v_result->>'updatedWorkoutCount' <> '4'
    or (select count(*) from public.workout_library where subcategory = 'Endurance V2') <> 4
    or (select count(*) from public.workout_library where subcategory = 'Endurance') <> 0 then
    raise exception 'subcategory rename must atomically propagate to workout library';
  end if;

  v_result := public.rename_workout_category_v2('71000000-0000-0000-0000-000000000171', 'Route V2', 'bg-indigo-500');
  if v_result->>'changed' <> 'false' or v_result->>'updatedWorkoutCount' <> '0' then
    raise exception 'repeated taxonomy rename must be idempotent';
  end if;

  if (select count(*) from public.calendar_workouts) <> v_calendar_before
    or (select count(*) from public.group_sessions_v2) <> v_groups_before
    or (select count(*) from access_control.athlete_invites) <> v_invites_before
    or (select count(*) from access_control.athlete_lifecycle_events_v2) <> v_lifecycle_before then
    raise exception 'taxonomy commands must not write calendar, Groups V2, invitations, or lifecycle';
  end if;
end;
$$;

do $$
declare
  v_result jsonb;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000171', false);
  perform set_config('app.l15d.force_library_failure', 'on', false);
  begin
    perform public.rename_workout_category_v2('71000000-0000-0000-0000-000000000173', 'Catégorie rollback', null);
    raise exception 'library failure must abort the category rename';
  exception when others then
    if sqlerrm <> 'l15d_test_library_failure' then raise; end if;
  end;
  perform set_config('app.l15d.force_library_failure', 'off', false);
  if (select name from public.workout_categories where id = '71000000-0000-0000-0000-000000000173') <> 'Catégorie fragile'
    or (select category from public.workout_library where id = '73000000-0000-0000-0000-000000000174') <> 'Catégorie fragile' then
    raise exception 'library propagation failure must roll back the taxonomy rename';
  end if;

  v_result := public.delete_workout_category_v2('Montagne');
  if v_result->>'changed' <> 'true'
    or v_result->>'deletedWorkoutCount' <> '1'
    or v_result->>'deletedTaxonomyCount' <> '1'
    or exists (select 1 from public.workout_categories where name = 'Montagne')
    or exists (select 1 from public.workout_library where category = 'Montagne') then
    raise exception 'category deletion must atomically remove linked library workouts';
  end if;

  v_result := public.delete_workout_subcategory_v2('Tempo');
  if v_result->>'changed' <> 'true'
    or v_result->>'deletedWorkoutCount' <> '1'
    or exists (select 1 from public.workout_subcategories where name = 'Tempo')
    or exists (select 1 from public.workout_library where subcategory = 'Tempo') then
    raise exception 'subcategory deletion must atomically remove linked library workouts';
  end if;

  v_result := public.delete_workout_category_v2('Montagne');
  if v_result->>'changed' <> 'false'
    or v_result->>'deletedWorkoutCount' <> '0'
    or v_result->>'deletedTaxonomyCount' <> '0' then
    raise exception 'repeated taxonomy deletion must be idempotent';
  end if;

  perform set_config('app.l15d.force_category_delete_failure', 'on', false);
  begin
    perform public.delete_workout_category_v2('Catégorie fragile');
    raise exception 'taxonomy deletion failure must abort the library deletion';
  exception when others then
    if sqlerrm <> 'l15d_test_category_delete_failure' then raise; end if;
  end;
  perform set_config('app.l15d.force_category_delete_failure', 'off', false);
  if not exists (select 1 from public.workout_categories where name = 'Catégorie fragile')
    or not exists (select 1 from public.workout_library where category = 'Catégorie fragile') then
    raise exception 'taxonomy deletion failure must roll back linked workout deletion';
  end if;
end;
$$;
