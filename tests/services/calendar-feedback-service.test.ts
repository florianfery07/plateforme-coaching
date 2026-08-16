import { describe, expect, it, vi } from "vitest";

import {
  createCalendarFeedbackService,
  toCalendarFeedbackPersistence,
  type CalendarFeedbackRepository,
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
  upsertFeedback = vi.fn().mockResolvedValue({ data: { workout_id: "workout-1" }, error: null }),
): CalendarFeedbackRepository {
  return { upsertFeedback } as CalendarFeedbackRepository;
}

describe("calendar feedback service", () => {
  it("preserves the legacy feedback payload normalization in one persistence write", () => {
    expect(toCalendarFeedbackPersistence({ feedback, workoutId: "workout-1" })).toEqual({
      workout_id: "workout-1",
      rpe: 6.5,
      rpe_global: 6.5,
      rpe_specific: 7,
      motivation: 8,
      pleasure: 4,
      comment: "Bonne séance",
      real_duration: "1h20",
    });
  });

  it("uses one repository write and forwards its abort signal", async () => {
    const upsertFeedback = vi.fn().mockResolvedValue({
      data: toCalendarFeedbackPersistence({ feedback, workoutId: "workout-1" }),
      error: null,
    });
    const signal = new AbortController().signal;

    await expect(createCalendarFeedbackService(repository(upsertFeedback)).save(
      { feedback, workoutId: "workout-1" },
      signal,
    )).resolves.toMatchObject({ workout_id: "workout-1" });

    expect(upsertFeedback).toHaveBeenCalledTimes(1);
    expect(upsertFeedback).toHaveBeenCalledWith(expect.objectContaining({ workout_id: "workout-1" }), signal);
  });

  it("rejects an invalid session before attempting a network write", async () => {
    const upsertFeedback = vi.fn();

    await expect(createCalendarFeedbackService(repository(upsertFeedback)).save({ feedback, workoutId: "" }))
      .rejects.toMatchObject({ kind: "validation" });

    expect(upsertFeedback).not.toHaveBeenCalled();
  });

  it("preserves persistence errors for the reliable mutation executor", async () => {
    const failure = { code: "42501" };
    const upsertFeedback = vi.fn().mockResolvedValue({ data: null, error: failure });

    await expect(createCalendarFeedbackService(repository(upsertFeedback)).save({ feedback, workoutId: "workout-1" }))
      .rejects.toBe(failure);
  });
});
