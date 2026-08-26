import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const pilotStart = source.indexOf("  if (workoutLibraryPilotEnabled) {");
const legacyStart = source.indexOf("  if (editingId) {", pilotStart + 1);

describe("workout library creation reliable mutation pilot", () => {
  it("reuses the existing pilot and rejects duplicate submissions", () => {
    const mutationStart = source.indexOf("const workoutLibrarySaveMutation = useReliableMutation");
    const mutationEnd = source.indexOf("  const calendarSessionImportMutation", mutationStart);
    const mutation = source.slice(mutationStart, mutationEnd);

    expect(source).toContain("const workoutLibraryPilotEnabled = isReliableMutationsPilotEnabled()");
    expect(mutation).toContain('key: `workout-library:${editingId || "new"}`');
    expect(mutation).toContain('concurrency: "reject"');
    expect(mutation).toContain("workoutLibraryService.save");
  });

  it("adds only the confirmed created workout locally without a global reload", () => {
    const pilotBranch = source.slice(pilotStart, legacyStart);

    expect(pilotBranch).toContain(": [result.data, ...items]");
    expect(pilotBranch).not.toContain("loadAllData");
    expect(pilotBranch).not.toContain("setCategories");
    expect(pilotBranch).not.toContain("setSubcategories");
    expect(pilotBranch).not.toContain("setAthleteGroups");
    expect(pilotBranch).toContain('alert("Impossible d\'enregistrer cette séance. Réessaie.")');
    expect(pilotBranch).not.toContain("error?.message");
  });

  it("keeps the complete legacy creation and global reload outside the pilot", () => {
    const legacyBranch = source.slice(legacyStart);

    expect(legacyBranch).toContain('.from("workout_library")\n      .insert(workoutData)');
    expect(legacyBranch).toContain("await loadAllData();");
  });
});
