import { isFeatureEnabled } from "../features";
import { parseAccessControlV2Context } from "./parse-access-context-v2";
import type {
  AccessContextRpcClient,
  AccessControlMode,
  AccessControlV2Context,
} from "./types";

/**
 * Reads a server-derived V2 context. A missing or invalid context keeps callers
 * on legacy; this helper never grants an authorization by itself.
 */
export async function loadAccessControlV2Context(
  client: AccessContextRpcClient,
  featureEnabled = isFeatureEnabled("accessControlV2"),
): Promise<AccessControlV2Context | null> {
  if (!featureEnabled) {
    return null;
  }

  const { data, error } = await client.rpc("get_access_context_v2");

  if (error) {
    return null;
  }

  return parseAccessControlV2Context(data);
}

export function resolveAccessControlMode(
  context: AccessControlV2Context | null,
  featureEnabled = isFeatureEnabled("accessControlV2"),
): AccessControlMode {
  if (featureEnabled && context?.accountStatus === "active" && context.isPilot) {
    return "v2";
  }

  return "legacy";
}

/**
 * Exposes only a permission already computed by the server. It is for UI
 * branching and cannot replace a database policy or RPC authorization check.
 */
export function getServerDerivedAthletePermission(
  context: AccessControlV2Context | null,
  athleteMembershipId: string,
): { canAccess: boolean; canManage: boolean } {
  const permission = context?.athletePermissions.find(
    (candidate) => candidate.athleteMembershipId === athleteMembershipId,
  );

  return {
    canAccess: permission?.canAccess === true,
    canManage: permission?.canManage === true,
  };
}
