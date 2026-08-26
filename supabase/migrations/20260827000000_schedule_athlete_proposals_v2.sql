-- L15c: additive, pilot-only scheduling of one athlete proposal into one legacy workout.
-- The relation is nullable so historical legacy rows remain untouched.

alter table public.calendar_workouts
  add column if not exists source_proposal_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_workouts_source_proposal_id_fkey'
      and conrelid = 'public.calendar_workouts'::regclass
  ) then
    alter table public.calendar_workouts
      add constraint calendar_workouts_source_proposal_id_fkey
      foreign key (source_proposal_id)
      references public.athlete_proposals (id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists calendar_workouts_source_proposal_id_unique
  on public.calendar_workouts (source_proposal_id)
  where source_proposal_id is not null;

create or replace function public.schedule_athlete_proposal_v2(
  p_proposal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_proposal public.athlete_proposals%rowtype;
  v_workout public.calendar_workouts%rowtype;
  v_athlete_membership_id uuid;
  v_link_count integer;
  v_athlete_active boolean;
  v_is_rest_request boolean;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'proposal_schedule_permission_denied';
  end if;

  if p_proposal_id is null then
    raise exception 'proposal_schedule_validation_failed';
  end if;

  select *
  into v_proposal
  from public.athlete_proposals proposal
  where proposal.id = p_proposal_id
  for update;

  if not found
    or v_proposal.athlete_id is null
    or v_proposal.date is null then
    raise exception 'proposal_schedule_target_unavailable';
  end if;

  select athlete.active
  into v_athlete_active
  from public.athletes athlete
  where athlete.id = v_proposal.athlete_id
  for update;

  if not found or v_athlete_active is false then
    raise exception 'proposal_schedule_target_unavailable';
  end if;

  select count(*)
  into v_link_count
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = v_proposal.athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if v_link_count <> 1 then
    raise exception 'proposal_schedule_target_unavailable';
  end if;

  select link.athlete_membership_id
  into v_athlete_membership_id
  from access_control.legacy_athlete_links link
  join access_control.organization_memberships membership
    on membership.id = link.athlete_membership_id
   and membership.organization_id = link.organization_id
  where link.legacy_athlete_id = v_proposal.athlete_id
    and link.status = 'active'
    and membership.role = 'athlete'
    and membership.status = 'active';

  if not access_control.current_user_can_manage_athlete(v_athlete_membership_id) then
    raise exception 'proposal_schedule_permission_denied';
  end if;

  select *
  into v_workout
  from public.calendar_workouts workout
  where workout.source_proposal_id = v_proposal.id;

  if found then
    if v_proposal.status <> 'Programmée' then
      raise exception 'proposal_schedule_state_conflict';
    end if;

    return jsonb_build_object(
      'proposalId', v_proposal.id,
      'status', 'Programmée',
      'created', false,
      'workout', to_jsonb(v_workout)
    );
  end if;

  if v_proposal.status = 'Programmée' then
    raise exception 'proposal_schedule_legacy_ambiguous';
  end if;

  if v_proposal.status <> 'À traiter' then
    raise exception 'proposal_schedule_invalid_state';
  end if;

  v_is_rest_request := lower(trim(coalesce(v_proposal.type, ''))) like '%indisponibilité%'
    or lower(trim(coalesce(v_proposal.type, ''))) like '%repos%';

  if v_is_rest_request then
    insert into public.calendar_workouts (
      athlete_id,
      date,
      workout_type,
      subcategory,
      title,
      duration,
      expected_rpe,
      expected_rpe_global,
      expected_specific_duration,
      expected_rpe_specific,
      description,
      blocks,
      athlete_seen_at,
      completed,
      non_done,
      source_proposal_id
    ) values (
      v_proposal.athlete_id,
      v_proposal.date,
      'Repos',
      '',
      'Repos',
      '',
      null,
      null,
      '',
      null,
      coalesce(v_proposal.message, 'Repos demandé par l’athlète.'),
      '[]'::jsonb,
      null,
      true,
      false,
      v_proposal.id
    ) returning * into v_workout;
  else
    insert into public.calendar_workouts (
      athlete_id,
      date,
      workout_type,
      subcategory,
      title,
      duration,
      expected_rpe,
      expected_rpe_global,
      expected_specific_duration,
      expected_rpe_specific,
      description,
      blocks,
      athlete_seen_at,
      completed,
      source_proposal_id
    ) values (
      v_proposal.athlete_id,
      v_proposal.date,
      'Proposition athlète',
      coalesce(v_proposal.type, ''),
      coalesce(nullif(v_proposal.title, ''), v_proposal.type),
      '',
      null,
      null,
      '',
      null,
      coalesce(v_proposal.message, 'Proposition validée par le coach.'),
      '[]'::jsonb,
      null,
      false,
      v_proposal.id
    ) returning * into v_workout;
  end if;

  update public.athlete_proposals
  set status = 'Programmée'
  where id = v_proposal.id;

  return jsonb_build_object(
    'proposalId', v_proposal.id,
    'status', 'Programmée',
    'created', true,
    'workout', to_jsonb(v_workout)
  );
end;
$$;

revoke all on function public.schedule_athlete_proposal_v2(uuid) from public, anon;
grant execute on function public.schedule_athlete_proposal_v2(uuid) to authenticated;

comment on function public.schedule_athlete_proposal_v2(uuid) is
  'L15c atomic proposal scheduling: one authorized proposal produces at most one linked legacy workout and a scheduled status in one transaction.';
