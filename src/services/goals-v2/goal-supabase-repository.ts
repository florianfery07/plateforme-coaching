import { supabase } from "../../lib/supabase";

import type {
  GoalRpcResponse,
  GoalsV2Repository,
  OpenGoalRequestInput,
  ReviewGoalRequestInput,
  SubmitGoalVersionInput,
} from "./types";

async function response(query: PromiseLike<{ data: unknown; error: { code?: string; message?: string; status?: number } | null }>): Promise<GoalRpcResponse> {
  const result = await query;
  return { data: result.data, error: result.error };
}

export const goalsV2Repository: GoalsV2Repository = {
  open(input: OpenGoalRequestInput) {
    return response(supabase.rpc("open_athlete_goal_request_v2", {
      p_legacy_athlete_id: input.legacyAthleteId,
      p_idempotency_key: input.idempotencyKey,
    }));
  },
  cancel(requestId: string) {
    return response(supabase.rpc("cancel_athlete_goal_request_v2", { p_request_id: requestId }));
  },
  submit(input: SubmitGoalVersionInput) {
    return response(supabase.rpc("submit_athlete_goal_version_v2", {
      p_request_id: input.requestId,
      p_short_goal: input.shortGoal ?? null,
      p_medium_goal: input.mediumGoal ?? null,
      p_long_goal: input.longGoal ?? null,
      p_idempotency_key: input.idempotencyKey,
    }));
  },
  accept(requestId: string, reviewNote?: string | null) {
    return response(supabase.rpc("accept_athlete_goal_request_v2", {
      p_request_id: requestId,
      p_review_note: reviewNote ?? null,
    }));
  },
  requestChanges(input: ReviewGoalRequestInput) {
    return response(supabase.rpc("request_athlete_goal_changes_v2", {
      p_request_id: input.requestId,
      p_review_note: input.reviewNote,
    }));
  },
  getCurrent(legacyAthleteId: string) {
    return response(supabase.rpc("get_athlete_current_goal_v2", { p_legacy_athlete_id: legacyAthleteId }));
  },
  listHistory(legacyAthleteId: string) {
    return response(supabase.rpc("list_athlete_goal_history_v2", { p_legacy_athlete_id: legacyAthleteId }));
  },
};
