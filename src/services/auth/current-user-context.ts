import { readFailureKind } from "../read-result";
import type { CurrentUserContext, AuthRepository } from "./types";

export async function loadCurrentUserContext(
  repository: AuthRepository,
): Promise<CurrentUserContext> {
  try {
    const sessionResult = await repository.getSession();

    if (sessionResult.error) {
      return {
        kind: readFailureKind(sessionResult.error),
        source: "session",
        message: sessionResult.error.message,
      };
    }

    if (!sessionResult.data) {
      return { kind: "unauthenticated" };
    }

    const { user } = sessionResult.data;
    const athleteResult = await repository.findAthleteByUserId(user.id);

    if (athleteResult.error) {
      return {
        kind: readFailureKind(athleteResult.error),
        source: "athlete",
        message: athleteResult.error.message,
      };
    }

    if (athleteResult.data) {
      return athleteResult.data.active
        ? { kind: "athlete", user, athleteId: athleteResult.data.id }
        : { kind: "archived_athlete", user, athleteId: athleteResult.data.id };
    }

    const roleResult = await repository.findLegacyRoleByUserId(user.id);

    if (roleResult.error) {
      return {
        kind: readFailureKind(roleResult.error),
        source: "role",
        message: roleResult.error.message,
      };
    }

    if (roleResult.data?.role === "coach") {
      return { kind: "legacy_coach", user };
    }

    return {
      kind: "unknown_role",
      user,
      reason:
        roleResult.data?.role === "athlete"
          ? "athlete_role_without_athlete"
          : "missing_legacy_role",
    };
  } catch {
    return {
      kind: "error",
      source: "session",
      message: "Unable to load the current user context.",
    };
  }
}
