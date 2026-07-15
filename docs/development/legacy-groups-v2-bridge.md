# Legacy Groups to Groups V2 bridge (L09bis)

## Purpose

L10 was blocked because a legacy group contains `athlete_id` values but Groups V2 requires one organization and active athlete memberships. This bridge makes that correspondence explicit; it does not enable a UI, alter legacy rows, or create a group session.

## Model and contract

`access_control.legacy_group_links` maps one legacy group to one organization. `access_control.legacy_athlete_links` maps one legacy athlete to one active athlete membership within an organization. Both mappings are explicit, verified, reversible by disabling their status, and cannot be inferred from a name or email.

`resolve_legacy_group_bridge_v2(legacyGroupId)` returns either a complete `{ organizationId, coachMembershipId, athleteMembershipIds, confidence: "explicit_verified", readyForGroupsV2: true }` result or a typed error. It requires an authenticated active pilot, an active management membership, active linked athletes, and coach-to-athlete permission for every participant. It writes no legacy row and no Groups V2 row.

## Backfill and rollback

Group links require an approved manual organization decision. Athlete links may only be created by a controlled backfill when the legacy athlete `user_id` and the target active membership identity are proven identical in the selected organization; ambiguous or missing data stays unmapped. Disable a link to withdraw pilot eligibility immediately. Do not delete legacy or V2 history as rollback.

## L10 handoff

L10 receives a legacy group ID, resolves this bridge once, then passes the returned organization and participant membership IDs unchanged to `create_group_session_v2`. No legacy calendar copy or dual-write is permitted.
