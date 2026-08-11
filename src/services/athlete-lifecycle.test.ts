import { describe, expect, it } from "vitest";

import {
  createAthleteLifecycleService,
  shouldUseAthleteLifecycleV2,
} from "./athlete-lifecycle";

const athleteId = "10000000-0000-4000-8000-000000000011";

describe("athlete lifecycle V2 service", () => {
  it("uses V2 only for an enabled, server-confirmed pilot", () => {
    expect(shouldUseAthleteLifecycleV2(null, true)).toBe(false);
    expect(shouldUseAthleteLifecycleV2({
      userId: "00000000-0000-4000-8000-000000000001",
      accountStatus: "active",
      isPilot: false,
      isPlatformAdministrator: false,
      memberships: [],
      athletePermissions: [],
    }, true)).toBe(false);
    expect(shouldUseAthleteLifecycleV2({
      userId: "00000000-0000-4000-8000-000000000001",
      accountStatus: "active",
      isPilot: true,
      isPlatformAdministrator: false,
      memberships: [],
      athletePermissions: [],
    }, true)).toBe(true);
  });

  it("accepts a controlled archive or restoration result only", async () => {
    const service = createAthleteLifecycleService({
      rpc: async (functionName) => ({
        data: { athleteId, status: functionName.startsWith("archive") ? "archived" : "active", changed: true },
        error: null,
      }),
    });

    await expect(service.archive(athleteId)).resolves.toEqual({ kind: "success", athleteId, status: "archived", changed: true });
    await expect(service.restore(athleteId)).resolves.toEqual({ kind: "success", athleteId, status: "active", changed: true });
  });

  it("keeps server failures and malformed payloads safe", async () => {
    const service = createAthleteLifecycleService({
      rpc: async () => ({ data: null, error: { message: "athlete_lifecycle_target_unavailable" } }),
    });

    await expect(service.archive(athleteId)).resolves.toEqual({
      kind: "error",
      error: "unavailable",
      message: "Cet athlète ne peut pas être modifié par le pilote V2.",
    });
    await expect(service.archive("not-a-uuid")).resolves.toEqual({
      kind: "error",
      error: "validation",
      message: "L’athlète sélectionné est invalide.",
    });
  });
});
