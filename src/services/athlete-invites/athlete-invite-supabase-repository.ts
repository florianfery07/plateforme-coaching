import type { TypedSupabaseClient } from "../../lib/supabase-typed";
import type { AthleteInviteRepository } from "./types";

function result<T>(response: { data: T; error: { code?: string; message: string; status?: number } | null }) {
  return { data: response.data as unknown, error: response.error };
}

export function createAthleteInviteSupabaseRepository(
  client: TypedSupabaseClient,
): AthleteInviteRepository {
  return {
    create: async (input) => result(await client.rpc("create_athlete_invite_v2", {
      p_legacy_athlete_id: input.legacyAthleteId,
      p_coach_membership_id: input.coachMembershipId,
    })),
    list: async (input) => result(await client.rpc("list_athlete_invites_v2", {
      p_legacy_athlete_id: input.legacyAthleteId,
      p_coach_membership_id: input.coachMembershipId,
    })),
    revoke: async (input) => result(await client.rpc("revoke_athlete_invite_v2", {
      p_invite_id: input.inviteId,
      p_coach_membership_id: input.coachMembershipId,
    })),
    consume: async (token) => result(await client.rpc("consume_athlete_invite_v2", { p_token: token })),
  };
}
