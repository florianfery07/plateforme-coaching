import { describe, expect, it, vi } from "vitest";

import {
  compareAthleteReadSnapshots,
  loadAthletes,
  type AthletesRepository,
} from "../../src/services/athletes";

function createRepository(
  data: unknown[] | null,
  error: { code?: string; message: string } | null = null,
): AthletesRepository {
  return { listAthletes: vi.fn().mockResolvedValue({ data, error }) };
}

const activeAthlete = {
  id: "active-athlete",
  name: "Active athlete",
  email: null,
  sport: "Cycling",
  active: true,
  color: null,
};

const archivedAthlete = {
  id: "archived-athlete",
  name: "Archived athlete",
  email: null,
  sport: null,
  active: false,
  color: "bg-blue-500",
};

describe("loadAthletes", () => {
  it("returns an explicit empty state", async () => {
    await expect(loadAthletes(createRepository([]))).resolves.toEqual({
      kind: "empty",
      athletes: [],
      archivedAthletes: [],
    });
  });

  it("preserves query order and separates archived athletes without selecting one", async () => {
    const result = await loadAthletes(
      createRepository([activeAthlete, archivedAthlete]),
    );

    expect(result).toEqual({
      kind: "success",
      athletes: [activeAthlete],
      archivedAthletes: [archivedAthlete],
    });
    expect(result).not.toHaveProperty("activeId");
  });

  it("rejects runtime rows with unexpected nulls or values", async () => {
    const result = await loadAthletes(
      createRepository([{ ...activeAthlete, name: null }, { ...activeAthlete, active: "yes" }]),
    );

    expect(result).toEqual({ kind: "invalid_data", invalidRowCount: 2 });
  });

  it("returns typed forbidden and error states", async () => {
    await expect(
      loadAthletes(createRepository(null, { code: "42501", message: "Denied" })),
    ).resolves.toEqual({ kind: "forbidden", message: "Denied" });
    await expect(
      loadAthletes(createRepository(null, { message: "Unavailable" })),
    ).resolves.toEqual({ kind: "error", message: "Unavailable" });
  });

  it("compares only identifiers, archive state, order, and current user", async () => {
    const result = await loadAthletes(createRepository([activeAthlete, archivedAthlete]));
    const comparison = compareAthleteReadSnapshots(
      {
        activeAthleteIds: ["active-athlete"],
        archivedAthleteIds: ["archived-athlete"],
        currentUserId: "coach-id",
      },
      result,
      {
        kind: "legacy_coach",
        user: { id: "coach-id", email: null },
      },
    );

    expect(comparison).toEqual({
      activeCountMatches: true,
      activeIdsMatch: true,
      archivedIdsMatch: true,
      currentUserMatches: true,
      orderMatches: true,
    });
  });
});
