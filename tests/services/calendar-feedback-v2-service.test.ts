import { describe, expect, it, vi } from "vitest";

import {
  createCalendarFeedbackV2Service,
  toCalendarFeedbackV2Persistence,
  type CalendarFeedback,
  type CalendarFeedbackV2Repository,
} from "../../src/services/calendar-sessions";

const feedback: CalendarFeedback = {
  actualTime: "1h20",
  comment: "",
  motivation: "8",
  pleasure: "4",
  rpe: "6",
  rpeGlobal: "6",
  rpeSpecific: "",
  sensation: "5",
  validated: false,
};

function result(completed: boolean, overrides: Partial<CalendarFeedback> = {}) {
  return {
    completed,
    workoutId: "workout-1",
    feedback: {
      actualTime: "1h20",
      comment: "",
      motivation: 8,
      pleasure: 4,
      rpe: 6,
      rpeGlobal: 6,
      rpeSpecific: null,
      sensation: 5,
      updatedAt: "2026-09-06T12:00:00.000Z",
      ...overrides,
    },
  };
}

function repository(overrides: Partial<CalendarFeedbackV2Repository> = {}): CalendarFeedbackV2Repository {
  return {
    getPilotStateV3: vi.fn().mockResolvedValue({ data: { legacyAthleteId: "athlete-1" }, error: null }),
    saveDraftV3: vi.fn().mockResolvedValue({ data: result(false), error: null }),
    completeWithFeedbackV3: vi.fn().mockResolvedValue({ data: result(true), error: null }),
    ...overrides,
  };
}

describe("calendar feedback V2 service", () => {
  it("maps the V2 payload with sensations and the legacy RPE mirror", () => {
    expect(toCalendarFeedbackV2Persistence({ feedback, workoutId: "workout-1" })).toEqual({
      workout_id: "workout-1",
      rpe: 6,
      rpe_global: 6,
      rpe_specific: null,
      sensation: 5,
      motivation: 8,
      pleasure: 4,
      comment: "",
      real_duration: "1h20",
    });
  });

  it("allows the V2 pilot only when the server confirms the exact athlete mapping", async () => {
    const getPilotStateV3 = vi.fn().mockResolvedValue({ data: { legacyAthleteId: "athlete-1" }, error: null });
    const service = createCalendarFeedbackV2Service(repository({ getPilotStateV3 }));

    await expect(service.isPilotTarget("athlete-1")).resolves.toBe(true);
    getPilotStateV3.mockResolvedValueOnce({ data: { legacyAthleteId: "another-athlete" }, error: null });
    await expect(service.isPilotTarget("athlete-1")).resolves.toBe(false);
  });

  it("persists a partial draft through exactly one targeted operation", async () => {
    const saveDraftV3 = vi.fn().mockResolvedValue({ data: result(false), error: null });
    const service = createCalendarFeedbackV2Service(repository({ saveDraftV3 }));
    const signal = new AbortController().signal;

    await expect(service.saveDraft({ feedback: { ...feedback, motivation: "" }, workoutId: "workout-1" }, signal))
      .resolves.toMatchObject({ completed: false, workoutId: "workout-1" });

    expect(saveDraftV3).toHaveBeenCalledTimes(1);
    expect(saveDraftV3).toHaveBeenCalledWith(expect.objectContaining({
      rpe: 6,
      rpe_global: 6,
      sensation: 5,
      workout_id: "workout-1",
    }), signal);
  });

  it("finalizes a non-specific session with an empty comment through one atomic RPC", async () => {
    const completeWithFeedbackV3 = vi.fn().mockResolvedValue({ data: result(true), error: null });
    const service = createCalendarFeedbackV2Service(repository({ completeWithFeedbackV3 }));

    await expect(service.complete({ feedback, requiresSpecific: false, workoutId: "workout-1" }))
      .resolves.toMatchObject({ completed: true, workoutId: "workout-1" });

    expect(completeWithFeedbackV3).toHaveBeenCalledTimes(1);
    expect(completeWithFeedbackV3).toHaveBeenCalledWith(expect.objectContaining({
      comment: "",
      rpe_specific: null,
      sensation: 5,
      workout_id: "workout-1",
    }), undefined);
  });

  it("rejects incomplete or incompatible feedback before it reaches the repository", async () => {
    const completeWithFeedbackV3 = vi.fn();
    const service = createCalendarFeedbackV2Service(repository({ completeWithFeedbackV3 }));

    await expect(service.complete({
      feedback: { ...feedback, rpeSpecific: "" },
      requiresSpecific: true,
      workoutId: "workout-1",
    })).rejects.toMatchObject({ kind: "validation" });
    await expect(service.complete({
      feedback: { ...feedback, rpeSpecific: "7" },
      requiresSpecific: false,
      workoutId: "workout-1",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(completeWithFeedbackV3).not.toHaveBeenCalled();
  });

  it("preserves a server failure for the UI rollback path", async () => {
    const failure = { code: "42501" };
    const saveDraftV3 = vi.fn().mockResolvedValue({ data: null, error: failure });
    const service = createCalendarFeedbackV2Service(repository({ saveDraftV3 }));

    await expect(service.saveDraft({ feedback, workoutId: "workout-1" })).rejects.toBe(failure);
  });
});
