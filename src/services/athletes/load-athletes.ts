import { readFailureKind } from "../read-result";
import type { AthleteListItem, AthletesLoadResult, AthletesRepository } from "./types";

function isAthleteListItem(value: unknown): value is AthleteListItem {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    (typeof row.email === "string" || row.email === null) &&
    (typeof row.sport === "string" || row.sport === null) &&
    typeof row.active === "boolean" &&
    (typeof row.color === "string" || row.color === null)
  );
}

export async function loadAthletes(
  repository: AthletesRepository,
): Promise<AthletesLoadResult> {
  try {
    const result = await repository.listAthletes();

    if (result.error) {
      return { kind: readFailureKind(result.error), message: result.error.message };
    }

    const rows = result.data ?? [];
    const athletes: AthleteListItem[] = [];
    const archivedAthletes: AthleteListItem[] = [];
    let invalidRowCount = 0;

    for (const row of rows) {
      if (!isAthleteListItem(row)) {
        invalidRowCount += 1;
        continue;
      }

      if (row.active) {
        athletes.push(row);
      } else {
        archivedAthletes.push(row);
      }
    }

    if (invalidRowCount > 0) {
      return { kind: "invalid_data", invalidRowCount };
    }

    if (athletes.length === 0 && archivedAthletes.length === 0) {
      return { kind: "empty", athletes: [], archivedAthletes: [] };
    }

    return { kind: "success", athletes, archivedAthletes };
  } catch {
    return { kind: "error", message: "Unable to load athletes." };
  }
}
