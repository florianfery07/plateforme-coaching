import { describe, expect, it, vi } from "vitest";

import {
  createCalendarSessionService,
  toCalendarRestDayPersistence,
  toCalendarSessionPersistence,
  type CalendarSessionCreateInput,
  type CalendarSessionAdjustmentRepository,
  type CalendarSessionNonDoneRepository,
  type CalendarSessionWriteRepository,
} from "../../src/services/calendar-sessions";

const input: CalendarSessionCreateInput = {
  athleteId: "athlete-1",
  session: {
    blocks: [],
    category: "Endurance",
    date: "2026-08-18",
    description: "Synthetic local session",
    expectedRpe: "4",
    expectedRpeGlobal: "4,5",
    expectedRpeSpecific: "5",
    expectedSpecificDuration: "0h45",
    subcategory: "Route",
    title: "Sortie locale",
    totalDuration: "1h30",
  },
};

const row = {
  id: "workout-1",
  athlete_id: "athlete-1",
  date: "2026-08-18",
  workout_type: "Endurance",
  subcategory: "Route",
  title: "Sortie locale",
  duration: "1h30",
  expected_rpe: "4.5",
  expected_rpe_global: 4.5,
  expected_specific_duration: "0h45",
  adjusted_specific_duration: "",
  expected_rpe_specific: 5,
  description: "Synthetic local session",
  blocks: [],
  athlete_seen_at: null,
  completed: false,
  created_at: null,
  non_done: false,
  non_done_reason: null,
  non_done_fatigue: null,
  non_done_pain: null,
  non_done_comment: null,
};

function repository(
  insert = vi.fn().mockResolvedValue({ data: row, error: null }),
  updateAdjustment = vi.fn().mockResolvedValue({ data: row, error: null }),
  updateNonDone = vi.fn().mockResolvedValue({ data: row, error: null }),
): CalendarSessionWriteRepository & CalendarSessionAdjustmentRepository & CalendarSessionNonDoneRepository {
  return { insert, updateAdjustment, updateNonDone };
}

