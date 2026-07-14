import type { AthleteSummary } from "../../types/domain";
import type { RepositoryReadResult } from "../read-result";

export type AthleteListItem = AthleteSummary;

export type AthletesRepository = {
  listAthletes: () => Promise<RepositoryReadResult<unknown[]>>;
};

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
