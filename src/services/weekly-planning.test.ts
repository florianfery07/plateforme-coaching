import { describe, expect, it } from "vitest";

import type { Database } from "../types/database";
import {
  loadWeeklyPlanning,
  mapWeeklyPlanning,
  type WeeklyPlanningRepository,
} from "./weekly-planning";

type AthleteWeekPlanningRow =
  Database["public"]["Tables"]["athlete_week_planning"]["Row"];

function planning(
  overrides: Partial<AthleteWeekPlanningRow> = {},
): AthleteWeekPlanningRow {
  return {
    id: "planning-1",
    athlete_id: "athlete-1",
    year: 2026,
    week: "S32",
    goal: "Développement",
    category: "Route",
    subcategory: "Endurance",
    status: "planned",
    coach_comment: "Charge progressive.",
    created_at: "2026-08-12T10:00:00.000Z",
    updated_at: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

describe("weekly planning preparation", () => {
  it("keeps the legacy empty planning result when no rows are returned", () => {
    expect(mapWeeklyPlanning(null)).toEqual({});
  });

  it("maps one week to the exact legacy lookup shape", () => {
    expect(mapWeeklyPlanning([planning()])).toEqual({
      "athlete-1-2026-S32": {
        goal: "Développement",
        category: "Route",
        subcategory: "Endurance",
        status: "planned",
        coachComment: "Charge progressive.",
      },
    });
  });

  it("keeps every athlete, year, and week addressable through its legacy composite key", () => {
    expect(mapWeeklyPlanning([
      planning({ athlete_id: "athlete-1", year: 2025, week: "S52" }),
      planning({ athlete_id: "athlete-1", week: "S32" }),
      planning({ athlete_id: "athlete-2", week: "S32" }),
    ])).toEqual(expect.objectContaining({
      "athlete-1-2025-S52": expect.any(Object),
      "athlete-1-2026-S32": expect.any(Object),
      "athlete-2-2026-S32": expect.any(Object),
    }));
  });

  it("preserves the legacy input order for duplicate rows, where the final row wins", () => {
    const rows = [
      planning({ goal: "Base", id: "planning-old" }),
      planning({ goal: "Pic", id: "planning-new" }),
    ];

    expect(mapWeeklyPlanning(rows)["athlete-1-2026-S32"].goal).toBe("Pic");
    expect(rows.map((row) => row.id)).toEqual(["planning-old", "planning-new"]);
  });

  it("preserves legacy defaults for empty or nullable planning fields", () => {
    expect(mapWeeklyPlanning([planning({
      goal: "",
      category: "",
      subcategory: "",
      status: null,
      coach_comment: "",
    })])["athlete-1-2026-S32"]).toEqual({
      goal: "Off",
      category: "",
      subcategory: "",
      status: "planned",
      coachComment: "",
    });
  });

  it("returns the existing read error without preparing partial data", async () => {
    const repository: WeeklyPlanningRepository = {
      list: async () => ({ data: null, error: { message: "unavailable" } }),
    };

    await expect(loadWeeklyPlanning(repository)).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("loads the same prepared planning through the read-only repository boundary", async () => {
    const repository: WeeklyPlanningRepository = {
      list: async () => ({ data: [planning()], error: null }),
    };

    await expect(loadWeeklyPlanning(repository)).resolves.toEqual({
      kind: "success",
      planning: {
        "athlete-1-2026-S32": expect.objectContaining({
          goal: "Développement",
        }),
      },
    });
  });
});
