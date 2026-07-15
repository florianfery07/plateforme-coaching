import { describe, expect, it, vi } from "vitest";
import { createLegacyGroupBridgeService, parseLegacyGroupBridgeResult } from "../../src/services/groups-v2";

describe("legacy group bridge", () => {
  it("returns only a complete explicit mapping", async () => {
    const resolve = vi.fn().mockResolvedValue({ data: { kind: "success", legacyGroupId: "group-1", organizationId: "org-1", coachMembershipId: "coach-1", athleteMembershipIds: ["athlete-1", "athlete-2"], confidence: "explicit_verified", readyForGroupsV2: true }, error: null });
    await expect(createLegacyGroupBridgeService({ resolve }).resolve("group-1")).resolves.toMatchObject({ kind: "success", organizationId: "org-1" });
  });

  it("fails closed for malformed, missing, or ambiguous mapping data", async () => {
    expect(parseLegacyGroupBridgeResult({ kind: "success", athleteMembershipIds: [] })).toEqual({ kind: "error", code: "unknown_error" });
    await expect(createLegacyGroupBridgeService({ resolve: vi.fn() }).resolve(" ")).resolves.toEqual({ kind: "error", code: "invalid_group" });
  });
});
