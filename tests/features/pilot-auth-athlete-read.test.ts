import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { AccessControlV2Context } from "../../src/lib/access";
import {
  reportPilotReadDiagnostic,
  resolvePilotAuthAthleteRead,
  type PilotAuthAthleteReadDependencies,
} from "../../src/features/auth-athletes/pilot-read-controller";
import { loadPilotAuthAthleteRead } from "../../src/features/auth-athletes/pilot-read-service";

const activePilotContext: AccessControlV2Context = {
  userId: "coach-id",
  accountStatus: "active",
  isPilot: true,
  isPlatformAdministrator: false,
  memberships: [],
  athletePermissions: [],
};

const legacySnapshot = {
  activeAthleteIds: ["active-athlete"],
  archivedAthleteIds: ["archived-athlete"],
  currentUserId: "coach-id",
};

const typedAthletes = {
  kind: "success" as const,
  athletes: [
    {
      id: "active-athlete",
      name: "Fictitious athlete",
      email: "athlete@example.test",
      sport: "Cycling",
      active: true,
      color: null,
    },
  ],
  archivedAthletes: [
    {
      id: "archived-athlete",
      name: "Archived athlete",
      email: "archived@example.test",
      sport: null,
      active: false,
      color: null,
    },
  ],
};

function createDependencies(
  overrides: Partial<PilotAuthAthleteReadDependencies> = {},
): PilotAuthAthleteReadDependencies {
  return {
    featureEnabled: true,
    legacyAuth: { role: "coach" },
    currentUserId: "coach-id",
    loadServerAccessContext: vi.fn().mockResolvedValue(activePilotContext),
    loadLegacySnapshot: vi.fn().mockResolvedValue({ data: legacySnapshot, error: null }),
    loadTypedAuthContext: vi.fn().mockResolvedValue({
      kind: "legacy_coach",
      user: { id: "coach-id", email: "coach@example.test" },
    }),
    loadTypedAthletes: vi.fn().mockResolvedValue(typedAthletes),
    ...overrides,
  };
}

