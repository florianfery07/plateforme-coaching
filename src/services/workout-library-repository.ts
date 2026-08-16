import { supabase } from "../lib/supabase";

import {
  createWorkoutLibraryService,
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
};

export const workoutLibraryService = createWorkoutLibraryService(
  workoutLibraryRepository,
);
