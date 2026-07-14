import type { TypedSupabaseClient } from "../../lib/supabase-typed";
import type { ReadFailure } from "../read-result";
import type { AthletesRepository } from "./types";

function toReadFailure(error: { code?: string; message: string } | null): ReadFailure | null {
  return error ? { code: error.code, message: error.message } : null;
}

export function createAthletesRepository(
  client: TypedSupabaseClient,
): AthletesRepository {
  return {
    async listAthletes() {
      const { data, error } = await client
        .from("athletes")
        .select("id, name, email, sport, active, color")
        .order("created_at", { ascending: true });

      return { data, error: toReadFailure(error) };
    },
  };
}
