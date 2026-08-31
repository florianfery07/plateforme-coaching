-- L16c: targeted read projection for the Goals V2 pilot UI.
-- It is additive and read-only: legacy goal columns remain untouched.

create or replace function public.get_athlete_goal_state_v2(p_legacy_athlete_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, access_control
as $$
declare
  v_target_count integer;
  v_organization_id uuid;
  v_athlete_membership_id uuid;
  v_current jsonb;
  v_open_request jsonb;
  v_history jsonb;
begin
  if auth.uid() is null
    or not access_control.current_account_is_active()
    or not access_control.current_user_is_pilot() then
    raise exception 'athlete_goal_permission_denied';
  end if;

  if p_legacy_athlete_id is null then
    raise exception 'athlete_goal_validation_failed';
  end if;

  select count(*) into v_target_count
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;
  if v_target_count <> 1 then
    raise exception 'athlete_goal_target_unavailable';
  end if;

  select target.organization_id, target.athlete_membership_id
  into v_organization_id, v_athlete_membership_id
  from access_control.resolve_active_goal_target_v2(p_legacy_athlete_id) target;

  if not access_control.current_user_can_access_athlete(v_athlete_membership_id) then
    raise exception 'athlete_goal_permission_denied';
  end if;

  select jsonb_build_object(
    'versionId', version.id,
    'requestId', request.id,
    'revisionNumber', version.revision_number,
    'source', version.source,
    'shortGoal', version.short_goal,
    'mediumGoal', version.medium_goal,
    'longGoal', version.long_goal,
    'acceptedAt', version.reviewed_at
  ) into v_current
  from public.athlete_goal_versions_v2 version
  join public.athlete_goal_requests_v2 request on request.id = version.request_id
  where request.organization_id = v_organization_id
    and request.athlete_membership_id = v_athlete_membership_id
    and version.review_outcome = 'accepted'
  order by version.reviewed_at desc, version.revision_number desc
  limit 1;

  select jsonb_build_object(
    'requestId', request.id,
    'status', request.status,
    'reviewNote', request.review_note,
    'requestedAt', request.created_at,
    'updatedAt', request.updated_at,
    'latestVersion', latest.version
  ) into v_open_request
  from public.athlete_goal_requests_v2 request
  left join lateral (
    select jsonb_build_object(
      'versionId', version.id,
      'requestId', request.id,
      'requestStatus', request.status,
      'revisionNumber', version.revision_number,
      'source', version.source,
      'shortGoal', version.short_goal,
      'mediumGoal', version.medium_goal,
      'longGoal', version.long_goal,
      'submittedAt', version.submitted_at,
      'reviewOutcome', version.review_outcome,
      'reviewedAt', version.reviewed_at,
      'reviewNote', version.review_note
    ) as version
    from public.athlete_goal_versions_v2 version
    where version.request_id = request.id
    order by version.revision_number desc
    limit 1
  ) latest on true
  where request.organization_id = v_organization_id
    and request.athlete_membership_id = v_athlete_membership_id
    and request.status in ('requested', 'submitted', 'changes_requested')
  order by request.created_at desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'versionId', version.id,
    'requestId', request.id,
    'requestStatus', request.status,
    'revisionNumber', version.revision_number,
    'source', version.source,
    'shortGoal', version.short_goal,
    'mediumGoal', version.medium_goal,
    'longGoal', version.long_goal,
    'submittedAt', version.submitted_at,
    'reviewOutcome', version.review_outcome,
    'reviewedAt', version.reviewed_at,
    'reviewNote', version.review_note
  ) order by request.created_at desc, version.revision_number desc), '[]'::jsonb)
  into v_history
  from public.athlete_goal_versions_v2 version
  join public.athlete_goal_requests_v2 request on request.id = version.request_id
  where request.organization_id = v_organization_id
    and request.athlete_membership_id = v_athlete_membership_id;

  return jsonb_build_object(
    'legacyAthleteId', p_legacy_athlete_id,
    'current', v_current,
    'openRequest', v_open_request,
    'history', v_history
  );
end;
$$;

revoke all on function public.get_athlete_goal_state_v2(uuid) from public, anon;
grant execute on function public.get_athlete_goal_state_v2(uuid) to authenticated;

comment on function public.get_athlete_goal_state_v2(uuid) is
  'L16c read-only Goals V2 UI projection: current goal, one open request and immutable history in one authorized call.';
