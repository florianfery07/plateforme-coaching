import type { AthleteRow, AthleteSummary } from "../../types/domain";
import type { RepositoryReadResult } from "../read-result";

export type AthleteListItem = AthleteSummary;

export type AthletesRepository = {
  listAthletes: () => Promise<RepositoryReadResult<unknown[]>>;
};

export type LegacyAthleteDirectoryRow = Pick<
  AthleteRow,
  | "id"
  | "name"
  | "weight"
  | "power5"
  | "power12"
  | "power20"
  | "email"
  | "age"
  | "height"
  | "sport"
  | "short_goal"
  | "medium_goal"
  | "long_goal"
  | "context"
  | "goal_update_requested"
  | "user_id"
  | "active"
  | "color"
>;

export type LegacyAthleteDirectoryItem = {
  id: string;
  name: string;
  calendarName: string;
  inviteToken: string;
  email: string;
  age: string;
  height: string;
  weight: string;
  sport: string;
  shortGoal: string;
  mediumGoal: string;
  longGoal: string;
  context: string;
  power5: string;
  power12: string;
  power20: string;
  goalUpdateRequested: boolean;
  user_id: string;
  active: boolean;
  color: string;
};

export type LegacyAthleteDirectoryRepository = {
  listLegacyAthleteDirectory: () => Promise<
    RepositoryReadResult<LegacyAthleteDirectoryRow[]>
  >;
};

export type LegacyAthleteDirectoryLoadResult =
  | { kind: "success"; athletes: LegacyAthleteDirectoryItem[] }
  | { kind: "error"; error: { code?: string; message: string } };

export type AthletesLoadResult =
  | {
      kind: "success";
      athletes: AthleteListItem[];
      archivedAthletes: AthleteListItem[];
    }
  | {
      kind: "empty";
      athletes: [];
      archivedAthletes: [];
    }
  | {
      kind: "invalid_data";
      invalidRowCount: number;
    }
  | {
      kind: "forbidden" | "error";
      message: string;
    };
