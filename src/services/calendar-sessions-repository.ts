import { supabase } from "../lib/supabase";

import type { CalendarSessionsRepository } from "./calendar-sessions";

export const calendarSessionsRepository: CalendarSessionsRepository = {
  async list() {
    return supabase
      .from("calendar_workouts")
      .select(`
        *,
        workout_feedbacks (*)
      `);
  },
};
