import { describe, expect, it, vi } from "vitest";

import {
  createCalendarWorkoutCompletionService,
  type CalendarWorkoutCompletionRepository,
} from "../../src/services/calendar-sessions";

const feedback = {
  actualTime: "1h20",
  comment: "Bonne séance",
  motivation: "8",
  pleasure: "4",
  rpe: "6",
  rpeGlobal: "6,5",
  rpeSpecific: "7",
  validated: false,
};

function repository(
  completeWithFeedback = vi.fn().mockResolvedValue({
    data: {
      completed: true,
      feedback: {
        actualTime: "1h20",
        comment: "Bonne séance",
        motivation: 8,
        pleasure: 4,
        rpe: 6.5,
        rpeGlobal: 6.5,
        rpeSpecific: 7,
      },
      workoutId: "workout-1",
    },
    error: null,
  }),
): CalendarWorkoutCompletionRepository {
  return { completeWithFeedback };
}

describe("calendar workout completion service", () => {
  it("uses one atomic repository operation with the normalized final feedback", async () => {
    const completeWithFeedback = vi.fn().mockResolvedValue({
      data: {
        completed: true,
        feedback: {
          actualTime: "1h20", comment: "Bonne séance", motivation: 8, pleasure: 4,
          rpe: 6.5, rpeGlobal: 6.5, rpeSpecific: 7,
        },
        workoutId: "workout-1",
      },
      error: null,
    });
    const signal = new AbortController().signal;

    await expect(createCalendarWorkoutCompletionService(repository(completeWithFeedback)).complete(
      { feedback, workoutId: "workout-1" }, signal,
    )).resolves.toMatchObject({ completed: true, workoutId: "workout-1" });

    expect(completeWithFeedback).toHaveBeenCalledTimes(1);
    expect(completeWithFeedback).toHaveBeenCalledWith(expect.objectContaining({
      comment: "Bonne séance", rpe: 6.5, rpe_global: 6.5, workout_id: "workout-1",
    }), signal);
  });

  it("rejects incomplete feedback before any network operation", async () => {
    const completeWithFeedback = vi.fn();

    await expect(createCalendarWorkoutCompletionService(repository(completeWithFeedback)).complete({
      feedback: { ...feedback, comment: "" }, workoutId: "workout-1",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(completeWithFeedback).not.toHaveBeenCalled();
  });

  it("keeps provider failures available to the reliable mutation rollback", async () => {
    const failure = { code: "42501" };
    const completeWithFeedback = vi.fn().mockResolvedValue({ data: null, error: failure });

    await expect(createCalendarWorkoutCompletionService(repository(completeWithFeedback)).complete({
      feedback, workoutId: "workout-1",
    })).rejects.toBe(failure);
  });
});
