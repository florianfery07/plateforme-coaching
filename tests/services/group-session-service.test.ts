import { describe, expect, it, vi } from "vitest";

import { createGroupSessionService } from "../../src/services/groups-v2";
import type { GroupSessionRepository } from "../../src/services/groups-v2";
import type { CreateGroupSessionDto } from "../../src/types/groups";

const draft: CreateGroupSessionDto = {
  organizationId: "organization-1",
  participantMembershipIds: ["athlete-membership-1"],
  scheduledFor: "2026-08-01",
  title: "Endurance collective",
  workoutType: "Endurance",
  subcategory: "",
  description: "",
  duration: "1h30",
  expectedRpe: "",
  expectedRpeGlobal: null,
  expectedSpecificDuration: "",
  expectedRpeSpecific: null,
  blocks: [],
};

function repository(
  response: { data: unknown; error: { code?: string; message: string } | null },
): GroupSessionRepository {
  return {
    create: vi.fn().mockResolvedValue(response),
    update: vi.fn().mockResolvedValue(response),
    addParticipant: vi.fn().mockResolvedValue(response),
    removeParticipant: vi.fn().mockResolvedValue(response),
    duplicate: vi.fn().mockResolvedValue(response),
    cancel: vi.fn().mockResolvedValue(response),
    remove: vi.fn().mockResolvedValue(response),
  };
}

const success = {
  data: { sessionId: "session-1", status: "scheduled", version: 1 },
  error: null,
};

describe("group session V2 service", () => {
  it("validates a create input before it reaches the repository", async () => {
    const port = repository(success);
    const service = createGroupSessionService(port);

    await expect(
      service.create({ ...draft, participantMembershipIds: [] }),
    ).resolves.toMatchObject({ kind: "error", error: "validation" });
    expect(port.create).not.toHaveBeenCalled();
  });

  it("returns the typed operation emitted by one transactional RPC", async () => {
    const service = createGroupSessionService(repository(success));

    await expect(service.create(draft)).resolves.toEqual({
      kind: "success",
      operation: { sessionId: "session-1", status: "scheduled", version: 1 },
    });
  });

  it("maps version conflicts and permissions without leaking database details", async () => {
    await expect(
      createGroupSessionService(
        repository({ data: null, error: { message: "Group session version conflict" } }),
      ).cancel({ groupSessionId: "session-1", expectedVersion: 1 }),
    ).resolves.toMatchObject({ kind: "error", error: "conflict" });

    await expect(
      createGroupSessionService(
        repository({ data: null, error: { code: "42501", message: "Denied" } }),
      ).remove({ groupSessionId: "session-1", expectedVersion: 1 }),
    ).resolves.toMatchObject({ kind: "error", error: "permission" });
  });

  it("guards versioned participant and duplicate operations", async () => {
    const port = repository(success);
    const service = createGroupSessionService(port);

    await expect(
      service.addParticipant({
        groupSessionId: "session-1",
        expectedVersion: 0,
        athleteMembershipId: "athlete-membership-1",
      }),
    ).resolves.toMatchObject({ kind: "error", error: "validation" });
    await expect(
      service.duplicate({
        groupSessionId: "session-1",
        expectedVersion: 1,
        scheduledFor: "not-a-date",
      }),
    ).resolves.toMatchObject({ kind: "error", error: "validation" });
    expect(port.addParticipant).not.toHaveBeenCalled();
    expect(port.duplicate).not.toHaveBeenCalled();
  });
});
