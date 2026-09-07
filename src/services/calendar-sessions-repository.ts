import { supabase } from "../lib/supabase";

import {
  createCalendarFeedbackService,
  createCalendarFeedbackV2Service,
  createCalendarWorkoutCompletionService,
  createCalendarSessionService,
  type CalendarSessionAdjustmentRepository,
  type CalendarSessionNonDoneRepository,
  type CalendarSessionDeleteRepository,
  type CalendarFeedbackRepository,
  type CalendarFeedbackV2Repository,
  type CalendarWorkoutCompletionRepository,
  type CalendarSessionsRepository,
  type CalendarSessionWriteRepository,
} from "./calendar-sessions";

export const calendarSessionsRepository: CalendarSessionsRepository & CalendarFeedbackRepository & CalendarFeedbackV2Repository & CalendarWorkoutCompletionRepository & CalendarSessionWriteRepository & CalendarSessionAdjustmentRepository & CalendarSessionNonDoneRepository & CalendarSessionDeleteRepository = {
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
  async getPilotStateV3(athleteId, signal) {
    const query = supabase.rpc("get_athlete_feedback_pilot_state_v3", {
      p_legacy_athlete_id: athleteId,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
  async saveDraftV3(feedback, signal) {
    const query = supabase.rpc("save_workout_feedback_draft_v3", {
      p_actual_time: feedback.real_duration,
      p_comment: feedback.comment,
      p_motivation: feedback.motivation,
      p_pleasure: feedback.pleasure,
      p_rpe_global: feedback.rpe_global,
      p_rpe_specific: feedback.rpe_specific,
      p_sensation: feedback.sensation,
      p_workout_id: feedback.workout_id,
    });

    if (signal) query.abortSignal(signal);
    return query;
  },
  async completeWithFeedbackV3(feedback, signal) {
    const query = supabase.rpc("complete_workout_with_feedback_v3", {
      p_actual_time: feedback.real_duration,
      p_comment: feedback.comment,
      p_motivation: feedback.motivation,
      p_pleasure: feedback.pleasure,
      p_rpe_global: feedback.rpe_global,
      p_rpe_specific: feedback.rpe_specific,
      p_sensation: feedback.sensation,
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
export const calendarFeedbackV2Service = createCalendarFeedbackV2Service(calendarSessionsRepository);
export const calendarWorkoutCompletionService = createCalendarWorkoutCompletionService(calendarSessionsRepository);
export const calendarSessionService = createCalendarSessionService(calendarSessionsRepository);
