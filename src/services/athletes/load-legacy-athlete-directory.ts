import { getColorClass } from "../../lib/colors";
import type {
  LegacyAthleteDirectoryItem,
  LegacyAthleteDirectoryLoadResult,
  LegacyAthleteDirectoryRepository,
  LegacyAthleteDirectoryRow,
} from "./types";

export function mapLegacyAthleteDirectoryRow(
  row: LegacyAthleteDirectoryRow,
): LegacyAthleteDirectoryItem {
  return {
    id: row.id,
    name: row.name,
    calendarName: `Calendrier de ${row.name}`,
    inviteToken: `invite-${row.id}`,
    email: row.email || "",
    age: row.age || "",
    height: row.height || "",
    weight: row.weight || "",
    sport: row.sport || "Vélo",
    shortGoal: row.short_goal || "",
    mediumGoal: row.medium_goal || "",
    longGoal: row.long_goal || "",
    context: row.context || "",
    power5: row.power5 || "",
    power12: row.power12 || "",
    power20: row.power20 || "",
    goalUpdateRequested: Boolean(row.goal_update_requested),
    user_id: row.user_id || "",
    active: row.active !== false,
    color: getColorClass(row.color ?? undefined),
  };
}

export async function loadLegacyAthleteDirectory(
  repository: LegacyAthleteDirectoryRepository,
): Promise<LegacyAthleteDirectoryLoadResult> {
  try {
    const result = await repository.listLegacyAthleteDirectory();

    if (result.error) {
      return { kind: "error", error: result.error };
    }

    return {
      kind: "success",
      athletes: (result.data ?? []).map(mapLegacyAthleteDirectoryRow),
    };
  } catch {
    return {
      kind: "error",
      error: { message: "Unable to load athletes." },
    };
  }
}
