import { parseAccessControlV2Context } from "../../lib/access";

import type {
  AccessContextV2,
  AthleteRow,
  AthleteSummary,
  GroupRow,
  GroupSummary,
  WorkoutFeedback,
  WorkoutFeedbackRow,
  WorkoutRow,
  WorkoutSummary,
} from "./models";

export function mapAthleteRowToSummary(row: AthleteRow): AthleteSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    sport: row.sport,
    active: row.active,
    color: row.color,
  };
}

export function mapWorkoutRowToSummary(row: WorkoutRow): WorkoutSummary {
  return {
    id: row.id,
    athlete_id: row.athlete_id,
    date: row.date,
    title: row.title,
    workout_type: row.workout_type,
    duration: row.duration,
    completed: row.completed,
    non_done: row.non_done,
    expected_rpe_global: row.expected_rpe_global,
  };
}

export function mapWorkoutFeedbackRow(row: WorkoutFeedbackRow): WorkoutFeedback {
  return {
    id: row.id,
    workout_id: row.workout_id,
    rpe: row.rpe,
    rpe_global: row.rpe_global,
    rpe_specific: row.rpe_specific,
    motivation: row.motivation,
    pleasure: row.pleasure,
    comment: row.comment,
    real_duration: row.real_duration,
  };
}

export function mapGroupRowToSummary(row: GroupRow): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
  };
}

export function mapAccessContextV2(value: unknown): AccessContextV2 | null {
  return parseAccessControlV2Context(value);
}
