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

export type WorkoutLibraryWriteRepository = {
  insert: (
    workout: WorkoutLibraryPersistence,
    signal?: AbortSignal,
  ) => Promise<{
    data: WorkoutLibraryReadRow | null;
    error: unknown;
  }>;
  update: (
    workoutId: string,
    workout: WorkoutLibraryPersistence,
    signal?: AbortSignal,
  ) => Promise<{
    data: WorkoutLibraryReadRow | null;
    error: unknown;
  }>;
};

export type WorkoutLibraryLoadResult =
  | { kind: "success"; library: WorkoutLibraryItem[] | null }
  | { kind: "error"; error: unknown };

export type WorkoutLibrarySaveInput = {
  workout: WorkoutLibraryItem;
  workoutId?: string;
};

export type WorkoutLibraryPersistence = Pick<
  Database["public"]["Tables"]["workout_library"]["Update"],
  | "blocks"
  | "category"
  | "description"
  | "expected_rpe"
  | "expected_rpe_global"
  | "expected_rpe_specific"
  | "expected_specific_duration"
  | "subcategory"
  | "title"
  | "total_duration"
>;

export type WorkoutLibraryService = {
  save: (
    input: WorkoutLibrarySaveInput,
    signal?: AbortSignal,
  ) => Promise<WorkoutLibraryItem>;
};

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

function cleanWorkoutRpe(value: string | number): string | null {
  const match = String(value || "").replace(",", ".").match(/[0-9.]+/);
  return match ? match[0] : null;
}

/** Maps the existing editor draft to its single workout_library persistence row. */
export function toWorkoutLibraryPersistence(
  workout: WorkoutLibraryItem,
): WorkoutLibraryPersistence {
  const expectedRpe = cleanWorkoutRpe(
    workout.expectedRpeGlobal || workout.expectedRpe,
  );

  return {
    blocks: workout.blocks,
    category: workout.category,
    description: workout.description,
    expected_rpe: expectedRpe,
    expected_rpe_global: expectedRpe ? Number(expectedRpe) : null,
    expected_rpe_specific: (() => {
      const value = cleanWorkoutRpe(workout.expectedRpeSpecific);
      return value ? Number(value) : null;
    })(),
    expected_specific_duration: workout.expectedSpecificDuration || "",
    subcategory: workout.subcategory,
    title: workout.title,
    total_duration: workout.totalDuration,
  };
}

export function createWorkoutLibraryService(
  repository: WorkoutLibraryWriteRepository,
): WorkoutLibraryService {
  return {
    async save(input, signal) {
      if (!input.workout.title.trim()) {
        throw { kind: "validation", retryable: false };
      }

      const workout = toWorkoutLibraryPersistence(input.workout);
      const { data, error } = input.workoutId
        ? await repository.update(input.workoutId, workout, signal)
        : await repository.insert(workout, signal);

      if (error) throw error;
      if (!data) throw { kind: "unknown", retryable: false };

      return mapWorkoutLibrary([data])[0];
    },
  };
}
