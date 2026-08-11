import { resolveAccessControlMode, type AccessControlV2Context } from "../lib/access";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AthleteLifecycleStatus = "active" | "archived";

type AthleteLifecycleRpcClient = {
  rpc: (
    functionName: "archive_legacy_athlete_v2" | "restore_legacy_athlete_v2",
    args: { p_legacy_athlete_id: string },
  ) => Promise<{
    data: unknown;
    error: { code?: string; message: string; status?: number } | null;
  }>;
};

export type AthleteLifecycleResult =
  | { kind: "success"; athleteId: string; status: AthleteLifecycleStatus; changed: boolean }
  | { kind: "error"; error: "permission" | "unavailable" | "validation" | "unknown"; message: string };

function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function failure(error: { code?: string; message: string; status?: number } | null): AthleteLifecycleResult {
  if (error?.code === "42501" || error?.status === 401 || error?.status === 403 || error?.message === "athlete_lifecycle_permission_denied") {
    return { kind: "error", error: "permission", message: "Vous n’êtes pas autorisé à modifier cet athlète." };
  }
  if (error?.message?.startsWith("athlete_lifecycle_")) {
    return { kind: "error", error: "unavailable", message: "Cet athlète ne peut pas être modifié par le pilote V2." };
  }
  return { kind: "error", error: "unknown", message: "La modification du statut de l’athlète a échoué." };
}

function parseResult(value: unknown, expectedStatus: AthleteLifecycleStatus): AthleteLifecycleResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { kind: "error", error: "unavailable", message: "Cet athlète ne peut pas être modifié par le pilote V2." };
  }

  const candidate = value as { athleteId?: unknown; changed?: unknown; status?: unknown };
  if (!isUuid(candidate.athleteId) || typeof candidate.changed !== "boolean" || candidate.status !== expectedStatus) {
    return { kind: "error", error: "unavailable", message: "Cet athlète ne peut pas être modifié par le pilote V2." };
  }

  return { kind: "success", athleteId: candidate.athleteId, changed: candidate.changed, status: expectedStatus };
}

/** The client only selects a pilot path; the database RPC remains authoritative. */
export function shouldUseAthleteLifecycleV2(
  context: AccessControlV2Context | null,
  featureEnabled: boolean,
): boolean {
  return featureEnabled && resolveAccessControlMode(context, true) === "v2";
}

export function createAthleteLifecycleService(client: AthleteLifecycleRpcClient) {
  async function run(
    functionName: "archive_legacy_athlete_v2" | "restore_legacy_athlete_v2",
    athleteId: string,
    expectedStatus: AthleteLifecycleStatus,
  ): Promise<AthleteLifecycleResult> {
    if (!isUuid(athleteId)) {
      return { kind: "error", error: "validation", message: "L’athlète sélectionné est invalide." };
    }

    const response = await client.rpc(functionName, { p_legacy_athlete_id: athleteId });
    return response.error ? failure(response.error) : parseResult(response.data, expectedStatus);
  }

  return {
    archive: (athleteId: string) => run("archive_legacy_athlete_v2", athleteId, "archived"),
    restore: (athleteId: string) => run("restore_legacy_athlete_v2", athleteId, "active"),
  };
}
