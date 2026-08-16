import { blankFeedback, blankNonDone } from "../lib/platformDefaults";
import type { Json } from "../types/database";
import type { WorkoutFeedbackRow, WorkoutRow } from "../types/domain";

type CalendarWorkoutWithFeedback = WorkoutRow & {
  workout_feedbacks: WorkoutFeedbackRow | WorkoutFeedbackRow[] | null;
};

export type CalendarSession = {
  id: string;
  athleteSeenAt: string | null;
  category: string;
  subcategory: string;
  title: string;
  totalDuration: string;
  expectedRpe: string | number;
  expectedRpeGlobal: string | number;
  expectedSpecificDuration: string;
  adjustedSpecificDuration: string;
  expectedRpeSpecific: string | number;
  description: string;
  date: string;
  blocks: Json;
  feedback: ReturnType<typeof blankFeedback>;
  nonDone: ReturnType<typeof blankNonDone>;
};

export type CalendarSessions = Record<string, CalendarSession[]>;

export type CalendarSessionsLoadResult =
  | { kind: "success"; sessions: CalendarSessions }
  | { kind: "error"; error: unknown };

export type CalendarSessionsRepository = {
  list: () => Promise<{
    data: CalendarWorkoutWithFeedback[] | null;
    error: unknown;
  }>;
};

export type CalendarFeedback = {
  actualTime: string;
  comment: string;
  motivation: string;
  pleasure: string;
  rpe: string;
  rpeGlobal: string;
  rpeSpecific: string;
  validated: boolean;
};

export type CalendarFeedbackSaveInput = {
  feedback: CalendarFeedback;
  workoutId: string;
};

export type CalendarFeedbackPersistence = {
  comment: string;
  motivation: number | null;
  pleasure: number | null;
  real_duration: string;
  rpe: number | null;
  rpe_global: number | null;
  rpe_specific: number | null;
  workout_id: string;
};

export type CalendarFeedbackRepository = {
  upsertFeedback: (
    feedback: CalendarFeedbackPersistence,
    signal?: AbortSignal,
  ) => Promise<{ data: CalendarFeedbackPersistence | null; error: unknown }>;
};

export type CalendarFeedbackService = {
  save: (
    input: CalendarFeedbackSaveInput,
    signal?: AbortSignal,
  ) => Promise<CalendarFeedbackPersistence>;
};

function cleanFeedbackRpe(value: unknown): number | null {
  const match = String(value || "").replace(",", ".").match(/[0-9.]+/);
  return match ? Number(match[0]) : null;
}

/** Maps the existing session feedback shape to its single legacy persistence row. */
export function toCalendarFeedbackPersistence(
  input: CalendarFeedbackSaveInput,
): CalendarFeedbackPersistence {
  const { feedback, workoutId } = input;

  return {
    workout_id: workoutId,
    rpe: cleanFeedbackRpe(feedback.rpeGlobal || feedback.rpe),
    rpe_global: cleanFeedbackRpe(feedback.rpeGlobal || feedback.rpe),
    rpe_specific: cleanFeedbackRpe(feedback.rpeSpecific),
    motivation: feedback.motivation ? Number(feedback.motivation) : null,
    pleasure: feedback.pleasure ? Number(feedback.pleasure) : null,
    comment: feedback.comment || "",
    real_duration: feedback.actualTime || "",
  };
}

export function createCalendarFeedbackService(
  repository: CalendarFeedbackRepository,
): CalendarFeedbackService {
  return {
    async save(input, signal) {
      if (!input.workoutId) {
        throw { kind: "validation", retryable: false };
      }

      const feedback = toCalendarFeedbackPersistence(input);
      const { data, error } = await repository.upsertFeedback(feedback, signal);

      if (error) throw error;
      if (!data) throw { kind: "unknown", retryable: false };

      return data;
    },
  };
}

function feedbackFor(row: CalendarWorkoutWithFeedback): WorkoutFeedbackRow | null {
  return Array.isArray(row.workout_feedbacks)
    ? row.workout_feedbacks[0] ?? null
    : row.workout_feedbacks;
}

/** Preserves the legacy calendar session shape while moving data preparation out of page.tsx. */
export function mapCalendarSessions(
  athleteIds: string[],
  rows: CalendarWorkoutWithFeedback[] | null,
): CalendarSessions {
  const sessions: CalendarSessions = Object.fromEntries(
    athleteIds.map((athleteId) => [athleteId, []]),
  );

  rows?.forEach((row) => {
    const athleteId = row.athlete_id ?? "null";
    const feedback = feedbackFor(row);

    if (!sessions[athleteId]) sessions[athleteId] = [];

    sessions[athleteId].push({
      id: row.id,
      athleteSeenAt: row.athlete_seen_at || null,
      category: row.workout_type || "Séance",
      subcategory: row.subcategory || "",
      title: row.title || "Séance",
      totalDuration: row.duration || "",
      expectedRpe: row.expected_rpe_global || row.expected_rpe || "",
      expectedRpeGlobal: row.expected_rpe_global || row.expected_rpe || "",
      expectedSpecificDuration: row.expected_specific_duration || "",
      adjustedSpecificDuration: row.adjusted_specific_duration || "",
      expectedRpeSpecific: row.expected_rpe_specific || "",
      description: row.description || "",
      date: row.date,
      blocks: row.blocks || [],
      feedback: {
        ...blankFeedback(),
        actualTime: feedback?.real_duration || "",
        rpe: feedback?.rpe_global ? String(feedback.rpe_global) : feedback?.rpe ? String(feedback.rpe) : "",
        rpeGlobal: feedback?.rpe_global ? String(feedback.rpe_global) : feedback?.rpe ? String(feedback.rpe) : "",
        rpeSpecific: feedback?.rpe_specific ? String(feedback.rpe_specific) : "",
        motivation: feedback?.motivation ? String(feedback.motivation) : "",
        pleasure: feedback?.pleasure ? String(feedback.pleasure) : "",
        comment: feedback?.comment || "",
        validated: Boolean(row.completed),
      },
      nonDone: {
        ...blankNonDone(),
        validated: Boolean(row.non_done),
        reason: row.non_done_reason || "",
        fatigue: row.non_done_fatigue || "",
        pain: row.non_done_pain || "",
        comment: row.non_done_comment || "",
      },
    });
  });

  return sessions;
}

export function calendarSessionsForDate(
  sessions: CalendarSession[],
  date: string,
): CalendarSession[] {
  return sessions.filter((session) => session.date === date);
}

export async function loadCalendarSessions(
  repository: CalendarSessionsRepository,
  athleteIds: string[],
): Promise<CalendarSessionsLoadResult> {
  const { data, error } = await repository.list();

  if (error) return { kind: "error", error };

  return {
    kind: "success",
    sessions: mapCalendarSessions(athleteIds, data),
  };
}
