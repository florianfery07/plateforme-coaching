import { describe, expect, it } from "vitest";

import {
  filterWorkoutLibrary,
  loadWorkoutLibrary,
  mapWorkoutLibrary,
  type WorkoutLibraryItem,
  type WorkoutLibraryReadRow,
  type WorkoutLibraryRepository,
} from "./workout-library";

function workout(
  overrides: Partial<WorkoutLibraryReadRow> = {},
): WorkoutLibraryReadRow {
  return {
    id: "workout-1",
    title: "Endurance fondamentale",
    category: "Route",
    subcategory: "Endurance",
    total_duration: "1h30",
    expected_rpe: "4/10",
    expected_rpe_global: null,
    expected_specific_duration: "",
    expected_rpe_specific: null,
    description: "Rester stable.",
    blocks: [{ title: "Échauffement" }],
    created_at: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

function legacyWorkoutLibrary(rows: WorkoutLibraryReadRow[]) {
  return rows.map((row) => ({
    id: row.id,
    category: row.category || "Route",
    subcategory: row.subcategory || "",
    title: row.title || "",
    totalDuration: row.total_duration || "",
    expectedRpe: row.expected_rpe_global || row.expected_rpe || "",
    expectedRpeGlobal: row.expected_rpe_global || row.expected_rpe || "",
    expectedSpecificDuration: row.expected_specific_duration || "",
    expectedRpeSpecific: row.expected_rpe_specific || "",
    description: row.description || "",
    blocks: row.blocks || [],
  }));
}

function legacyFilterWorkoutLibrary(
  library: WorkoutLibraryItem[],
  filter: { category: string; subcategory: string },
) {
  return library.filter((workout) => {
    const categoryOk = !filter.category || workout.category === filter.category;
    const subcategoryOk = !filter.subcategory || workout.subcategory === filter.subcategory;

    return categoryOk && subcategoryOk;
  });
}

describe("workout library read preparation", () => {
  it("keeps the legacy empty library result", () => {
    expect(mapWorkoutLibrary([])).toEqual(legacyWorkoutLibrary([]));
  });

  it("maps one workout to the exact legacy shape", () => {
    const rows = [workout()];

    expect(mapWorkoutLibrary(rows)).toEqual(legacyWorkoutLibrary(rows));
  });

  it("preserves the repository order for multiple workouts", () => {
    const rows = [
      workout({ id: "newest", title: "Nouveau" }),
      workout({ id: "older", title: "Ancien" }),
    ];

    expect(mapWorkoutLibrary(rows)).toEqual(legacyWorkoutLibrary(rows));
    expect(mapWorkoutLibrary(rows).map((item) => item.id)).toEqual(["newest", "older"]);
  });

  it("keeps existing categories and subcategories filterable", () => {
    const library = mapWorkoutLibrary([
      workout({ id: "route-endurance", category: "Route", subcategory: "Endurance" }),
      workout({ id: "route-seuil", category: "Route", subcategory: "Seuil" }),
      workout({ id: "mtb-endurance", category: "VTT", subcategory: "Endurance" }),
    ]);

    const routeFilter = { category: "Route", subcategory: "" };
    const enduranceFilter = { category: "", subcategory: "Endurance" };

    expect(filterWorkoutLibrary(library, routeFilter)).toEqual(
      legacyFilterWorkoutLibrary(library, routeFilter),
    );
    expect(filterWorkoutLibrary(library, enduranceFilter)).toEqual(
      legacyFilterWorkoutLibrary(library, enduranceFilter),
    );
  });

  it("preserves legacy defaults for null and partial values", () => {
    const rows = [workout({
      category: null,
      subcategory: null,
      title: "",
      total_duration: null,
      expected_rpe: null,
      expected_rpe_global: null,
      expected_specific_duration: null,
      expected_rpe_specific: null,
      description: null,
      blocks: null,
    })];

    expect(mapWorkoutLibrary(rows)).toEqual(legacyWorkoutLibrary(rows));
    expect(mapWorkoutLibrary(rows)[0]).toMatchObject({
      category: "Route",
      subcategory: "",
      title: "",
      totalDuration: "",
      expectedRpe: "",
      expectedRpeGlobal: "",
      expectedSpecificDuration: "",
      expectedRpeSpecific: "",
      description: "",
      blocks: [],
    });
  });

  it("keeps global RPE when supplied, matching the legacy fallback precedence", () => {
    const rows = [workout({ expected_rpe: "4/10", expected_rpe_global: 6 })];

    expect(mapWorkoutLibrary(rows)).toEqual(legacyWorkoutLibrary(rows));
    expect(mapWorkoutLibrary(rows)[0].expectedRpe).toBe(6);
  });

  it("preserves duplicate entries without deduplication", () => {
    const rows = [
      workout({ id: "duplicate", title: "Première" }),
      workout({ id: "duplicate", title: "Seconde" }),
    ];

    expect(mapWorkoutLibrary(rows)).toEqual(legacyWorkoutLibrary(rows));
    expect(mapWorkoutLibrary(rows).map((item) => item.title)).toEqual(["Première", "Seconde"]);
  });

  it("returns the existing read error without preparing partial data", async () => {
    const repository: WorkoutLibraryRepository = {
      list: async () => ({ data: [workout()], error: { message: "unavailable" } }),
    };

    await expect(loadWorkoutLibrary(repository)).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("keeps a null read result distinct from an empty library", async () => {
    const repository: WorkoutLibraryRepository = {
      list: async () => ({ data: null, error: null }),
    };

    await expect(loadWorkoutLibrary(repository)).resolves.toEqual({
      kind: "success",
      library: null,
    });
  });

  it("loads through a read-only repository boundary", async () => {
    const repository: WorkoutLibraryRepository = {
      list: async () => ({ data: [workout()], error: null }),
    };

    expect(Object.keys(repository)).toEqual(["list"]);
    await expect(loadWorkoutLibrary(repository)).resolves.toEqual({
      kind: "success",
      library: legacyWorkoutLibrary([workout()]),
    });
  });
});
