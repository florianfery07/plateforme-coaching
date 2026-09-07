import { describe, expect, it, vi } from "vitest";

import type { WorkoutStructureV2 } from "./workout-structure-v2";
import { createWorkoutStructureV2PersistenceService } from "./workout-structure-v2-persistence";

const document: WorkoutStructureV2 = {
  schemaVersion: 1,
  blocks: [{ id: "warmup", kind: "warmup", durationSeconds: 600, isSpecific: false }],
};
const input = {
  document,
  expectedRevision: 0,
  idempotencyKey: "10000000-0000-0000-0000-000000000001",
  targetId: "20000000-0000-0000-0000-000000000001",
};
const success = { changed: true, revision: 1, specificDurationSeconds: 0, structureId: "30000000-0000-0000-0000-000000000001", totalDurationSeconds: 600 };

describe("Workout Structure V2 persistence service", () => {
  it("validates before one library RPC and maps the confirmed result", async () => {
    const repository = { saveLibrary: vi.fn().mockResolvedValue({ data: success, error: null }), saveCalendar: vi.fn(), createCalendarSnapshot: vi.fn() };
    await expect(createWorkoutStructureV2PersistenceService(repository).saveLibrary(input)).resolves.toEqual(success);
    expect(repository.saveLibrary).toHaveBeenCalledOnce();
  });

  it("does not call a repository for an invalid document", async () => {
    const repository = { saveLibrary: vi.fn(), saveCalendar: vi.fn(), createCalendarSnapshot: vi.fn() };
    await expect(createWorkoutStructureV2PersistenceService(repository).saveCalendar({ ...input, document: { schemaVersion: 1, blocks: [] } })).rejects.toThrow("workout_structure_v2_invalid");
    expect(repository.saveCalendar).not.toHaveBeenCalled();
  });

  it("maps revision conflicts and keeps snapshot persistence to one RPC", async () => {
    const repository = {
      saveLibrary: vi.fn(),
      saveCalendar: vi.fn(),
      createCalendarSnapshot: vi.fn().mockResolvedValue({ data: null, error: { message: "workout_structure_revision_conflict" } }),
    };
    await expect(createWorkoutStructureV2PersistenceService(repository).createCalendarSnapshot({
      calendarWorkoutId: input.targetId,
      libraryStructureId: success.structureId,
      idempotencyKey: input.idempotencyKey,
    })).rejects.toThrow("Cette séance a changé");
    expect(repository.createCalendarSnapshot).toHaveBeenCalledOnce();
  });
});
