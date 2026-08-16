import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { isReliableMutationsPilotEnabled } from "../../src/lib/features";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("weekly note reliable-mutation pilot guard", () => {
  it("requires both the declared feature flag and a local development environment", () => {
    expect(isReliableMutationsPilotEnabled({ featureEnabled: false, nodeEnv: "development" })).toBe(false);
    expect(isReliableMutationsPilotEnabled({ featureEnabled: true, nodeEnv: "production" })).toBe(false);
    expect(isReliableMutationsPilotEnabled({ featureEnabled: true, nodeEnv: "development" })).toBe(true);
  });

  it("keeps every non-pilot weekly-note path legacy", () => {
    const root = process.cwd();
    const weekDetail = readFileSync(resolve(root, "src/components/athlete/WeekDetail.tsx"), "utf8");
    const sourceReferences = sourceFiles(resolve(root, "src"))
      .filter((path) => readFileSync(path, "utf8").includes("athlete_week_notes"))
      .map((path) => relative(root, path))
      .sort();
    const directWeekNoteWrites = sourceReferences.filter((path) =>
      readFileSync(resolve(root, path), "utf8").includes('from("athlete_week_notes")'),
    );

    expect(weekDetail).toContain("useWeekNoteAutosave");
    expect(sourceReferences).toEqual([
      "src/app/page.tsx", // legacy cleanup and calendar-editor write
      "src/components/athlete/WeekDetail.tsx", // selected L08b pilot plus legacy fallback
      "src/services/week-notes/supabase-week-note-repository.ts", // pilot V2 write and L13e read
      "src/services/week-notes/types.ts", // typed L13e read contract
      "src/types/database.ts", // generated database contract
    ]);
    expect(directWeekNoteWrites).toEqual([
      "src/app/page.tsx",
      "src/components/athlete/WeekDetail.tsx",
      "src/services/week-notes/supabase-week-note-repository.ts",
    ]);
    expect(readFileSync(resolve(root, "src/app/page.tsx"), "utf8")).not.toContain("useWeekNoteAutosave");
    expect(readFileSync(resolve(root, "src/components/calendar/CalendarPageOld.tsx"), "utf8")).not.toContain("useWeekNoteAutosave");
  });
});
