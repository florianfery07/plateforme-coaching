import type { TypedSupabaseClient } from "../../lib/supabase-typed";
import type { ReadFailure, RepositoryReadResult } from "../read-result";
import type {
  AuthRepository,
  AuthSessionSnapshot,
  LegacyAthleteIdentity,
  LegacyRole,
} from "./types";

function toReadFailure(error: { code?: string; message: string } | null): ReadFailure | null {
  return error ? { code: error.code, message: error.message } : null;
}

export function createAuthRepository(client: TypedSupabaseClient): AuthRepository {
  return {
    async getSession(): Promise<RepositoryReadResult<AuthSessionSnapshot>> {
      const { data, error } = await client.auth.getSession();
      const user = data.session?.user;

      return {
        data: user ? { user: { id: user.id, email: user.email ?? null } } : null,
        error: toReadFailure(error),
      };
    },

    async findAthleteByUserId(
      userId: string,
    ): Promise<RepositoryReadResult<LegacyAthleteIdentity>> {
      const { data, error } = await client
        .from("athletes")
        .select("id, active")
        .eq("user_id", userId)
        .maybeSingle();

      return { data, error: toReadFailure(error) };
    },

    async findLegacyRoleByUserId(
      userId: string,
    ): Promise<RepositoryReadResult<{ role: LegacyRole }>> {
      const { data, error } = await client
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      return { data, error: toReadFailure(error) };
    },
  };
}
