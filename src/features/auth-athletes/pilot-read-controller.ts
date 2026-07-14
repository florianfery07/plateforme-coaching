import { resolveAccessControlMode, type AccessControlV2Context } from "../../lib/access";
import {
  compareAthleteReadSnapshots,
  type AthletesLoadResult,
  type LegacyAthleteReadSnapshot,
} from "../../services/athletes";
import type { CurrentUserContext } from "../../services/auth";
import type { RepositoryReadResult } from "../../services/read-result";

export type PageAuthState =
  | { role: "coach" }
  | { role: "athlete"; athleteId: string }
  | null;

export type LegacyAuthExpectation =
  | PageAuthState
  | { role: "archived_athlete"; athleteId: string };

export type PilotReadFallbackReason =
  | "feature_disabled"
  | "unauthenticated"
  | "server_context_unavailable"
  | "server_context_error"
  | "server_user_mismatch"
  | "legacy_snapshot_unavailable"
  | "typed_auth_unavailable"
  | "typed_athletes_unavailable"
  | "comparison_unavailable"
  | "critical_divergence"
  | "role_mismatch";

export type PilotAuthAthleteReadDecision =
  | {
      source: "legacy";
      auth: PageAuthState;
      reason: PilotReadFallbackReason;
      divergence: boolean;
    }
  | {
      source: "v2";
      auth: PageAuthState;
      athletes: AthletesLoadResult;
    };

export type PilotAuthAthleteReadDependencies = {
  featureEnabled: boolean;
  legacyAuth: LegacyAuthExpectation;
  currentUserId: string | null;
  loadServerAccessContext: () => Promise<AccessControlV2Context | null>;
  loadLegacySnapshot: () => Promise<
    RepositoryReadResult<LegacyAthleteReadSnapshot>
  >;
  loadTypedAuthContext: () => Promise<CurrentUserContext>;
  loadTypedAthletes: () => Promise<AthletesLoadResult>;
};

function pageAuthFromLegacy(
  auth: LegacyAuthExpectation,
): PageAuthState {
  return auth?.role === "archived_athlete" ? null : auth;
}

function pageAuthMatchesContext(
  legacyAuth: LegacyAuthExpectation,
  context: CurrentUserContext,
): boolean {
  if (legacyAuth === null) {
    return context.kind === "unauthenticated";
  }

  if (legacyAuth.role === "coach") {
    return context.kind === "legacy_coach";
  }

  if (legacyAuth.role === "archived_athlete") {
    return (
      context.kind === "archived_athlete" &&
      context.athleteId === legacyAuth.athleteId
    );
  }

  return (
    context.kind === "athlete" && context.athleteId === legacyAuth.athleteId
  );
}

function isUsableAthleteResult(result: AthletesLoadResult): boolean {
  return result.kind === "success" || result.kind === "empty";
}

function isUsableAuthContext(context: CurrentUserContext): boolean {
  return context.kind !== "forbidden" && context.kind !== "error";
}

function legacyDecision(
  auth: LegacyAuthExpectation,
  reason: PilotReadFallbackReason,
  divergence = false,
): PilotAuthAthleteReadDecision {
  return {
    source: "legacy",
    auth: pageAuthFromLegacy(auth),
    reason,
    divergence,
  };
}

/**
 * Chooses a pilot-only typed read only after every server and parity guard has
 * passed. Its result has the same auth shape that page.tsx already consumes.
 */
export async function resolvePilotAuthAthleteRead(
  dependencies: PilotAuthAthleteReadDependencies,
): Promise<PilotAuthAthleteReadDecision> {
  const { featureEnabled, legacyAuth, currentUserId } = dependencies;

  if (!featureEnabled) {
    return legacyDecision(legacyAuth, "feature_disabled");
  }

  if (!currentUserId) {
    return legacyDecision(legacyAuth, "unauthenticated");
  }

  let serverContext: AccessControlV2Context | null;
  try {
    serverContext = await dependencies.loadServerAccessContext();
  } catch {
    return legacyDecision(legacyAuth, "server_context_error");
  }

  if (resolveAccessControlMode(serverContext, true) !== "v2") {
    return legacyDecision(legacyAuth, "server_context_unavailable");
  }

  if (serverContext?.userId !== currentUserId) {
    return legacyDecision(legacyAuth, "server_user_mismatch", true);
  }

  let legacySnapshotResult: RepositoryReadResult<LegacyAthleteReadSnapshot>;
  let typedContext: CurrentUserContext;
  let typedAthletes: AthletesLoadResult;

  try {
    [legacySnapshotResult, typedContext, typedAthletes] = await Promise.all([
      dependencies.loadLegacySnapshot(),
      dependencies.loadTypedAuthContext(),
      dependencies.loadTypedAthletes(),
    ]);
  } catch {
    return legacyDecision(legacyAuth, "typed_auth_unavailable");
  }

  if (legacySnapshotResult.error || !legacySnapshotResult.data) {
    return legacyDecision(legacyAuth, "legacy_snapshot_unavailable");
  }

  if (!isUsableAuthContext(typedContext)) {
    return legacyDecision(legacyAuth, "typed_auth_unavailable");
  }

  if (!isUsableAthleteResult(typedAthletes)) {
    return legacyDecision(legacyAuth, "typed_athletes_unavailable");
  }

  const comparison = compareAthleteReadSnapshots(
    legacySnapshotResult.data,
    typedAthletes,
    typedContext,
  );

  if (!comparison) {
    return legacyDecision(legacyAuth, "comparison_unavailable");
  }

  const comparisonMatches = Object.values(comparison).every(Boolean);
  if (!comparisonMatches) {
    return legacyDecision(legacyAuth, "critical_divergence", true);
  }

  if (!pageAuthMatchesContext(legacyAuth, typedContext)) {
    return legacyDecision(legacyAuth, "role_mismatch", true);
  }

  return {
    source: "v2",
    auth: pageAuthFromLegacy(legacyAuth),
    athletes: typedAthletes,
  };
}

/** Logs only operational outcome categories and never user or athlete data. */
export function reportPilotReadDiagnostic(
  decision: PilotAuthAthleteReadDecision,
  environment = process.env.NODE_ENV,
): void {
  if (environment !== "development") {
    return;
  }

  if (decision.source === "v2") {
    console.info("[pilot-auth-athletes]", { path: "v2", divergence: false });
    return;
  }

  console.info("[pilot-auth-athletes]", {
    path: "legacy",
    reason: decision.reason,
    divergence: decision.divergence,
  });
}
