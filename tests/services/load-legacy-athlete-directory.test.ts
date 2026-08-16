import { describe, expect, it, vi } from "vitest";

import { athlete } from "../../src/lib/platformDefaults";
import {
  loadLegacyAthleteDirectory,
  mapLegacyAthleteDirectoryRow,
  type LegacyAthleteDirectoryRepository,
  type LegacyAthleteDirectoryRow,
} from "../../src/services/athletes";

function createRepository(
  data: LegacyAthleteDirectoryRow[] | null,
  error: { code?: string; message: string } | null = null,
): LegacyAthleteDirectoryRepository {
  return { listLegacyAthleteDirectory: vi.fn().mockResolvedValue({ data, error }) };
}

function legacyMap(row: LegacyAthleteDirectoryRow) {
  return {
    ...athlete(
      row.id,
      row.name,
      row.weight || "",
      row.power5 || "",
      row.power12 || "",
      row.power20 || "",
    ),
    email: row.email || "",
    age: row.age || "",
    height: row.height || "",
    sport: row.sport || "Vélo",
    shortGoal: row.short_goal || "",
    mediumGoal: row.medium_goal || "",
    longGoal: row.long_goal || "",
    context: row.context || "",
    goalUpdateRequested: Boolean(row.goal_update_requested),
    user_id: row.user_id || "",
    active: row.active !== false,
    color: row.color || "bg-blue-500",
  };
}

const activeAthlete: LegacyAthleteDirectoryRow = {
  id: "athlete-active",
  name: "Active athlete",
  weight: "68",
  power5: "600",
  power12: "480",
  power20: "410",
  email: "active@example.test",
  age: "28",
  height: "178",
  sport: "Route",
  short_goal: "Short",
  medium_goal: "Medium",
  long_goal: "Long",
  context: "Context",
  goal_update_requested: true,
  user_id: "user-active",
  active: true,
  color: "bg-green-500",
};

describe("loadLegacyAthleteDirectory", () => {
  it("returns an empty directory when there are no athletes", async () => {
    await expect(loadLegacyAthleteDirectory(createRepository([]))).resolves.toEqual({
      kind: "success",
      athletes: [],
    });
  });

  it("preserves the exact legacy shape for an active athlete", () => {
    expect(mapLegacyAthleteDirectoryRow(activeAthlete)).toEqual(legacyMap(activeAthlete));
  });

  it("preserves archived athletes and query order without assigning a role", async () => {
    const archivedAthlete: LegacyAthleteDirectoryRow = {
      ...activeAthlete,
      id: "athlete-archived",
      name: "Archived athlete",
      active: false,
    };
    const result = await loadLegacyAthleteDirectory(
      createRepository([archivedAthlete, activeAthlete]),
    );

    expect(result).toEqual({
      kind: "success",
      athletes: [legacyMap(archivedAthlete), legacyMap(activeAthlete)],
    });
    expect(result).not.toHaveProperty("role");
    if (result.kind === "success") {
      expect(result.athletes.map((athleteItem) => athleteItem.active)).toEqual([false, true]);
    }
  });

  it("keeps legacy defaults for null and partial values", () => {
    const partialAthlete: LegacyAthleteDirectoryRow = {
      ...activeAthlete,
      id: "athlete-partial",
      name: "Partial athlete",
      weight: null,
      power5: null,
      power12: null,
      power20: null,
      email: null,
      age: null,
      height: null,
      sport: null,
      short_goal: null,
      medium_goal: null,
      long_goal: null,
      context: null,
      goal_update_requested: null,
      user_id: null,
      color: null,
    };

    expect(mapLegacyAthleteDirectoryRow(partialAthlete)).toEqual(legacyMap(partialAthlete));
  });

  it("returns a typed read error without writing", async () => {
    const repository = createRepository(null, { code: "42501", message: "Denied" });

    await expect(loadLegacyAthleteDirectory(repository)).resolves.toEqual({
      kind: "error",
      error: { code: "42501", message: "Denied" },
    });
    expect(Object.keys(repository)).toEqual(["listLegacyAthleteDirectory"]);
  });
});
