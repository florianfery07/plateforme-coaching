export type LegacyGroupBridgeErrorCode =
  | "access_missing" | "athlete_archived" | "athlete_membership_ambiguous"
  | "athlete_membership_missing" | "coach_membership_inactive"
  | "coach_membership_missing" | "cross_organization" | "empty_group"
  | "invalid_group" | "organization_ambiguous" | "organization_missing"
  | "permission_denied" | "unmapped_legacy_data" | "unknown_error";

export type LegacyGroupBridgeResult =
  | { kind: "success"; legacyGroupId: string; organizationId: string; coachMembershipId: string; athleteMembershipIds: string[]; confidence: "explicit_verified"; readyForGroupsV2: true }
  | { kind: "error"; code: LegacyGroupBridgeErrorCode };

export type LegacyGroupBridgeRepository = {
  resolve: (legacyGroupId: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export function parseLegacyGroupBridgeResult(value: unknown): LegacyGroupBridgeResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "error", code: "unknown_error" };
  const result = value as Record<string, unknown>;
  if (result.kind === "success" && isId(result.legacyGroupId) && isId(result.organizationId)
    && isId(result.coachMembershipId) && Array.isArray(result.athleteMembershipIds)
    && result.athleteMembershipIds.every(isId) && result.athleteMembershipIds.length > 0
    && result.confidence === "explicit_verified" && result.readyForGroupsV2 === true) {
    return { kind: "success", legacyGroupId: result.legacyGroupId, organizationId: result.organizationId,
      coachMembershipId: result.coachMembershipId, athleteMembershipIds: result.athleteMembershipIds,
      confidence: "explicit_verified", readyForGroupsV2: true };
  }
  const codes: LegacyGroupBridgeErrorCode[] = ["access_missing", "athlete_archived", "athlete_membership_ambiguous", "athlete_membership_missing", "coach_membership_inactive", "coach_membership_missing", "cross_organization", "empty_group", "invalid_group", "organization_ambiguous", "organization_missing", "permission_denied", "unmapped_legacy_data"];
  return { kind: "error", code: codes.includes(result.code as LegacyGroupBridgeErrorCode) ? result.code as LegacyGroupBridgeErrorCode : "unknown_error" };
}

export function createLegacyGroupBridgeService(repository: LegacyGroupBridgeRepository) {
  return {
    async resolve(legacyGroupId: string): Promise<LegacyGroupBridgeResult> {
      if (!isId(legacyGroupId)) return { kind: "error", code: "invalid_group" };
      const response = await repository.resolve(legacyGroupId);
      return response.error ? { kind: "error", code: "unknown_error" } : parseLegacyGroupBridgeResult(response.data);
    },
  };
}
