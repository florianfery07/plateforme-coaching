-- P05.D: one atomic parent + canonical structure creation command for the builder.
create or replace function public.create_structured_workout_library_v2(
  p_title text, p_category text, p_subcategory text, p_description text,
  p_expected_rpe_global numeric, p_expected_rpe_specific numeric,
  p_document jsonb, p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_total integer; v_specific integer; v_library public.workout_library%rowtype; v_structure public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_library_authorized_v2();
  if p_idempotency_key is null or coalesce(length(trim(p_title)),0) = 0 or coalesce(length(trim(p_title)),0) > 300 or coalesce(length(trim(p_category)),0) = 0 or coalesce(length(p_description),0) > 5000 or (p_expected_rpe_global is not null and p_expected_rpe_global not between 1 and 10) or (p_expected_rpe_specific is not null and p_expected_rpe_specific not between 1 and 10) then raise exception 'workout_structure_validation_failed'; end if;
  select * into v_structure from public.workout_structures_v2 where created_by_user_id = auth.uid() and idempotency_key = p_idempotency_key for update;
  if found then
    select * into v_library from public.workout_library where id = v_structure.library_workout_id;
    return jsonb_build_object('libraryWorkoutId', v_library.id, 'structureId', v_structure.id, 'revision', v_structure.revision, 'changed', false, 'totalDurationSeconds', v_structure.total_duration_seconds, 'specificDurationSeconds', v_structure.specific_duration_seconds);
  end if;
  select total_duration_seconds, specific_duration_seconds into v_total, v_specific from access_control.workout_structure_metrics_v2(p_document);
  insert into public.workout_library (title, category, subcategory, description, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific)
  values (trim(p_title), trim(p_category), nullif(trim(coalesce(p_subcategory,'')),''), coalesce(p_description,''), access_control.format_legacy_duration_v2(v_total), p_expected_rpe_global::text, p_expected_rpe_global, case when v_specific=0 then '' else access_control.format_legacy_duration_v2(v_specific) end, case when v_specific=0 then null else p_expected_rpe_specific end) returning * into v_library;
  insert into public.workout_structures_v2 (library_workout_id, schema_version, document, total_duration_seconds, specific_duration_seconds, revision, idempotency_key, created_by_user_id)
  values (v_library.id, 1, p_document, v_total, v_specific, 1, p_idempotency_key, auth.uid()) returning * into v_structure;
  return jsonb_build_object('libraryWorkoutId', v_library.id, 'structureId', v_structure.id, 'revision', 1, 'changed', true, 'totalDurationSeconds', v_total, 'specificDurationSeconds', v_specific);
end; $$;
revoke all on function public.create_structured_workout_library_v2(text,text,text,text,numeric,numeric,jsonb,uuid) from public, anon;
grant execute on function public.create_structured_workout_library_v2(text,text,text,text,numeric,numeric,jsonb,uuid) to authenticated;
comment on function public.create_structured_workout_library_v2(text,text,text,text,numeric,numeric,jsonb,uuid) is 'P05.D builder command: creates library metadata and its first canonical structure in one authorized transaction.';

create or replace function public.get_workout_library_structure_v2(p_library_workout_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, access_control as $$
declare v_structure public.workout_structures_v2%rowtype;
begin
  perform access_control.assert_workout_structure_library_authorized_v2();
  select * into v_structure from public.workout_structures_v2 where library_workout_id = p_library_workout_id and is_current;
  if not found then return null; end if;
  return jsonb_build_object('structureId',v_structure.id,'revision',v_structure.revision,'document',v_structure.document,'totalDurationSeconds',v_structure.total_duration_seconds,'specificDurationSeconds',v_structure.specific_duration_seconds);
end; $$;
revoke all on function public.get_workout_library_structure_v2(uuid) from public, anon;
grant execute on function public.get_workout_library_structure_v2(uuid) to authenticated;
