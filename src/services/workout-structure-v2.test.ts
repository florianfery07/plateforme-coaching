import { describe, expect, it } from "vitest";

import {
  WORKOUT_STRUCTURE_V2_SCHEMA_VERSION,
  WorkoutStructureValidationError,
  calculateBlockDurationSeconds,
  calculateRepeatDurationSeconds,
  calculateSpecificDurationSeconds,
  calculateTotalDurationSeconds,
  deriveWorkoutMetrics,
  formatWorkoutDurationV2,
  getCompactWorkoutBlocksV2,
  validateWorkoutStructureV2,
  type AtomicStepV2,
  type RepeatBlockV2,
  type WorkoutStructureV2,
} from "./workout-structure-v2";

function step(overrides: Partial<AtomicStepV2> = {}): AtomicStepV2 {
  return {
    durationSeconds: 300,
    id: "step-1",
    isSpecific: false,
    kind: "effort",
    ...overrides,
  };
}

function repeat(overrides: Partial<RepeatBlockV2> = {}): RepeatBlockV2 {
  return {
    id: "repeat-1",
    kind: "repeat",
    repetitions: 5,
    steps: [
      step({ durationSeconds: 240, id: "effort-1", intensity: { zone: "Z5" }, isSpecific: true }),
      step({ durationSeconds: 240, id: "recovery-1", kind: "recovery" }),
    ],
    ...overrides,
  };
}

function structure(blocks: WorkoutStructureV2["blocks"]): WorkoutStructureV2 {
  return { blocks, schemaVersion: WORKOUT_STRUCTURE_V2_SCHEMA_VERSION };
}

