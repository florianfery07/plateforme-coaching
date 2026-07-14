import { describe, expect, it, vi } from "vitest";

import {
  loadCurrentUserContext,
  type AuthRepository,
} from "../../src/services/auth";

function createRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    getSession: vi.fn().mockResolvedValue({
      data: { user: { id: "user-id", email: "coach@example.test" } },
      error: null,
    }),
    findAthleteByUserId: vi.fn().mockResolvedValue({ data: null, error: null }),
    findLegacyRoleByUserId: vi.fn().mockResolvedValue({
      data: { role: "coach" },
      error: null,
    }),
    ...overrides,
  };
}

describe("loadCurrentUserContext", () => {
  it("returns unauthenticated without reading roles", async () => {
    const repository = createRepository({
      getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(loadCurrentUserContext(repository)).resolves.toEqual({
      kind: "unauthenticated",
    });
    expect(repository.findAthleteByUserId).not.toHaveBeenCalled();
    expect(repository.findLegacyRoleByUserId).not.toHaveBeenCalled();
  });

  it("classifies active and archived athletes from the explicit athlete row", async () => {
    const activeRepository = createRepository({
      findAthleteByUserId: vi.fn().mockResolvedValue({
        data: { id: "athlete-id", active: true },
        error: null,
      }),
    });
    const archivedRepository = createRepository({
      findAthleteByUserId: vi.fn().mockResolvedValue({
        data: { id: "athlete-id", active: false },
        error: null,
      }),
    });

    await expect(loadCurrentUserContext(activeRepository)).resolves.toMatchObject({
      kind: "athlete",
      athleteId: "athlete-id",
    });
    await expect(loadCurrentUserContext(archivedRepository)).resolves.toMatchObject({
      kind: "archived_athlete",
      athleteId: "athlete-id",
    });
  });

  it("recognizes a legacy coach only from an explicit legacy role", async () => {
    const repository = createRepository();

    await expect(loadCurrentUserContext(repository)).resolves.toMatchObject({
      kind: "legacy_coach",
      user: { id: "user-id" },
    });
  });

  it("does not elevate an authenticated user without a known role", async () => {
    const repository = createRepository({
      findLegacyRoleByUserId: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(loadCurrentUserContext(repository)).resolves.toMatchObject({
      kind: "unknown_role",
      reason: "missing_legacy_role",
    });
  });

  it("returns typed forbidden and error states", async () => {
    const forbiddenRepository = createRepository({
      findAthleteByUserId: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "Denied" },
      }),
    });
    const errorRepository = createRepository({
      getSession: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Unavailable" },
      }),
    });

    await expect(loadCurrentUserContext(forbiddenRepository)).resolves.toMatchObject({
      kind: "forbidden",
      source: "athlete",
    });
    await expect(loadCurrentUserContext(errorRepository)).resolves.toMatchObject({
      kind: "error",
      source: "session",
    });
  });
});
