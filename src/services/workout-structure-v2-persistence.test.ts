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
const calendarSuccess = { ...success, calendarWorkoutId: "40000000-0000-0000-0000-000000000001", calendarWorkout: { id: "40000000-0000-0000-0000-000000000001" } };
const groupSuccess = { ...success, groupSessionId: "50000000-0000-0000-0000-000000000001", groupVersion: 1, groupSession: { id: "50000000-0000-0000-0000-000000000001" } };
const repository = () => ({ createCalendar: vi.fn(), createGroup: vi.fn(), createLibrary: vi.fn(), getCalendar: vi.fn(), getGroup: vi.fn(), getLibrary: vi.fn(), saveLibrary: vi.fn(), saveCalendar: vi.fn(), createCalendarSnapshot: vi.fn(), updateCalendar: vi.fn(), updateGroup: vi.fn() });

describe("Workout Structure V2 persistence service", () => {
  it("validates before one library RPC and maps the confirmed result", async () => {
    const client = repository(); client.saveLibrary.mockResolvedValue({ data: success, error: null });
    await expect(createWorkoutStructureV2PersistenceService(client).saveLibrary(input)).resolves.toEqual(success);
    expect(client.saveLibrary).toHaveBeenCalledOnce();
  });

  it("does not call a repository for an invalid document", async () => {
    const client = repository();
    await expect(createWorkoutStructureV2PersistenceService(client).saveCalendar({ ...input, document: { schemaVersion: 1, blocks: [] } })).rejects.toThrow("workout_structure_v2_invalid");
    expect(client.saveCalendar).not.toHaveBeenCalled();
  });

  it("maps revision conflicts and keeps snapshot persistence to one RPC", async () => {
    const client = repository(); client.createCalendarSnapshot.mockResolvedValue({ data: null, error: { message: "workout_structure_revision_conflict" } });
    await expect(createWorkoutStructureV2PersistenceService(client).createCalendarSnapshot({
      calendarWorkoutId: input.targetId,
      libraryStructureId: success.structureId,
      idempotencyKey: input.idempotencyKey,
    })).rejects.toThrow("Cette séance a changé");
    expect(client.createCalendarSnapshot).toHaveBeenCalledOnce();
  });

  it("creates a V2 library workout with one confirmed RPC and reads its canonical revision", async () => {
    const client = repository(); client.createLibrary.mockResolvedValue({ data: { ...success, libraryWorkoutId: input.targetId }, error: null }); client.getLibrary.mockResolvedValue({ data: { ...success, document }, error: null });
    const service = createWorkoutStructureV2PersistenceService(client);
    await expect(service.createLibrary({
      category: "Route", description: "", document, expectedRpeGlobal: 6, expectedRpeSpecific: null,
      idempotencyKey: input.idempotencyKey, subcategory: "VO2", title: "VO2 court",
    })).resolves.toMatchObject({ libraryWorkoutId: input.targetId, revision: 1 });
    await expect(service.getLibrary(input.targetId)).resolves.toMatchObject({ document, revision: 1 });
    expect(client.createLibrary).toHaveBeenCalledOnce();
    expect(client.getLibrary).toHaveBeenCalledOnce();
  });

  it("creates one calendar parent and snapshot through one confirmed RPC", async () => {
    const client = repository(); client.createCalendar.mockResolvedValue({ data: calendarSuccess, error: null });
    const service = createWorkoutStructureV2PersistenceService(client);
    await expect(service.createCalendar({
      athleteId: "20000000-0000-0000-0000-000000000001", category: "Route", date: "2026-09-10", description: "", document,
      expectedRpeGlobal: 6, expectedRpeSpecific: null, idempotencyKey: input.idempotencyKey, libraryWorkoutId: null, subcategory: "VO2", title: "VO2 calendrier",
    })).resolves.toMatchObject({ calendarWorkoutId: calendarSuccess.calendarWorkoutId, changed: true });
    expect(client.createCalendar).toHaveBeenCalledOnce();
  });

  it("updates only the calendar snapshot with its expected revision", async () => {
    const client = repository(); client.updateCalendar.mockResolvedValue({ data: { ...calendarSuccess, revision: 2 }, error: null });
    const service = createWorkoutStructureV2PersistenceService(client);
    await expect(service.updateCalendar({
      calendarWorkoutId: calendarSuccess.calendarWorkoutId, category: "Route", description: "Nouvelle consigne", document, expectedRevision: 1,
      expectedRpeGlobal: 6, expectedRpeSpecific: null, idempotencyKey: input.idempotencyKey, subcategory: "VO2", title: "VO2 calendrier",
    })).resolves.toMatchObject({ calendarWorkoutId: calendarSuccess.calendarWorkoutId, revision: 2 });
    expect(client.updateCalendar).toHaveBeenCalledOnce();
  });

  it("creates and reads one canonical structured group session without a calendar workout", async () => {
    const client = repository(); client.createGroup.mockResolvedValue({ data: groupSuccess, error: null }); client.getGroup.mockResolvedValue({ data: { ...success, document }, error: null });
    const service = createWorkoutStructureV2PersistenceService(client);
    await expect(service.createGroup({ organizationId: "20000000-0000-0000-0000-000000000001", participantMembershipIds: ["30000000-0000-0000-0000-000000000001"], scheduledFor: "2026-09-10", category: "Route", description: "", document, expectedRpeGlobal: 6, expectedRpeSpecific: null, idempotencyKey: input.idempotencyKey, libraryWorkoutId: null, subcategory: "VO2", title: "VO2 groupe" })).resolves.toMatchObject({ groupSessionId: groupSuccess.groupSessionId, changed: true });
    await expect(service.getGroup(groupSuccess.groupSessionId)).resolves.toMatchObject({ document, revision: 1 });
    expect(client.createGroup).toHaveBeenCalledOnce();
    expect(client.getGroup).toHaveBeenCalledOnce();
  });
});
