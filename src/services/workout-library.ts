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

export type WorkoutTaxonomyKind = "category" | "subcategory";

export type WorkoutTaxonomyRenameInput = {
  color?: string;
  kind: WorkoutTaxonomyKind;
  name: string;
  taxonomyId: string;
};

export type WorkoutTaxonomyRenameResult = {
  changed: boolean;
  color: string | null;
  kind: WorkoutTaxonomyKind;
  name: string;
  taxonomyId: string;
  updatedWorkoutCount: number;
};

export type WorkoutTaxonomyDeleteInput = {
  kind: WorkoutTaxonomyKind;
  name: string;
};

export type WorkoutTaxonomyDeleteResult = {
  changed: boolean;
  deletedTaxonomyCount: number;
  deletedWorkoutCount: number;
  kind: WorkoutTaxonomyKind;
  name: string;
};

type WorkoutTaxonomyRpcError = {
  code?: string;
  message?: string;
  status?: number;
};

export type WorkoutTaxonomyRepository = {
  deleteCategory: (
    input: WorkoutTaxonomyDeleteInput,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; error: WorkoutTaxonomyRpcError | null }>;
  deleteSubcategory: (
    input: WorkoutTaxonomyDeleteInput,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; error: WorkoutTaxonomyRpcError | null }>;
  renameCategory: (
    input: WorkoutTaxonomyRenameInput,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; error: WorkoutTaxonomyRpcError | null }>;
  renameSubcategory: (
    input: WorkoutTaxonomyRenameInput,
    signal?: AbortSignal,
  ) => Promise<{ data: unknown; error: WorkoutTaxonomyRpcError | null }>;
};

export type WorkoutTaxonomyService = {
  delete: (
    input: WorkoutTaxonomyDeleteInput,
    signal?: AbortSignal,
  ) => Promise<WorkoutTaxonomyDeleteResult>;
  rename: (
    input: WorkoutTaxonomyRenameInput,
    signal?: AbortSignal,
  ) => Promise<WorkoutTaxonomyRenameResult>;
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

function taxonomyFailure(error: WorkoutTaxonomyRpcError | null) {
  if (/fetch|network/i.test(error?.message ?? "")) {
    return { kind: "network", retryable: true };
  }
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403
    || error?.message === "workout_taxonomy_permission_denied") {
    return { kind: "permission", retryable: false };
  }
  if (error?.message === "workout_taxonomy_validation_failed") {
    return { kind: "validation", retryable: false };
  }
  if (error?.message === "workout_taxonomy_target_unavailable") {
    return { kind: "conflict", retryable: false };
  }
  return { kind: "unknown", retryable: false };
}

function taxonomyObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isTaxonomyKind(value: unknown): value is WorkoutTaxonomyKind {
  return value === "category" || value === "subcategory";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseTaxonomyRenameResult(value: unknown): WorkoutTaxonomyRenameResult | null {
  const result = taxonomyObject(value);

  if (!result
    || !isTaxonomyKind(result.kind)
    || typeof result.taxonomyId !== "string"
    || typeof result.name !== "string"
    || (typeof result.color !== "string" && result.color !== null)
    || typeof result.changed !== "boolean"
    || !isNonNegativeInteger(result.updatedWorkoutCount)) {
    return null;
  }

  return {
    changed: result.changed,
    color: result.color,
    kind: result.kind,
    name: result.name,
    taxonomyId: result.taxonomyId,
    updatedWorkoutCount: result.updatedWorkoutCount,
  };
}

function parseTaxonomyDeleteResult(value: unknown): WorkoutTaxonomyDeleteResult | null {
  const result = taxonomyObject(value);

  if (!result
    || !isTaxonomyKind(result.kind)
    || typeof result.name !== "string"
    || typeof result.changed !== "boolean"
    || !isNonNegativeInteger(result.deletedWorkoutCount)
    || !isNonNegativeInteger(result.deletedTaxonomyCount)) {
    return null;
  }

  return {
    changed: result.changed,
    deletedTaxonomyCount: result.deletedTaxonomyCount,
    deletedWorkoutCount: result.deletedWorkoutCount,
    kind: result.kind,
    name: result.name,
  };
}

/** Executes the four explicit server-side taxonomy commands used by the local pilot. */
export function createWorkoutTaxonomyService(
  repository: WorkoutTaxonomyRepository,
): WorkoutTaxonomyService {
  return {
    async rename(input, signal) {
      if (!input.taxonomyId || !input.name.trim()) {
        throw { kind: "validation", retryable: false };
      }

      const response = input.kind === "category"
        ? await repository.renameCategory(input, signal)
        : await repository.renameSubcategory(input, signal);

      if (response.error) throw taxonomyFailure(response.error);

      const result = parseTaxonomyRenameResult(response.data);
      if (!result || result.kind !== input.kind || result.taxonomyId !== input.taxonomyId) {
        throw { kind: "unknown", retryable: false };
      }

      return result;
    },
    async delete(input, signal) {
      if (!input.name.trim()) {
        throw { kind: "validation", retryable: false };
      }

      const response = input.kind === "category"
        ? await repository.deleteCategory(input, signal)
        : await repository.deleteSubcategory(input, signal);

      if (response.error) throw taxonomyFailure(response.error);

      const result = parseTaxonomyDeleteResult(response.data);
      if (!result || result.kind !== input.kind || result.name !== input.name.trim()) {
        throw { kind: "unknown", retryable: false };
      }

      return result;
    },
  };
}