describe("pilot typed auth and athlete reads", () => {
  it("uses legacy only and does not call any V2 reader while the flag is disabled", async () => {
    const dependencies = createDependencies({ featureEnabled: false });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toEqual({
      source: "legacy",
      auth: { role: "coach" },
      reason: "feature_disabled",
      divergence: false,
    });
    expect(dependencies.loadServerAccessContext).not.toHaveBeenCalled();
    expect(dependencies.loadTypedAuthContext).not.toHaveBeenCalled();
    expect(dependencies.loadTypedAthletes).not.toHaveBeenCalled();
    expect(dependencies.loadLegacySnapshot).not.toHaveBeenCalled();
  });

  it("short-circuits the service before constructing a typed client when the flag is disabled", async () => {
    const from = vi.fn();
    const legacyClient = { from } as Parameters<typeof loadPilotAuthAthleteRead>[0];

    await expect(
      loadPilotAuthAthleteRead(legacyClient, { role: "coach" }, "coach-id", false),
    ).resolves.toEqual({
      source: "legacy",
      auth: { role: "coach" },
      reason: "feature_disabled",
      divergence: false,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("falls back for a server context that is not an active pilot", async () => {
    const dependencies = createDependencies({
      loadServerAccessContext: vi.fn().mockResolvedValue({
        ...activePilotContext,
        isPilot: false,
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      reason: "server_context_unavailable",
    });
    expect(dependencies.loadTypedAuthContext).not.toHaveBeenCalled();
    expect(dependencies.loadTypedAthletes).not.toHaveBeenCalled();
    expect(dependencies.loadLegacySnapshot).not.toHaveBeenCalled();
  });

  it("selects the typed pilot decision only after equivalent reads", async () => {
    const decision = await resolvePilotAuthAthleteRead(createDependencies());

    expect(decision).toMatchObject({
      source: "v2",
      auth: { role: "coach" },
    });
    expect(decision.source === "v2" && decision.athletes).toEqual(typedAthletes);
  });

  it("falls back when a typed read reports an error", async () => {
    const dependencies = createDependencies({
      loadTypedAuthContext: vi.fn().mockResolvedValue({
        kind: "error",
        source: "session",
        message: "Connection unavailable",
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      reason: "typed_auth_unavailable",
    });
  });

  it("treats any active, archive, order, or user divergence as critical", async () => {
    const dependencies = createDependencies({
      loadTypedAthletes: vi.fn().mockResolvedValue({
        ...typedAthletes,
        athletes: [
          {
            ...typedAthletes.athletes[0],
            id: "unexpected-athlete",
          },
        ],
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      reason: "critical_divergence",
      divergence: true,
    });
  });

  it("treats a changed active athlete order as a critical divergence", async () => {
    const secondAthlete = {
      ...typedAthletes.athletes[0],
      id: "second-athlete",
      name: "Second athlete",
    };
    const dependencies = createDependencies({
      loadLegacySnapshot: vi.fn().mockResolvedValue({
        data: {
          activeAthleteIds: ["active-athlete", "second-athlete"],
          archivedAthleteIds: ["archived-athlete"],
          currentUserId: "coach-id",
        },
        error: null,
      }),
      loadTypedAthletes: vi.fn().mockResolvedValue({
        ...typedAthletes,
        athletes: [secondAthlete, typedAthletes.athletes[0]],
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      reason: "critical_divergence",
      divergence: true,
    });
  });

  it("keeps the exact athlete auth shape consumed by page.tsx", async () => {
    const dependencies = createDependencies({
      legacyAuth: { role: "athlete", athleteId: "active-athlete" },
      currentUserId: "athlete-user",
      loadServerAccessContext: vi.fn().mockResolvedValue({
        ...activePilotContext,
        userId: "athlete-user",
      }),
      loadLegacySnapshot: vi.fn().mockResolvedValue({
        data: { ...legacySnapshot, currentUserId: "athlete-user" },
        error: null,
      }),
      loadTypedAuthContext: vi.fn().mockResolvedValue({
        kind: "athlete",
        athleteId: "active-athlete",
        user: { id: "athlete-user", email: "athlete@example.test" },
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "v2",
      auth: { role: "athlete", athleteId: "active-athlete" },
    });
  });

  it("does not elevate an unknown typed role to coach", async () => {
    const dependencies = createDependencies({
      loadTypedAuthContext: vi.fn().mockResolvedValue({
        kind: "unknown_role",
        user: { id: "coach-id", email: "coach@example.test" },
        reason: "missing_legacy_role",
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      reason: "role_mismatch",
      divergence: true,
    });
  });

  it("keeps archived athletes separate without selecting or mutating them", async () => {
    const dependencies = createDependencies({
      legacyAuth: { role: "archived_athlete", athleteId: "archived-athlete" },
      loadTypedAuthContext: vi.fn().mockResolvedValue({
        kind: "archived_athlete",
        athleteId: "archived-athlete",
        user: { id: "coach-id", email: "coach@example.test" },
      }),
    });

    const decision = await resolvePilotAuthAthleteRead(dependencies);

    expect(decision).toMatchObject({ source: "v2", auth: null });
    if (decision.source !== "v2") {
      throw new Error("Expected the typed pilot path.");
    }
    expect(decision.athletes).toMatchObject({ kind: "success" });
    if (decision.athletes.kind !== "success") {
      throw new Error("Expected the typed athlete list.");
    }
    expect(decision.athletes.archivedAthletes).toEqual(typedAthletes.archivedAthletes);
  });

  it("keeps an explicit empty typed list compatible with the legacy shape", async () => {
    const dependencies = createDependencies({
      loadLegacySnapshot: vi.fn().mockResolvedValue({
        data: {
          activeAthleteIds: [],
          archivedAthleteIds: [],
          currentUserId: "coach-id",
        },
        error: null,
      }),
      loadTypedAthletes: vi.fn().mockResolvedValue({
        kind: "empty",
        athletes: [],
        archivedAthletes: [],
      }),
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "v2",
      auth: { role: "coach" },
      athletes: { kind: "empty", athletes: [], archivedAthletes: [] },
    });
  });

  it("preserves unauthenticated legacy state without making a V2 call", async () => {
    const dependencies = createDependencies({
      legacyAuth: null,
      currentUserId: null,
    });

    await expect(resolvePilotAuthAthleteRead(dependencies)).resolves.toMatchObject({
      source: "legacy",
      auth: null,
      reason: "unauthenticated",
    });
    expect(dependencies.loadServerAccessContext).not.toHaveBeenCalled();
  });

  it("contains only read operations and never emits personal data in diagnostics", () => {
    const pilotSource = readFileSync(
      resolve(process.cwd(), "src/features/auth-athletes/pilot-read-service.ts"),
      "utf8",
    );
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const decision = {
      source: "legacy" as const,
      auth: { role: "coach" as const },
      reason: "critical_divergence" as const,
      divergence: true,
    };

    expect(pilotSource).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    expect(pilotSource).not.toContain("auth.signOut");

    reportPilotReadDiagnostic(decision, "development");

    expect(log).toHaveBeenCalledWith("[pilot-auth-athletes]", {
      path: "legacy",
      reason: "critical_divergence",
      divergence: true,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("@example.test");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Fictitious athlete");
    log.mockRestore();
  });

  it("keeps the legacy session calls in page.tsx beside the pilot orchestrator", () => {
    const pageSource = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

    expect(pageSource).toContain("const { data } = await supabase.auth.getSession();");
    expect(pageSource).toContain('.select("*")\n      .eq("user_id", data.session.user.id)');
    expect(pageSource).toContain("loadPilotAuthAthleteRead(");
    expect(pageSource).toContain("setAuth(await resolvePilotAuth({ role: \"coach\" }));");
  });
});
