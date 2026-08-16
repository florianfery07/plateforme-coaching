import type { Database, Json } from "../types/database";

export type WorkoutLibraryReadRow = Pick<
  Database["public"]["Tables"]["workout_library"]["Row"],
  | "id"
  | "category"
  | "subcategory"
  | "title"
  | "total_duration"
  | "expected_rpe"
  | "expected_rpe_global"
  | "expected_specific_duration"
  | "expected_rpe_specific"
  | "description"
  | "blocks"
  | "created_at"
>;

export type WorkoutLibraryItem = {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  totalDuration: string;
  expectedRpe: string | number;
  expectedRpeGlobal: string | number;
  expectedSpecificDuration: string;
  expectedRpeSpecific: string | number;
  description: string;
  blocks: Json;
};

export type WorkoutLibraryFilter = {
  category: string;
  subcategory: string;
};

export type WorkoutLibraryRepository = {
  list: () => Promise<{
    data: WorkoutLibraryReadRow[] | null;
    error: unknown;
  }>;
};

export type WorkoutLibraryLoadResult =
  | { kind: "success"; library: WorkoutLibraryItem[] | null }
  | { kind: "error"; error: unknown };

/** Preserves the legacy workout-library shape while keeping read preparation independent from React. */
export function mapWorkoutLibrary(
  rows: WorkoutLibraryReadRow[],
): WorkoutLibraryItem[] {
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

export function filterWorkoutLibrary(
  library: WorkoutLibraryItem[],
  filter: WorkoutLibraryFilter,
): WorkoutLibraryItem[] {
  return library.filter((workout) => {
    const categoryOk = !filter.category || workout.category === filter.category;
    const subcategoryOk = !filter.subcategory || workout.subcategory === filter.subcategory;

    return categoryOk && subcategoryOk;
  });
}

export async function loadWorkoutLibrary(
  repository: WorkoutLibraryRepository,
): Promise<WorkoutLibraryLoadResult> {
  const { data, error } = await repository.list();

  if (error) return { kind: "error", error };

  return {
    kind: "success",
    library: data ? mapWorkoutLibrary(data) : null,
  };
}
