import { describe, expect, it, vi } from "vitest";

import {
  getServerDerivedAthletePermission,
  loadAccessControlV2Context,
  parseAccessControlV2Context,
  resolveAccessControlMode,
  type AccessControlV2Context,
} from "../../src/lib/access";

const activePilotContext: AccessControlV2Context = {
  userId: "coach-id",
  accountStatus: "active",
  isPilot: true,
  isPlatformAdministrator: false,
  memberships: [],
  athletePermissions: [
    {
      athleteMembershipId: "athlete-membership-id",
      canAccess: true,
      canManage: false,
    },
  ],
};

describe("access-control V2 foundation", () => {
  it("does not call the RPC while the public flag is disabled", async () => {
    const rpc = vi.fn();

    await expect(
      loadAccessControlV2Context({ rpc }, false),
    ).resolves.toBeNull();

    expect(rpc).not.toHaveBeenCalled();
    expect(resolveAccessControlMode(activePilotContext, false)).toBe("legacy");
  });

  it("requires an active, server-designated pilot before selecting V2", () => {
    expect(resolveAccessControlMode(activePilotContext, true)).toBe("v2");
    expect(
      resolveAccessControlMode({ ...activePilotContext, isPilot: false }, true),
    ).toBe("legacy");
    expect(
      resolveAccessControlMode(
        { ...activePilotContext, accountStatus: "unverified" },
        true,
      ),
    ).toBe("legacy");
  });

  it("fails closed when the RPC reports an error or malformed data", async () => {
    const failingClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }),
    };
    const malformedClient = {
      rpc: vi.fn().mockResolvedValue({ data: { userId: "coach-id" }, error: null }),
    };

    await expect(
      loadAccessControlV2Context(failingClient, true),
    ).resolves.toBeNull();
    await expect(
      loadAccessControlV2Context(malformedClient, true),
    ).resolves.toBeNull();
  });

  it("accepts only the complete server RPC contract", () => {
    expect(parseAccessControlV2Context(activePilotContext)).toEqual(
      activePilotContext,
    );
    expect(
      parseAccessControlV2Context({
        ...activePilotContext,
        accountStatus: "coach",
      }),
    ).toBeNull();
    expect(
      parseAccessControlV2Context({
        ...activePilotContext,
        athletePermissions: [{ athleteMembershipId: "athlete-membership-id" }],
      }),
    ).toBeNull();
  });

  it("only exposes permissions already returned by the server", () => {
    expect(
      getServerDerivedAthletePermission(
        activePilotContext,
        "athlete-membership-id",
      ),
    ).toEqual({ canAccess: true, canManage: false });
    expect(
      getServerDerivedAthletePermission(activePilotContext, "unknown"),
    ).toEqual({ canAccess: false, canManage: false });
  });
});
