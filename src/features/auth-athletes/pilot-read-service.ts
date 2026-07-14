import { loadAccessControlV2Context } from "../../lib/access";
import { isFeatureEnabled } from "../../lib/features";
import {
  createTypedSupabaseClient,
  type TypedSupabaseClient,
} from "../../lib/supabase-typed";
import { createAthletesRepository, loadAthletes } from "../../services/athletes";
import { createAuthRepository, loadCurrentUserContext } from "../../services/auth";
import type { RepositoryReadResult } from "../../services/read-result";
import {
  resolvePilotAuthAthleteRead,
  type LegacyAuthExpectation,
  type PilotAuthAthleteReadDecision,
} from "./pilot-read-controller";
import type { LegacyAthleteReadSnapshot } from "../../services/athletes";

type LegacyAthleteSnapshotClient = {
  from: (table: "athletes") => {
    select: (columns: "id, active") => {
      order: (
        column: "created_at",
        options: { ascending: true },
      ) => Promise<{
        data: unknown[] | null;
        error: { code?: string; message: string } | null;
      }>;
    };
  };
};

function createPilotTypedClient(): TypedSupabaseClient {
  return createTypedSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function isLegacyAthleteRow(
  row: unknown,
): row is { id: string; active: boolean } {
  return (
    typeof row === "object" &&
    row !== null &&
    !Array.isArray(row) &&
    typeof (row as { id?: unknown }).id === "string" &&
    typeof (row as { active?: unknown }).active === "boolean"
  );
}

async function loadLegacyAthleteSnapshot(
  client: LegacyAthleteSnapshotClient,
  currentUserId: string,
): Promise<RepositoryReadResult<LegacyAthleteReadSnapshot>> {
  const { data, error } = await client
    .from("athletes")
    .select("id, active")
    .order("created_at", { ascending: true });

  if (error) {
    return { data: null, error: { code: error.code, message: error.message } };
  }

  const rows = data ?? [];
  if (!rows.every(isLegacyAthleteRow)) {
    return {
      data: null,
      error: { message: "Legacy athlete snapshot has an unexpected shape." },
    };
  }

  return {
    data: {
      activeAthleteIds: rows.filter((row) => row.active).map((row) => row.id),
      archivedAthleteIds: rows.filter((row) => !row.active).map((row) => row.id),
      currentUserId,
    },
    error: null,
  };
}

/**
 * Runs the L07b pilot read. All dependencies are reads; the V2 client is only
 * constructed after the public flag has been explicitly enabled.
 */
export async function loadPilotAuthAthleteRead(
  legacyClient: LegacyAthleteSnapshotClient,
  legacyAuth: LegacyAuthExpectation,
  currentUserId: string | null,
  featureEnabled = isFeatureEnabled("accessControlV2"),
): Promise<PilotAuthAthleteReadDecision> {
  let typedClient: TypedSupabaseClient | null = null;
  const getTypedClient = () => {
    typedClient ??= createPilotTypedClient();
    return typedClient;
  };

  return resolvePilotAuthAthleteRead({
    featureEnabled,
    legacyAuth,
    currentUserId,
    loadServerAccessContext: () =>
      loadAccessControlV2Context(
        {
          rpc: async (functionName) => getTypedClient().rpc(functionName),
        },
        featureEnabled,
      ),
    loadLegacySnapshot: () =>
      loadLegacyAthleteSnapshot(legacyClient, currentUserId ?? ""),
    loadTypedAuthContext: () =>
      loadCurrentUserContext(createAuthRepository(getTypedClient())),
    loadTypedAthletes: () => loadAthletes(createAthletesRepository(getTypedClient())),
  });
}
