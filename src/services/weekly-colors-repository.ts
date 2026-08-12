import { supabase } from "../lib/supabase";

import type { WeeklyColorsRepository } from "./weekly-colors";

export const weeklyColorsRepository: WeeklyColorsRepository = {
  async list() {
    return supabase
      .from("athlete_week_colors")
      .select("athlete_id, year, week, color_name");
  },
};