describe("calendar session targeted create service", () => {
  it("preserves the single-athlete legacy persistence payload", () => {
    expect(toCalendarSessionPersistence(input)).toEqual({
      adjusted_specific_duration: "",
      athlete_id: "athlete-1",
      athlete_seen_at: null,
      blocks: [],
      completed: false,
      date: "2026-08-18",
      description: "Synthetic local session",
      duration: "1h30",
      expected_rpe: "4.5",
      expected_rpe_global: 4.5,
      expected_rpe_specific: 5,
      expected_specific_duration: "0h45",
      subcategory: "Route",
      title: "Sortie locale",
      workout_type: "Endurance",
    });
  });

  it("uses one targeted write, forwards the abort signal, and maps the confirmed row", async () => {
    const insert = vi.fn().mockResolvedValue({ data: row, error: null });
    const signal = new AbortController().signal;

    await expect(createCalendarSessionService(repository(insert)).create(input, signal))
      .resolves.toMatchObject({
        id: "workout-1",
        date: "2026-08-18",
        feedback: expect.objectContaining({ validated: false }),
        nonDone: expect.objectContaining({ validated: false }),
      });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(toCalendarSessionPersistence(input), signal);
  });

  it("rejects a missing target before attempting a write", async () => {
    const insert = vi.fn();

    await expect(createCalendarSessionService(repository(insert)).create({
      ...input,
      athleteId: "",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(insert).not.toHaveBeenCalled();
  });

  it("preserves a persistence failure for the mutation executor without a hidden fallback write", async () => {
    const failure = { code: "42501" };
    const insert = vi.fn().mockResolvedValue({ data: null, error: failure });

    await expect(createCalendarSessionService(repository(insert)).create(input))
      .rejects.toBe(failure);

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("preserves the single-athlete legacy rest-day payload", () => {
    expect(toCalendarRestDayPersistence({
      athleteId: "athlete-1",
      date: "2026-08-18",
    })).toEqual({
      athlete_id: "athlete-1",
      blocks: [],
      completed: true,
      date: "2026-08-18",
      description: "Journée de récupération.",
      duration: "",
      expected_rpe: "",
      non_done: false,
      subcategory: "",
      title: "Repos",
      workout_type: "Repos",
    });
  });

  it("creates one confirmed rest day through the existing session writer", async () => {
    const insert = vi.fn().mockResolvedValue({
      data: {
        ...row,
        completed: true,
        date: "2026-08-18",
        description: "Journée de récupération.",
        duration: "",
        title: "Repos",
        workout_type: "Repos",
      },
      error: null,
    });
    const signal = new AbortController().signal;

    await expect(createCalendarSessionService(repository(insert)).createRestDay({
      athleteId: "athlete-1",
      date: "2026-08-18",
    }, signal)).resolves.toMatchObject({
      category: "Repos",
      date: "2026-08-18",
      feedback: expect.objectContaining({ validated: true }),
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      toCalendarRestDayPersistence({
        athleteId: "athlete-1",
        date: "2026-08-18",
      }),
      signal,
    );
  });

  it("rejects an incomplete rest-day target before attempting a write", async () => {
    const insert = vi.fn();

    await expect(createCalendarSessionService(repository(insert)).createRestDay({
      athleteId: "",
      date: "2026-08-18",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(insert).not.toHaveBeenCalled();
  });

  it("updates only the confirmed session adjustment", async () => {
    const updateAdjustment = vi.fn().mockResolvedValue({
      data: { ...row, adjusted_specific_duration: "45 min" },
      error: null,
    });
    const signal = new AbortController().signal;

    await expect(createCalendarSessionService(repository(undefined, updateAdjustment)).saveAdjustment({
      adjustedSpecificDuration: "45 min",
      workoutId: "workout-1",
    }, signal)).resolves.toMatchObject({
      adjustedSpecificDuration: "45 min",
      id: "workout-1",
    });

    expect(updateAdjustment).toHaveBeenCalledTimes(1);
    expect(updateAdjustment).toHaveBeenCalledWith(
      "workout-1",
      { adjusted_specific_duration: "45 min" },
      signal,
    );
  });

  it("rejects a missing workout before attempting an adjustment write", async () => {
    const updateAdjustment = vi.fn();

    await expect(createCalendarSessionService(repository(undefined, updateAdjustment)).saveAdjustment({
      adjustedSpecificDuration: "45 min",
      workoutId: "",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(updateAdjustment).not.toHaveBeenCalled();
  });

  it("updates the complete confirmed non-done payload with one targeted write", async () => {
    const updateNonDone = vi.fn().mockResolvedValue({
      data: {
        ...row,
        non_done: true,
        non_done_comment: "Trop fatigué",
        non_done_fatigue: "7",
        non_done_pain: "2",
        non_done_reason: "Fatigue",
      },
      error: null,
    });
    const signal = new AbortController().signal;

    await expect(createCalendarSessionService(repository(undefined, undefined, updateNonDone)).saveNonDone({
      nonDone: {
        comment: "Trop fatigué",
        fatigue: "7",
        pain: "2",
        reason: "Fatigue",
        validated: true,
      },
      workoutId: "workout-1",
    }, signal)).resolves.toMatchObject({
      id: "workout-1",
      nonDone: {
        comment: "Trop fatigué",
        fatigue: "7",
        pain: "2",
        reason: "Fatigue",
        validated: true,
      },
    });

    expect(updateNonDone).toHaveBeenCalledTimes(1);
    expect(updateNonDone).toHaveBeenCalledWith(
      "workout-1",
      {
        non_done: true,
        non_done_comment: "Trop fatigué",
        non_done_fatigue: "7",
        non_done_pain: "2",
        non_done_reason: "Fatigue",
      },
      signal,
    );
  });

  it("rejects a missing workout before attempting a non-done write", async () => {
    const updateNonDone = vi.fn();

    await expect(createCalendarSessionService(repository(undefined, undefined, updateNonDone)).saveNonDone({
      nonDone: {
        comment: "",
        fatigue: "",
        pain: "",
        reason: "",
        validated: true,
      },
      workoutId: "",
    })).rejects.toMatchObject({ kind: "validation" });

    expect(updateNonDone).not.toHaveBeenCalled();
  });
});
