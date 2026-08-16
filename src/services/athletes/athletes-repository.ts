import type { TypedSupabaseClient } from "../../lib/supabase-typed";
import type { ReadFailure } from "../read-result";
import type {
  AthletesRepository,
  LegacyAthleteDirectoryRepository,
} from "./types";

function toReadFailure(error: { code?: string; message: string } | null): ReadFailure | null {
  return error ? { code: error.code, message: error.message } : null;
}

export function createAthletesRepository(
  client: TypedSupabaseClient,
): AthletesRepository & LegacyAthleteDirectoryRepository {
  return {
    async listAthletes() {
      const { data, error } = await client
        .from("athletes")
        .select("id, name, email, sport, active, color")
        .order("created_at", { ascending: true });

      return { data, error: toReadFailure(error) };
    },
    async listLegacyAthleteDirectory() {
      const { data, error } = await client
        .from("athletes")
        .select(
          "id, name, weight, power5, power12, power20, email, age, height, sport, short_goal, medium_goal, long_goal, context, goal_update_requested, user_id, active, color",
        )
        .order("created_at", { ascending: true });

      return { data, error: toReadFailure(error) };
    },
  };
}
