import { supabase } from "../lib/supabase";

import type { WorkoutLibraryRepository } from "./workout-library";

export const workoutLibraryRepository: WorkoutLibraryRepository = {
  async list() {
    return supabase
      .from("workout_library")
      .select(
        "id, category, subcategory, title, total_duration, expected_rpe, expected_rpe_global, expected_specific_duration, expected_rpe_specific, description, blocks, created_at",
      )
      .order("created_at", { ascending: false });
  },
};
