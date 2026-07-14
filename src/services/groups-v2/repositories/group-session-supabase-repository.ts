import type { Json } from "../../../types/database";
import type {
  CreateGroupSessionDto,
  DuplicateGroupSessionDto,
  GroupSessionParticipantDto,
  GroupSessionVersionedDto,
  UpdateGroupSessionDto,
} from "../../../types/groups";
import type { TypedSupabaseClient } from "../../../lib/supabase-typed";

import type {
  GroupSessionPersistenceError,
  GroupSessionRepository,
  GroupSessionRepositoryResult,
} from "../types";

function toPersistenceError(
  error: { code?: string; message: string; status?: number } | null,
): GroupSessionPersistenceError | null {
  return error
    ? { code: error.code, message: error.message, status: error.status }
    : null;
}

function toSessionData(input: {
  scheduledFor?: string;
  title: string;
  workoutType: string;
  subcategory: string;
  description: string;
  duration: string;
  expectedRpe: string;
  expectedRpeGlobal: number | null;
  expectedSpecificDuration: string;
  expectedRpeSpecific: number | null;
  blocks: Json;
}): Json {
  const sessionData: Record<string, Json> = {
    title: input.title,
    workoutType: input.workoutType,
    subcategory: input.subcategory,
    description: input.description,
    duration: input.duration,
    expectedRpe: input.expectedRpe,
    expectedRpeGlobal: input.expectedRpeGlobal,
    expectedSpecificDuration: input.expectedSpecificDuration,
    expectedRpeSpecific: input.expectedRpeSpecific,
    blocks: input.blocks,
  };

  if (input.scheduledFor !== undefined) {
    sessionData.scheduledFor = input.scheduledFor;
  }

  return sessionData;
}

function result(data: Json | null, error: { code?: string; message: string; status?: number } | null): GroupSessionRepositoryResult {
  return { data, error: toPersistenceError(error) };
}

export function createGroupSessionSupabaseRepository(
  client: TypedSupabaseClient,
): GroupSessionRepository {
  return {
    async create(input: CreateGroupSessionDto) {
      const { data, error } = await client.rpc("create_group_session_v2", {
        p_organization_id: input.organizationId,
        p_scheduled_for: input.scheduledFor,
        p_session_data: toSessionData(input),
        p_participant_membership_ids: input.participantMembershipIds,
      });
      return result(data, error);
    },
    async update(input: UpdateGroupSessionDto) {
      const { data, error } = await client.rpc("update_group_session_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
        p_session_data: toSessionData(input.draft),
      });
      return result(data, error);
    },
    async addParticipant(input: GroupSessionParticipantDto) {
      const { data, error } = await client.rpc("add_group_session_participant_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
        p_athlete_membership_id: input.athleteMembershipId,
      });
      return result(data, error);
    },
    async removeParticipant(input: GroupSessionParticipantDto) {
      const { data, error } = await client.rpc("remove_group_session_participant_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
        p_athlete_membership_id: input.athleteMembershipId,
      });
      return result(data, error);
    },
    async duplicate(input: DuplicateGroupSessionDto) {
      const { data, error } = await client.rpc("duplicate_group_session_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
        p_scheduled_for: input.scheduledFor,
      });
      return result(data, error);
    },
    async cancel(input: GroupSessionVersionedDto) {
      const { data, error } = await client.rpc("cancel_group_session_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
      });
      return result(data, error);
    },
    async remove(input: GroupSessionVersionedDto) {
      const { data, error } = await client.rpc("delete_group_session_v2", {
        p_group_session_id: input.groupSessionId,
        p_expected_version: input.expectedVersion,
      });
      return result(data, error);
    },
  };
}
