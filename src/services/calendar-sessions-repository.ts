import { supabase } from "../lib/supabase";

import {
  createCalendarFeedbackService,
  createCalendarSessionService,
  type CalendarSessionAdjustmentRepository,
  type CalendarFeedbackRepository,
  type CalendarSessionsRepository,
  type CalendarSessionWriteRepository,
} from "./calendar-sessions";

export const calendarSessionsRepository: CalendarSessionsRepository & CalendarFeedbackRepository & CalendarSessionWriteRepository & CalendarSessionAdjustmentRepository = {
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
  async insert(session, signal) {
    const query = supabase
      .from("calendar_workouts")
      .insert(session);

    if (signal) query.abortSignal(signal);

    return query
      .select("*")
      .single();
  },
  async updateAdjustment(workoutId, adjustment, signal) {
    const query = supabase
      .from("calendar_workouts")
      .update(adjustment)
      .eq("id", workoutId);

    if (signal) query.abortSignal(signal);

    return query
      .select("*")
      .single();
  },
};

export const calendarFeedbackService = createCalendarFeedbackService(calendarSessionsRepository);
export const calendarSessionService = createCalendarSessionService(calendarSessionsRepository);
