import { describe, expect, it } from "vitest";

import type { Database } from "../types/database";
import {
  loadWeeklyColors,
  mapWeeklyColors,
  type WeeklyColorsRepository,
} from "./weekly-colors";

type AthleteWeekColorRow =
  Database["public"]["Tables"]["athlete_week_colors"]["Row"];

function color(
  overrides: Partial<AthleteWeekColorRow> = {},
): AthleteWeekColorRow {
  return {
    id: "color-1",
    athlete_id: "athlete-1",
    year: 2026,
    week: "S32",
    color_name: "bg-green-500",
    created_at: "2026-08-12T10:00:00.000Z",
    ...overrides,
  };
}

function legacyWeeklyColors(
  rows: AthleteWeekColorRow[] | null,
): Record<string, string | null> {
  return Object.fromEntries(
    (rows ?? []).map((row) => [
      `${row.athlete_id}-${row.year}-${row.week}`,
      row.color_name,
    ]),
  );
}

describe("weekly color preparation", () => {
  it("keeps the legacy empty color result when no rows are returned", () => {
    expect(mapWeeklyColors(null)).toEqual(legacyWeeklyColors(null));
  });

  it("maps one week to the exact legacy lookup shape", () => {
    const rows = [color()];

    expect(mapWeeklyColors(rows)).toEqual(legacyWeeklyColors(rows));
  });

  it("keeps multiple athletes, years, and weeks addressable in input order", () => {
    const rows = [
      color({ athlete_id: "athlete-1", year: 2025, week: "S52" }),
      color({ athlete_id: "athlete-1", year: 2026, week: "S32" }),
      color({ athlete_id: "athlete-2", year: 2026, week: "S32" }),
    ];

    const colors = mapWeeklyColors(rows);

    expect(colors).toEqual(legacyWeeklyColors(rows));
    expect(Object.keys(colors)).toEqual([
      "athlete-1-2025-S52",
      "athlete-1-2026-S32",
      "athlete-2-2026-S32",
    ]);
  });

  it("preserves nullable color values and nullable key parts without inventing defaults", () => {
    const rows = [color({
      athlete_id: null,
      year: null,
      week: null,
      color_name: null,
    })];

    expect(mapWeeklyColors(rows)).toEqual(legacyWeeklyColors(rows));
    expect(mapWeeklyColors(rows)).toEqual({ "null-null-null": null });
  });

  it("preserves the legacy duplicate behavior, where the final row wins", () => {
    const rows = [
      color({ id: "color-old", color_name: "bg-blue-500" }),
      color({ id: "color-new", color_name: "bg-red-500" }),
    ];

    expect(mapWeeklyColors(rows)).toEqual(legacyWeeklyColors(rows));
    expect(mapWeeklyColors(rows)["athlete-1-2026-S32"]).toBe("bg-red-500");
    expect(rows.map((row) => row.id)).toEqual(["color-old", "color-new"]);
  });

  it("returns the existing read error without preparing partial data", async () => {
    const repository: WeeklyColorsRepository = {
      list: async () => ({ data: null, error: { message: "unavailable" } }),
    };

    await expect(loadWeeklyColors(repository)).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("loads the same colors through the read-only repository boundary", async () => {
    const repository: WeeklyColorsRepository = {
      list: async () => ({ data: [color()], error: null }),
    };

    await expect(loadWeeklyColors(repository)).resolves.toEqual({
      kind: "success",
      colors: { "athlete-1-2026-S32": "bg-green-500" },
    });
  });
});
