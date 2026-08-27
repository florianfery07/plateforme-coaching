import { supabase } from "../lib/supabase";

import {
  createWorkoutLibraryService,
  createWorkoutTaxonomyService,
  type WorkoutTaxonomyRepository,
  type WorkoutLibraryRepository,
  type WorkoutLibraryWriteRepository,
} from "./workout-library";

export const workoutLibraryRepository: WorkoutLibraryRepository & WorkoutLibraryWriteRepository = {
  async list() {
    return supabase
      .from("workout_library")
      .select(
        "id, category, subcategory, title, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific, description, blocks, created_at",
      )
      .order("created_at", { ascending: false });
  },
  async update(workoutId, workout, signal) {
    const query = supabase
      .from("workout_library")
      .update(workout)
      .eq("id", workoutId);

    if (signal) query.abortSignal(signal);

    return query
      .select(
        "id, category, subcategory, title, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific, description, blocks, created_at",
      )
      .single();
  },
  async insert(workout, signal) {
    const query = supabase
      .from("workout_library")
      .insert(workout);

    if (signal) query.abortSignal(signal);

    return query
      .select(
        "id, category, subcategory, title, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific, description, blocks, created_at",
      )
      .single();
  },
};

export const workoutLibraryService = createWorkoutLibraryService(
  workoutLibraryRepository,
);

export const workoutTaxonomyRepository: WorkoutTaxonomyRepository = {
  async renameCategory(input, signal) {
    const query = supabase.rpc("rename_workout_category_v2", {
      p_category_id: input.taxonomyId,
      p_new_color: input.color ?? null,
      p_new_name: input.name,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
  async renameSubcategory(input, signal) {
    const query = supabase.rpc("rename_workout_subcategory_v2", {
      p_new_color: input.color ?? null,
      p_new_name: input.name,
      p_subcategory_id: input.taxonomyId,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
  async deleteCategory(input, signal) {
    const query = supabase.rpc("delete_workout_category_v2", {
      p_category_name: input.name,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
  async deleteSubcategory(input, signal) {
    const query = supabase.rpc("delete_workout_subcategory_v2", {
      p_subcategory_name: input.name,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
};

export const workoutTaxonomyService = createWorkoutTaxonomyService(
  workoutTaxonomyRepository,
);
