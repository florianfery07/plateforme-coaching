import type { Database } from "../types/database";

type AthleteWeekColorRow =
  Database["public"]["Tables"]["athlete_week_colors"]["Row"];

export type WeeklyColors = Record<string, string | null>;

export type WeeklyColorsRepository = {
  list: () => Promise<{
    data: AthleteWeekColorRow[] | null;
    error: unknown;
  }>;
};

export type WeeklyColorsLoadResult =
  | { kind: "success"; colors: WeeklyColors }
  | { kind: "error"; error: unknown };

/** Preserves the legacy weekly-color lookup shape while keeping it independent from React. */
export function mapWeeklyColors(
  rows: AthleteWeekColorRow[] | null,
): WeeklyColors {
  return Object.fromEntries(
    (rows ?? []).map((row) => [
      `${row.athlete_id}-${row.year}-${row.week}`,
      row.color_name,
    ]),
  );
}

export async function loadWeeklyColors(
  repository: WeeklyColorsRepository,
): Promise<WeeklyColorsLoadResult> {
  const { data, error } = await repository.list();

  if (error) return { kind: "error", error };

  return { kind: "success", colors: mapWeeklyColors(data) };
}
