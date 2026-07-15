import type { TypedSupabaseClient } from "../../lib/supabase-typed";
import type { LegacyGroupBridgeRepository } from "./legacy-group-bridge";

export function createLegacyGroupBridgeSupabaseRepository(
  client: TypedSupabaseClient,
): LegacyGroupBridgeRepository {
  return {
    async resolve(legacyGroupId) {
      const { data, error } = await client.rpc("resolve_legacy_group_bridge_v2", {
        p_legacy_group_id: legacyGroupId,
      });
      return { data, error: error ? { message: error.message } : null };
    },
  };
}
