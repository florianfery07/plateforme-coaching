import type { CurrentUserContext } from "../auth";
import type { AthletesLoadResult } from "./types";

export type LegacyAthleteReadSnapshot = {
  activeAthleteIds: string[];
  archivedAthleteIds: string[];
  currentUserId: string | null;
};

export type AthleteReadComparison = {
  activeCountMatches: boolean;
  activeIdsMatch: boolean;
  archivedIdsMatch: boolean;
  currentUserMatches: boolean;
  orderMatches: boolean;
};

function contextUserId(context: CurrentUserContext): string | null {
  return "user" in context ? context.user.id : null;
}

export function compareAthleteReadSnapshots(
  legacy: LegacyAthleteReadSnapshot,
  result: AthletesLoadResult,
  context: CurrentUserContext,
): AthleteReadComparison | null {
  if (result.kind !== "success" && result.kind !== "empty") {
    return null;
  }

  const activeIds = result.athletes.map((athlete) => athlete.id);
  const archivedIds = result.archivedAthletes.map((athlete) => athlete.id);

  return {
    activeCountMatches: legacy.activeAthleteIds.length === activeIds.length,
    activeIdsMatch:
      [...legacy.activeAthleteIds].sort().join(",") === [...activeIds].sort().join(","),
    archivedIdsMatch:
      [...legacy.archivedAthleteIds].sort().join(",") === [...archivedIds].sort().join(","),
    currentUserMatches: legacy.currentUserId === contextUserId(context),
    orderMatches: legacy.activeAthleteIds.join(",") === activeIds.join(","),
  };
}
