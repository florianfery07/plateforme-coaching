-- L15d: additive, pilot-only atomic legacy workout taxonomy operations.
-- Taxonomy links remain text-based in this lot; a future normalization is separate.

create or replace function public.rename_workout_category_v2(
  p_category_id uuid,
  p_new_name text,
  p_new_color text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_category public.workout_categories%rowtype;
  v_new_name text;
  v_updated_workout_count integer := 0;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot()
    or not exists (
      select 1
      from access_control.organization_memberships membership
      where membership.user_id = auth.uid()
        and membership.role = 'coach'
        and membership.status = 'active'
    ) then
    raise exception 'workout_taxonomy_permission_denied';
  end if;

  v_new_name := nullif(btrim(p_new_name), '');
  if p_category_id is null or v_new_name is null then
    raise exception 'workout_taxonomy_validation_failed';
  end if;

  select *
  into v_category
  from public.workout_categories category
  where category.id = p_category_id
  for update;

  if not found then
    raise exception 'workout_taxonomy_target_unavailable';
  end if;

  if v_category.name = v_new_name
    and (p_new_color is null or v_category.color is not distinct from p_new_color) then
    return jsonb_build_object(
      'kind', 'category',
      'taxonomyId', v_category.id,
      'name', v_category.name,
      'color', v_category.color,
      'changed', false,
      'updatedWorkoutCount', 0
    );
  end if;

  perform 1
  from public.workout_library workout
  where workout.category = v_category.name
  for update;

  update public.workout_categories
  set name = v_new_name,
      color = coalesce(p_new_color, color)
  where id = v_category.id;

  if v_category.name <> v_new_name then
    with updated_workouts as (
      update public.workout_library
      set category = v_new_name
      where category = v_category.name
      returning id
    )
    select count(*) into v_updated_workout_count from updated_workouts;
  end if;

  return jsonb_build_object(
    'kind', 'category',
    'taxonomyId', v_category.id,
    'name', v_new_name,
    'color', coalesce(p_new_color, v_category.color),
    'changed', true,
    'updatedWorkoutCount', v_updated_workout_count
  );
end;
$$;

create or replace function public.rename_workout_subcategory_v2(
  p_subcategory_id uuid,
  p_new_name text,
  p_new_color text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_subcategory public.workout_subcategories%rowtype;
  v_new_name text;
  v_updated_workout_count integer := 0;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot()
    or not exists (
      select 1
      from access_control.organization_memberships membership
      where membership.user_id = auth.uid()
        and membership.role = 'coach'
        and membership.status = 'active'
    ) then
    raise exception 'workout_taxonomy_permission_denied';
  end if;

  v_new_name := nullif(btrim(p_new_name), '');
  if p_subcategory_id is null or v_new_name is null then
    raise exception 'workout_taxonomy_validation_failed';
  end if;

  select *
  into v_subcategory
  from public.workout_subcategories subcategory
  where subcategory.id = p_subcategory_id
  for update;

  if not found then
    raise exception 'workout_taxonomy_target_unavailable';
  end if;

  if v_subcategory.name = v_new_name
    and (p_new_color is null or v_subcategory.color is not distinct from p_new_color) then
    return jsonb_build_object(
      'kind', 'subcategory',
      'taxonomyId', v_subcategory.id,
      'name', v_subcategory.name,
      'color', v_subcategory.color,
      'changed', false,
      'updatedWorkoutCount', 0
    );
  end if;

  perform 1
  from public.workout_library workout
  where workout.subcategory = v_subcategory.name
  for update;

  update public.workout_subcategories
  set name = v_new_name,
      color = coalesce(p_new_color, color)
  where id = v_subcategory.id;

  if v_subcategory.name <> v_new_name then
    with updated_workouts as (
      update public.workout_library
      set subcategory = v_new_name
      where subcategory = v_subcategory.name
      returning id
    )
    select count(*) into v_updated_workout_count from updated_workouts;
  end if;

  return jsonb_build_object(
    'kind', 'subcategory',
    'taxonomyId', v_subcategory.id,
    'name', v_new_name,
    'color', coalesce(p_new_color, v_subcategory.color),
    'changed', true,
    'updatedWorkoutCount', v_updated_workout_count
  );
end;
$$;

create or replace function public.delete_workout_category_v2(
  p_category_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_category_name text;
  v_deleted_workout_count integer := 0;
  v_deleted_taxonomy_count integer := 0;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot()
    or not exists (
      select 1
      from access_control.organization_memberships membership
      where membership.user_id = auth.uid()
        and membership.role = 'coach'
        and membership.status = 'active'
    ) then
    raise exception 'workout_taxonomy_permission_denied';
  end if;

  v_category_name := nullif(btrim(p_category_name), '');
  if v_category_name is null then
    raise exception 'workout_taxonomy_validation_failed';
  end if;

  perform 1
  from public.workout_categories category
  where category.name = v_category_name
  for update;

  if not found then
    return jsonb_build_object(
      'kind', 'category',
      'name', v_category_name,
      'changed', false,
      'deletedWorkoutCount', 0,
      'deletedTaxonomyCount', 0
    );
  end if;

  perform 1
  from public.workout_library workout
  where workout.category = v_category_name
  for update;

  with deleted_workouts as (
    delete from public.workout_library
    where category = v_category_name
    returning id
  )
  select count(*) into v_deleted_workout_count from deleted_workouts;

  with deleted_categories as (
    delete from public.workout_categories
    where name = v_category_name
    returning id
  )
  select count(*) into v_deleted_taxonomy_count from deleted_categories;

  return jsonb_build_object(
    'kind', 'category',
    'name', v_category_name,
    'changed', true,
    'deletedWorkoutCount', v_deleted_workout_count,
    'deletedTaxonomyCount', v_deleted_taxonomy_count
  );
end;
$$;

create or replace function public.delete_workout_subcategory_v2(
  p_subcategory_name text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_subcategory_name text;
  v_deleted_workout_count integer := 0;
  v_deleted_taxonomy_count integer := 0;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot()
    or not exists (
      select 1
      from access_control.organization_memberships membership
      where membership.user_id = auth.uid()
        and membership.role = 'coach'
        and membership.status = 'active'
    ) then
    raise exception 'workout_taxonomy_permission_denied';
  end if;

  v_subcategory_name := nullif(btrim(p_subcategory_name), '');
  if v_subcategory_name is null then
    raise exception 'workout_taxonomy_validation_failed';
  end if;

  perform 1
  from public.workout_subcategories subcategory
  where subcategory.name = v_subcategory_name
  for update;

  if not found then
    return jsonb_build_object(
      'kind', 'subcategory',
      'name', v_subcategory_name,
      'changed', false,
      'deletedWorkoutCount', 0,
      'deletedTaxonomyCount', 0
    );
  end if;

  perform 1
  from public.workout_library workout
  where workout.subcategory = v_subcategory_name
  for update;

  with deleted_workouts as (
    delete from public.workout_library
    where subcategory = v_subcategory_name
    returning id
  )
  select count(*) into v_deleted_workout_count from deleted_workouts;

  with deleted_subcategories as (
    delete from public.workout_subcategories
    where name = v_subcategory_name
    returning id
  )
  select count(*) into v_deleted_taxonomy_count from deleted_subcategories;

  return jsonb_build_object(
    'kind', 'subcategory',
    'name', v_subcategory_name,
    'changed', true,
    'deletedWorkoutCount', v_deleted_workout_count,
    'deletedTaxonomyCount', v_deleted_taxonomy_count
  );
end;
$$;

revoke all on function public.rename_workout_category_v2(uuid, text, text) from public, anon;
revoke all on function public.rename_workout_subcategory_v2(uuid, text, text) from public, anon;
revoke all on function public.delete_workout_category_v2(text) from public, anon;
revoke all on function public.delete_workout_subcategory_v2(text) from public, anon;
grant execute on function public.rename_workout_category_v2(uuid, text, text) to authenticated;
grant execute on function public.rename_workout_subcategory_v2(uuid, text, text) to authenticated;
grant execute on function public.delete_workout_category_v2(text) to authenticated;
grant execute on function public.delete_workout_subcategory_v2(text) to authenticated;

comment on function public.rename_workout_category_v2(uuid, text, text) is
  'L15d atomic category rename and workout-library propagation. Taxonomy remains text-linked in this pilot.';
comment on function public.rename_workout_subcategory_v2(uuid, text, text) is
  'L15d atomic subcategory rename and workout-library propagation. Taxonomy remains text-linked in this pilot.';
comment on function public.delete_workout_category_v2(text) is
  'L15d atomic category deletion with its text-linked workout-library rows.';
comment on function public.delete_workout_subcategory_v2(text) is
  'L15d atomic subcategory deletion with its text-linked workout-library rows.';
