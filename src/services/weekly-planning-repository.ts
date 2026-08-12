import { supabase } from "../lib/supabase";

import type { WeeklyPlanningRepository } from "./weekly-planning";

export const weeklyPlanningRepository: WeeklyPlanningRepository = {
  async list() {
    return supabase
      .from("athlete_week_planning")
      .select("athlete_id, year, week, goal, category, subcategory, status, coach_comment");
  },
};
