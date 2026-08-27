import { supabase } from "../lib/supabase";

import {
  createCalendarFeedbackService,
  createCalendarWorkoutCompletionService,
  createCalendarSessionService,
  type CalendarSessionAdjustmentRepository,
  type CalendarSessionNonDoneRepository,
  type CalendarSessionDeleteRepository,
  type CalendarFeedbackRepository,
  type CalendarWorkoutCompletionRepository,
  type CalendarSessionsRepository,
  type CalendarSessionWriteRepository,
} from "./calendar-sessions";

export const calendarSessionsRepository: CalendarSessionsRepository & CalendarFeedbackRepository & CalendarWorkoutCompletionRepository & CalendarSessionWriteRepository & CalendarSessionAdjustmentRepository & CalendarSessionNonDoneRepository & CalendarSessionDeleteRepository = {
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
  async completeWithFeedback(feedback, signal) {
    const query = supabase.rpc("complete_workout_with_feedback_v2", {
      p_actual_time: feedback.real_duration,
      p_comment: feedback.comment,
      p_motivation: feedback.motivation,
      p_pleasure: feedback.pleasure,
      p_rpe: feedback.rpe,
      p_rpe_global: feedback.rpe_global,
      p_rpe_specific: feedback.rpe_specific,
      p_workout_id: feedback.workout_id,
    });

    if (signal) query.abortSignal(signal);

    return query;
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
  async updateNonDone(workoutId, nonDone, signal) {
    const query = supabase
      .from("calendar_workouts")
      .update(nonDone)
      .eq("id", workoutId);

    if (signal) query.abortSignal(signal);

    return query
      .select("*")
      .single();
  },
  async remove(workoutIds, signal) {
    const query = supabase
      .from("calendar_workouts")
      .delete()
      .in("id", workoutIds);

    if (signal) query.abortSignal(signal);

    return query.select("id");
  },
};

export const calendarFeedbackService = createCalendarFeedbackService(calendarSessionsRepository);
export const calendarWorkoutCompletionService = createCalendarWorkoutCompletionService(calendarSessionsRepository);
export const calendarSessionService = createCalendarSessionService(calendarSessionsRepository);
