import type { AuthenticatedUser } from "../../types/domain";
import type { RepositoryReadResult } from "../read-result";

export type AuthSessionSnapshot = {
  user: AuthenticatedUser;
};

export type LegacyAthleteIdentity = {
  id: string;
  active: boolean;
};

export type LegacyRole = "coach" | "athlete" | string;

export type AuthRepository = {
  getSession: () => Promise<RepositoryReadResult<AuthSessionSnapshot>>;
  findAthleteByUserId: (
    userId: string,
  ) => Promise<RepositoryReadResult<LegacyAthleteIdentity>>;
  findLegacyRoleByUserId: (
    userId: string,
  ) => Promise<RepositoryReadResult<{ role: LegacyRole }>>;
};

export type CurrentUserContext =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "athlete";
      user: AuthenticatedUser;
      athleteId: string;
    }
  | {
      kind: "archived_athlete";
      user: AuthenticatedUser;
      athleteId: string;
    }
  | {
      kind: "legacy_coach";
      user: AuthenticatedUser;
    }
  | {
      kind: "unknown_role";
      user: AuthenticatedUser;
      reason: "missing_legacy_role" | "athlete_role_without_athlete";
    }
  | {
      kind: "forbidden" | "error";
      source: "session" | "athlete" | "role";
      message: string;
    };
