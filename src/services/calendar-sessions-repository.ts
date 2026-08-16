import { supabase } from "../lib/supabase";

import {
  createCalendarFeedbackService,
  type CalendarFeedbackRepository,
  type CalendarSessionsRepository,
} from "./calendar-sessions";

export const calendarSessionsRepository: CalendarSessionsRepository & CalendarFeedbackRepository = {
  async list() {
    return supabase
      .from("calendar_workouts")
      .select(`
        *,
        workout_feedbacks (*)
      `);
  },
  async upsertFeedback(feedback, signal) {
    const query = supabase
      .from("workout_feedbacks")
      .upsert(feedback, { onConflict: "workout_id" });

    if (signal) query.abortSignal(signal);

    return query
      .select("workout_id, rpe, rpe_global, rpe_specific, motivation, pleasure, comment, real_duration")
      .single();
  },
};

export const calendarFeedbackService = createCalendarFeedbackService(calendarSessionsRepository);
