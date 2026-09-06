import type { TypedSupabaseClient } from "../../lib/supabase-typed";

import type {
  PilotageTimelineRepository,
  PilotageTimelineRpcResponse,
  SavePilotageCycleInput,
  SavePilotageMilestoneInput,
} from "./types";

function result<T>(response: { data: T; error: { code?: string; message: string; status?: number } | null }): PilotageTimelineRpcResponse {
  return { data: response.data as unknown, error: response.error };
}

export function createPilotageTimelineSupabaseRepository(client: TypedSupabaseClient): PilotageTimelineRepository {
  return {
    archiveCycle: async (cycleId) => result(await client.rpc("archive_athlete_pilotage_cycle_v2", { p_cycle_id: cycleId })),
    archiveMilestone: async (milestoneId) => result(await client.rpc("archive_athlete_pilotage_milestone_v2", { p_milestone_id: milestoneId })),
    get: async (input) => result(await client.rpc("get_athlete_pilotage_timeline_v2", {
      p_legacy_athlete_id: input.legacyAthleteId,
      p_range_end: input.rangeEnd,
      p_range_start: input.rangeStart,
    })),
    saveCycle: async (input: SavePilotageCycleInput) => result(await client.rpc("save_athlete_pilotage_cycle_v2", {
      p_color_key: input.colorKey,
      p_cycle_id: input.cycleId ?? null,
      p_ends_on: input.endsOn,
      p_expected_revision: input.expectedRevision ?? null,
      p_goal_version_id: input.goalVersionId ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
      p_intent: input.intent ?? null,
      p_legacy_athlete_id: input.legacyAthleteId,
      p_name: input.name,
      p_starts_on: input.startsOn,
      // PostgreSQL RPC arguments are nullable at runtime. The local generator
      // cannot express that distinction for arguments with no SQL default.
    } as never)),
    saveMilestone: async (input: SavePilotageMilestoneInput) => result(await client.rpc("save_athlete_pilotage_milestone_v2", {
      p_details: input.details ?? null,
      p_expected_revision: input.expectedRevision ?? null,
      p_goal_version_id: input.goalVersionId ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
      p_kind: input.kind,
      p_legacy_athlete_id: input.legacyAthleteId,
      p_milestone_id: input.milestoneId ?? null,
      p_scheduled_for: input.scheduledFor,
      p_title: input.title,
      // See the matching cycle RPC: null is part of the deliberate create/update contract.
    } as never)),
  };
}