describe("Workout Structure V2 contract", () => {
  it("calculates a deterministic total and specific duration for atomic steps and repeats", () => {
    const workout = structure([
      step({ durationSeconds: 1_200, id: "warmup", kind: "warmup" }),
      repeat(),
      step({ durationSeconds: 900, id: "cooldown", kind: "cooldown" }),
    ]);

    expect(deriveWorkoutMetrics(workout)).toEqual({
      atomicStepCount: 12,
      specificDurationSeconds: 1_200,
      specificStepCount: 5,
      totalDurationSeconds: 4_500,
    });
    expect(calculateTotalDurationSeconds(workout)).toBe(4_500);
    expect(calculateSpecificDurationSeconds(workout)).toBe(1_200);
  });

  it("keeps recovery outside the specific duration unless the coach explicitly marks it", () => {
    const workout = structure([repeat({
      steps: [
        step({ durationSeconds: 240, id: "effort", intensity: { zone: "Z5" }, isSpecific: true }),
        step({ durationSeconds: 240, id: "recovery", isSpecific: true, kind: "recovery" }),
      ],
    })]);

    expect(calculateSpecificDurationSeconds(workout)).toBe(2_400);
  });

  it("supports a valid structure without a specific part", () => {
    const workout = structure([
      step({ durationSeconds: 1_200, id: "warmup", kind: "warmup" }),
      step({ durationSeconds: 1_800, id: "easy", kind: "free" }),
    ]);

    expect(deriveWorkoutMetrics(workout).specificDurationSeconds).toBe(0);
  });

  it("calculates standalone simple and repeat block durations", () => {
    expect(calculateBlockDurationSeconds(step({ durationSeconds: 900 }))).toBe(900);
    expect(calculateRepeatDurationSeconds(repeat())).toBe(2_400);
  });

  it("creates compact deterministic athlete-readable segments without text heuristics", () => {
    const compact = getCompactWorkoutBlocksV2(structure([
      step({ durationSeconds: 1_200, id: "warmup", kind: "warmup" }),
      repeat(),
      step({ durationSeconds: 900, id: "cooldown", kind: "cooldown" }),
    ]));

    expect(compact).toEqual([
      expect.objectContaining({ title: "Échauffement", detail: "20'" }),
      expect.objectContaining({ title: "5 ×", detail: "4' Z5 / 4' récup" }),
      expect.objectContaining({ title: "Retour au calme", detail: "15'" }),
    ]);
  });

  it("supports percentage CP and target RPE without a zone", () => {
    const workout = structure([step({
      id: "threshold",
      intensity: { powerPercentCp: { min: 91, max: 105 }, targetRpe: 7 },
    })]);

    expect(validateWorkoutStructureV2(workout)).toMatchObject({ valid: true });
    expect(getCompactWorkoutBlocksV2(workout)[0].detail).toBe("5' 91-105% CP · RPE 7");
  });

  it("accepts bounded training values and rejects values beyond the explicit limits", () => {
    const bounded = structure([repeat({
      repetitions: 100,
      steps: [step({ durationSeconds: 86_400, id: "long-step" })],
    })]);
    const excessive = structure([step({ durationSeconds: 86_401 })]);

    expect(validateWorkoutStructureV2(bounded)).toMatchObject({ valid: true });
    expect(validateWorkoutStructureV2(excessive)).toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "invalid_duration" })]),
    });
  });

  it.each([
    ["zero duration", structure([step({ durationSeconds: 0 })]), "invalid_duration"],
    ["negative duration", structure([step({ durationSeconds: -1 })]), "invalid_duration"],
    ["zero repetitions", structure([repeat({ repetitions: 0 })]), "invalid_repetitions"],
    ["invalid zone", structure([step({ intensity: { zone: "Z8" as never } })]), "invalid_zone"],
    ["invalid percentage", structure([step({ intensity: { powerPercentCp: { min: 120, max: 110 } } })]), "invalid_intensity"],
    ["invalid schema", { blocks: [step()], schemaVersion: 2 }, "invalid_schema_version"],
    ["empty structure", structure([]), "structure_empty"],
    ["missing explicit specific flag", { blocks: [{ durationSeconds: 300, id: "missing", kind: "effort" }], schemaVersion: 1 }, "invalid_specific_flag"],
  ])("rejects %s", (_name, value, code) => {
    const result = validateWorkoutStructureV2(value);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.map((entry) => entry.code)).toContain(code);
  });

  it("rejects a nested repeat, duplicate IDs and non-finite values", () => {
    const nested = {
      blocks: [{ id: "repeat", kind: "repeat", repetitions: 2, steps: [{ id: "nested", kind: "repeat", repetitions: 2, steps: [] }] }],
      schemaVersion: 1,
    };
    const duplicates = structure([step({ id: "same" }), step({ id: "same" })]);
    const nonFinite = structure([step({ durationSeconds: Number.POSITIVE_INFINITY })]);

    expect(validateWorkoutStructureV2(nested)).toMatchObject({ valid: false, issues: expect.arrayContaining([expect.objectContaining({ code: "unsupported_nested_repeat" })]) });
    expect(validateWorkoutStructureV2(duplicates)).toMatchObject({ valid: false, issues: expect.arrayContaining([expect.objectContaining({ code: "invalid_id" })]) });
    expect(validateWorkoutStructureV2(nonFinite)).toMatchObject({ valid: false, issues: expect.arrayContaining([expect.objectContaining({ code: "invalid_duration" })]) });
  });

  it("does not mutate the input document while deriving metrics or compact blocks", () => {
    const workout = structure([repeat()]);
    const before = structuredClone(workout);

    deriveWorkoutMetrics(workout);
    getCompactWorkoutBlocksV2(workout);

    expect(workout).toEqual(before);
  });

  it("rejects invalid data with explicit domain errors before calculation", () => {
    expect(() => calculateTotalDurationSeconds(structure([]))).toThrow(WorkoutStructureValidationError);
    expect(() => formatWorkoutDurationV2(0)).toThrow(WorkoutStructureValidationError);
    expect(formatWorkoutDurationV2(3_600)).toBe("1h");
    expect(formatWorkoutDurationV2(5_400)).toBe("1h30");
  });
});
