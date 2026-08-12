import { describe, expect, it } from "vitest";

import type { WorkoutFeedbackRow, WorkoutRow } from "../types/domain";
import {
  calendarSessionsForDate,
  loadCalendarSessions,
  mapCalendarSessions,
  type CalendarSessionsRepository,
} from "./calendar-sessions";

type CalendarWorkoutWithFeedback = WorkoutRow & {
  workout_feedbacks: WorkoutFeedbackRow | WorkoutFeedbackRow[] | null;
};

function workout(overrides: Partial<CalendarWorkoutWithFeedback> = {}): CalendarWorkoutWithFeedback {
  return {
    id: "workout-1",
    athlete_id: "athlete-1",
    date: "2026-08-12",
    workout_type: "Endurance",
    title: "Sortie Z2",
    duration: "1h30",
    completed: false,
    created_at: null,
    non_done: false,
    non_done_reason: null,
    non_done_fatigue: null,
    non_done_pain: null,
    non_done_comment: null,
    description: null,
    expected_rpe: "4",
    blocks: [],
    subcategory: null,
    expected_rpe_global: null,
    expected_specific_duration: null,
    expected_rpe_specific: null,
    adjusted_specific_duration: null,
    athlete_seen_at: null,
    workout_feedbacks: null,
    ...overrides,
  };
}

describe("calendar session preparation", () => {
  it("preserves the legacy session shape and feedback defaults", () => {
    const sessions = mapCalendarSessions(["athlete-1"], [workout({
      completed: true,
      non_done: true,
      non_done_reason: "Fatigue",
      workout_feedbacks: [{
        id: "feedback-1",
        workout_id: "workout-1",
        rpe: 5,
        rpe_global: 6,
        rpe_specific: 7,
        motivation: 8,
        pleasure: 9,
        comment: "Bonne seance",
        real_duration: "1h20",
        created_at: null,
      }],
    })]);

    expect(sessions).toEqual({
      "athlete-1": [expect.objectContaining({
        athleteSeenAt: null,
        category: "Endurance",
        date: "2026-08-12",
        expectedRpe: "4",
        expectedRpeGlobal: "4",
        feedback: expect.objectContaining({
          actualTime: "1h20",
          rpe: "6",
          rpeGlobal: "6",
          rpeSpecific: "7",
          validated: true,
        }),
        nonDone: expect.objectContaining({ reason: "Fatigue", validated: true }),
      })],
    });
  });

  it("keeps an explicit empty state for every known athlete", () => {
    expect(mapCalendarSessions(["athlete-1", "athlete-2"], [])).toEqual({
      "athlete-1": [],
      "athlete-2": [],
    });
  });

  it("keeps sessions addressable when the selected date changes", () => {
    const sessions = mapCalendarSessions(["athlete-1"], [
      workout({ date: "2026-08-12", id: "workout-1" }),
      workout({ date: "2026-08-13", id: "workout-2" }),
    ]);

    expect(calendarSessionsForDate(sessions["athlete-1"], "2026-08-12").map(({ id }) => id)).toEqual(["workout-1"]);
    expect(calendarSessionsForDate(sessions["athlete-1"], "2026-08-13").map(({ id }) => id)).toEqual(["workout-2"]);
  });

  it("preserves the legacy fallback bucket for a row without an athlete", () => {
    const sessions = mapCalendarSessions([], [workout({ athlete_id: null })]);

    expect(sessions.null).toHaveLength(1);
  });

  it("returns the existing error path without preparing partial calendar data", async () => {
    const repository: CalendarSessionsRepository = {
      list: async () => ({ data: null, error: { message: "unavailable" } }),
    };

    await expect(loadCalendarSessions(repository, ["athlete-1"])).resolves.toEqual({
      kind: "error",
      error: { message: "unavailable" },
    });
  });

  it("returns the same prepared sessions through the repository boundary", async () => {
    const repository: CalendarSessionsRepository = {
      list: async () => ({ data: [workout()], error: null }),
    };

    await expect(loadCalendarSessions(repository, ["athlete-1"])).resolves.toEqual({
      kind: "success",
      sessions: {
        "athlete-1": [expect.objectContaining({ id: "workout-1", title: "Sortie Z2" })],
      },
    });
  });
});
