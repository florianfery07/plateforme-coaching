import { blankFeedback, blankNonDone } from "../lib/platformDefaults";
import type { Database, Json } from "../types/database";
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

export type CalendarSessionCreateInput = {
  athleteId: string;
  session: Pick<
    CalendarSession,
    | "blocks"
    | "category"
    | "date"
    | "description"
    | "expectedRpe"
    | "expectedRpeGlobal"
    | "expectedRpeSpecific"
    | "expectedSpecificDuration"
    | "subcategory"
    | "title"
    | "totalDuration"
  >;
};

export type CalendarSessionPersistence = Pick<
  Database["public"]["Tables"]["calendar_workouts"]["Insert"],
  | "adjusted_specific_duration"
  | "athlete_id"
  | "athlete_seen_at"
  | "blocks"
  | "completed"
  | "date"
  | "description"
  | "duration"
  | "expected_rpe"
  | "expected_rpe_global"
  | "expected_rpe_specific"
  | "expected_specific_duration"
  | "non_done"
  | "subcategory"
  | "title"
  | "workout_type"
>;

export type CalendarSessionWriteRepository = {
  insert: (
    session: CalendarSessionPersistence,
    signal?: AbortSignal,
  ) => Promise<{ data: WorkoutRow | null; error: unknown }>;
};

export type CalendarSessionAdjustmentSaveInput = {
  adjustedSpecificDuration: string;
  workoutId: string;
};

export type CalendarRestDayInput = {
  athleteId: string;
  date: string;
};

export type CalendarSessionAdjustmentPersistence = Pick<
  Database["public"]["Tables"]["calendar_workouts"]["Update"],
  "adjusted_specific_duration"
>;

export type CalendarSessionAdjustmentRepository = {
  updateAdjustment: (
    workoutId: string,
    adjustment: CalendarSessionAdjustmentPersistence,
    signal?: AbortSignal,
  ) => Promise<{ data: WorkoutRow | null; error: unknown }>;
};

export type CalendarSessionService = {
  create: (
    input: CalendarSessionCreateInput,
    signal?: AbortSignal,
  ) => Promise<CalendarSession>;
  createRestDay: (
    input: CalendarRestDayInput,
    signal?: AbortSignal,
  ) => Promise<CalendarSession>;
  saveAdjustment: (
    input: CalendarSessionAdjustmentSaveInput,
    signal?: AbortSignal,
  ) => Promise<CalendarSession>;
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

/** Preserves the legacy calendar_workouts payload for a single-athlete import. */
export function toCalendarSessionPersistence(
  input: CalendarSessionCreateInput,
): CalendarSessionPersistence {
  const expectedRpe = cleanFeedbackRpe(
    input.session.expectedRpeGlobal || input.session.expectedRpe,
  );

  return {
    athlete_id: input.athleteId,
    date: input.session.date,
    workout_type: input.session.category,
    subcategory: input.session.subcategory,
    title: input.session.title,
    duration: input.session.totalDuration,
    expected_rpe: expectedRpe === null ? null : String(expectedRpe),
    expected_rpe_global: expectedRpe,
    expected_specific_duration: input.session.expectedSpecificDuration || "",
    adjusted_specific_duration: "",
    expected_rpe_specific: cleanFeedbackRpe(input.session.expectedRpeSpecific),
    description: input.session.description,
    blocks: input.session.blocks,
    athlete_seen_at: null,
    completed: false,
  };
}

/** Preserves the legacy single-athlete rest-day payload for the targeted pilot. */
export function toCalendarRestDayPersistence(
  input: CalendarRestDayInput,
): CalendarSessionPersistence {
  return {
    athlete_id: input.athleteId,
    date: input.date,
    workout_type: "Repos",
    subcategory: "",
    title: "Repos",
    duration: "",
    expected_rpe: "",
    description: "Journée de récupération.",
    blocks: [],
    completed: true,
    non_done: false,
  };
}

function mapCalendarSession(row: WorkoutRow): CalendarSession {
  const athleteId = row.athlete_id ?? "null";
  const sessions = mapCalendarSessions([athleteId], [{
    ...row,
    workout_feedbacks: null,
  }]);

  return sessions[athleteId][0];
}

export function createCalendarSessionService(
  repository: CalendarSessionWriteRepository & CalendarSessionAdjustmentRepository,
): CalendarSessionService {
  return {
    async create(input, signal) {
      if (!input.athleteId || !input.session.date) {
        throw { kind: "validation", retryable: false };
      }

      const { data, error } = await repository.insert(
        toCalendarSessionPersistence(input),
        signal,
      );

      if (error) throw error;
      if (!data) throw { kind: "unknown", retryable: false };

      return mapCalendarSession(data);
    },
    async createRestDay(input, signal) {
      if (!input.athleteId || !input.date) {
        throw { kind: "validation", retryable: false };
      }

      const { data, error } = await repository.insert(
        toCalendarRestDayPersistence(input),
        signal,
      );

      if (error) throw error;
      if (!data) throw { kind: "unknown", retryable: false };

      return mapCalendarSession(data);
    },
    async saveAdjustment(input, signal) {
      if (!input.workoutId) {
        throw { kind: "validation", retryable: false };
      }

      const { data, error } = await repository.updateAdjustment(
        input.workoutId,
        {
          adjusted_specific_duration: input.adjustedSpecificDuration || null,
        },
        signal,
      );

      if (error) throw error;
      if (!data) throw { kind: "unknown", retryable: false };

      return mapCalendarSession(data);
    },
  };
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
