import type { Database } from "../types/database";

type AthleteWeekPlanningRow =
  Database["public"]["Tables"]["athlete_week_planning"]["Row"];

export type WeeklyPlanningEntry = {
  goal: string;
  category: string;
  subcategory: string;
  status: string;
  coachComment: string;
};

export type WeeklyPlanning = Record<string, WeeklyPlanningEntry>;

export type WeeklyPlanningRepository = {
  list: () => Promise<{
    data: AthleteWeekPlanningRow[] | null;
    error: unknown;
  }>;
};

export type WeeklyPlanningLoadResult =
  | { kind: "success"; planning: WeeklyPlanning }
  | { kind: "error"; error: unknown };

/** Preserves the legacy week-planning lookup shape while keeping it independent from React. */
export function mapWeeklyPlanning(
  rows: AthleteWeekPlanningRow[] | null,
): WeeklyPlanning {
  return Object.fromEntries(
    (rows ?? []).map((row) => [
      `${row.athlete_id}-${row.year}-${row.week}`,
      {
        goal: row.goal || "Off",
        category: row.category || "",
        subcategory: row.subcategory || "",
        status: row.status || "planned",
        coachComment: row.coach_comment || "",
      },
    ]),
  );
}

export async function loadWeeklyPlanning(
  repository: WeeklyPlanningRepository,
): Promise<WeeklyPlanningLoadResult> {
  const { data, error } = await repository.list();

  if (error) return { kind: "error", error };

  return { kind: "success", planning: mapWeeklyPlanning(data) };
}
