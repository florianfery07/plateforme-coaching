import { describe, expect, it, vi } from "vitest";

import { createPilotageTimelineService } from "./pilotage-timeline-service";
import type { PilotageTimelineRepository } from "./types";

const athleteId = "10000000-0000-0000-0000-000000000021";
const cycleId = "90000000-0000-0000-0000-000000000001";
const idempotencyKey = "91000000-0000-0000-0000-000000000001";

function repository(overrides: Partial<PilotageTimelineRepository> = {}): PilotageTimelineRepository {
  return {
    archiveCycle: vi.fn().mockResolvedValue({ data: { id: cycleId, revision: 2, changed: true }, error: null }),
    archiveMilestone: vi.fn().mockResolvedValue({ data: { id: cycleId, revision: 2, changed: true }, error: null }),
    get: vi.fn().mockResolvedValue({ data: { legacyAthleteId: athleteId, cycles: [], milestones: [] }, error: null }),
    saveCycle: vi.fn().mockResolvedValue({ data: { id: cycleId, revision: 1, changed: true }, error: null }),
    saveMilestone: vi.fn().mockResolvedValue({ data: { id: cycleId, revision: 1, changed: true }, error: null }),
    ...overrides,
  };
}

describe("pilotage timeline service", () => {
  it("validates a new cycle before its targeted RPC", async () => {
    const repo = repository();
    const service = createPilotageTimelineService(repo);

    await expect(service.saveCycle({
      legacyAthleteId: athleteId,
      name: "Préparation générale",
      startsOn: "2026-09-01",
      endsOn: "2026-09-21",
      colorKey: "blue",
      idempotencyKey,
    })).resolves.toMatchObject({ kind: "success", changed: true });
    expect(repo.saveCycle).toHaveBeenCalledTimes(1);
  });

  it("requires an accepted Goals V2 version for a dated goal", async () => {
    const service = createPilotageTimelineService(repository());

    await expect(service.saveMilestone({
      legacyAthleteId: athleteId,
      kind: "goal",
      title: "France CX",
      scheduledFor: "2026-10-12",
      idempotencyKey,
    })).rejects.toThrow("Sélectionnez un objectif V2 accepté");
  });

  it("rejects stale update identities before calling the RPC", async () => {
    const repo = repository();
    const service = createPilotageTimelineService(repo);

    await expect(service.saveCycle({
      cycleId,
      legacyAthleteId: athleteId,
      name: "Préparation générale",
      startsOn: "2026-09-01",
      endsOn: "2026-09-21",
      colorKey: "blue",
      expectedRevision: 0,
    })).rejects.toThrow("mise à jour du pilotage est invalide");
    expect(repo.saveCycle).not.toHaveBeenCalled();
  });

  it("returns a safe conflict message from a concurrent update", async () => {
    const service = createPilotageTimelineService(repository({
      saveCycle: vi.fn().mockResolvedValue({ data: null, error: { message: "pilotage_timeline_state_conflict" } }),
    }));

    await expect(service.saveCycle({
      cycleId,
      legacyAthleteId: athleteId,
      name: "Préparation générale",
      startsOn: "2026-09-01",
      endsOn: "2026-09-21",
      colorKey: "blue",
      expectedRevision: 1,
    })).resolves.toMatchObject({ kind: "error", error: "conflict" });
  });
});
