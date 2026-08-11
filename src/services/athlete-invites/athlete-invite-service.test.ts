import { describe, expect, it } from "vitest";

import { createAthleteInviteService } from "./athlete-invite-service";
import type { AthleteInviteRepository } from "./types";

const athleteId = "10000000-0000-4000-8000-000000000011";
const coachMembershipId = "30000000-0000-4000-8000-000000000011";
const inviteId = "40000000-0000-4000-8000-000000000011";

function repository(overrides: Partial<AthleteInviteRepository> = {}): AthleteInviteRepository {
  return {
    create: async () => ({ data: null, error: null }),
    list: async () => ({ data: [], error: null }),
    revoke: async () => ({ data: null, error: null }),
    consume: async () => ({ data: null, error: null }),
    ...overrides,
  };
}

describe("athlete invitation V2 service", () => {
  it("accepts only an opaque V2 token returned by the controlled RPC", async () => {
    const service = createAthleteInviteService(repository({
      create: async () => ({
        data: { inviteId, token: `v2i_${"a".repeat(64)}`, expiresAt: "2026-08-01T00:00:00.000Z" },
        error: null,
      }),
    }));

    await expect(service.create({ legacyAthleteId: athleteId, coachMembershipId })).resolves.toEqual({
      kind: "success", inviteId, token: `v2i_${"a".repeat(64)}`, expiresAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("accepts PostgreSQL UUID identifiers used by the legacy baseline", async () => {
    const service = createAthleteInviteService(repository({
      create: async () => ({
        data: { inviteId, token: `v2i_${"c".repeat(64)}`, expiresAt: "2026-08-01T00:00:00.000Z" },
        error: null,
      }),
    }));

    await expect(service.create({
      legacyAthleteId: "93000000-0000-0000-0000-000000000003",
      coachMembershipId: "92000000-0000-0000-0000-000000000001",
    })).resolves.toMatchObject({ kind: "success" });
  });

  it("never promotes a malformed or expired response to a successful invitation", async () => {
    const service = createAthleteInviteService(repository({
      create: async () => ({ data: { inviteId, token: "invite-predictable", expiresAt: "tomorrow" }, error: null }),
      consume: async () => ({ data: { kind: "error", code: "invite_invalid_or_unavailable" }, error: null }),
    }));

    await expect(service.create({ legacyAthleteId: athleteId, coachMembershipId })).resolves.toMatchObject({
      kind: "error", error: "unavailable",
    });
    await expect(service.consume(`v2i_${"b".repeat(64)}`)).resolves.toMatchObject({
      kind: "error", error: "unavailable",
    });
  });

  it("maps duplicate invitations to a safe conflict without exposing persistence details", async () => {
    const service = createAthleteInviteService(repository({
      create: async () => ({ data: null, error: { message: "invite_already_active" } }),
    }));

    await expect(service.create({ legacyAthleteId: athleteId, coachMembershipId })).resolves.toEqual({
      kind: "error",
      error: "conflict",
      message: "Une invitation active existe déjà pour cet athlète.",
    });
  });
});
