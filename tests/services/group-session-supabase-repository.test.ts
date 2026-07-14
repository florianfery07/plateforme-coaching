import { describe, expect, it, vi } from "vitest";

import { createGroupSessionSupabaseRepository } from "../../src/services/groups-v2";
import type { TypedSupabaseClient } from "../../src/lib/supabase-typed";
import type { CreateGroupSessionDto } from "../../src/types/groups";

const createInput: CreateGroupSessionDto = {
  organizationId: "organization-1",
  participantMembershipIds: ["membership-1"],
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

function clientWithRpc(rpc: ReturnType<typeof vi.fn>): TypedSupabaseClient {
  return { rpc } as unknown as TypedSupabaseClient;
}

describe("group session V2 Supabase repository", () => {
  it("uses one create RPC with typed DTO keys instead of chained table writes", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { sessionId: "session-1", status: "scheduled", version: 1 },
      error: null,
    });
    const repository = createGroupSessionSupabaseRepository(clientWithRpc(rpc));

    await expect(repository.create(createInput)).resolves.toMatchObject({
      data: { sessionId: "session-1" },
      error: null,
    });
    expect(rpc).toHaveBeenCalledWith("create_group_session_v2", {
      p_organization_id: "organization-1",
      p_scheduled_for: "2026-08-01",
      p_participant_membership_ids: ["membership-1"],
      p_session_data: expect.objectContaining({
        title: "Endurance collective",
        blocks: [],
      }),
    });
  });

  it("routes every critical operation to its dedicated RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = createGroupSessionSupabaseRepository(clientWithRpc(rpc));
    const updateDraft = {
      scheduledFor: createInput.scheduledFor,
      title: createInput.title,
      workoutType: createInput.workoutType,
      subcategory: createInput.subcategory,
      description: createInput.description,
      duration: createInput.duration,
      expectedRpe: createInput.expectedRpe,
      expectedRpeGlobal: createInput.expectedRpeGlobal,
      expectedSpecificDuration: createInput.expectedSpecificDuration,
      expectedRpeSpecific: createInput.expectedRpeSpecific,
      blocks: createInput.blocks,
    };

    await repository.update({
      groupSessionId: "session-1",
      expectedVersion: 1,
      draft: updateDraft,
    });
    await repository.addParticipant({
      groupSessionId: "session-1",
      expectedVersion: 2,
      athleteMembershipId: "membership-2",
    });
    await repository.removeParticipant({
      groupSessionId: "session-1",
      expectedVersion: 3,
      athleteMembershipId: "membership-2",
    });
    await repository.duplicate({
      groupSessionId: "session-1",
      expectedVersion: 4,
      scheduledFor: "2026-08-08",
    });
    await repository.cancel({ groupSessionId: "session-1", expectedVersion: 5 });
    await repository.remove({ groupSessionId: "session-1", expectedVersion: 6 });

    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "update_group_session_v2",
      "add_group_session_participant_v2",
      "remove_group_session_participant_v2",
      "duplicate_group_session_v2",
      "cancel_group_session_v2",
      "delete_group_session_v2",
    ]);
  });
});
