import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const renameStart = source.indexOf("async function rename(kind, oldName, newName, newColor)");
const removeStart = source.indexOf("async function removeItem(kind, name, confirmed = false)", renameStart);
const planningStart = source.indexOf("async function updateWeekPlanning", removeStart);

describe("workout taxonomy atomic pilot", () => {
  it("reuses reliable mutations and rejects duplicate taxonomy submissions", () => {
    const renameMutation = source.slice(
      source.indexOf("const workoutTaxonomyRenameMutation = useReliableMutation"),
      source.indexOf("const workoutTaxonomyDeleteMutation = useReliableMutation"),
    );
    const deleteMutation = source.slice(
      source.indexOf("const workoutTaxonomyDeleteMutation = useReliableMutation"),
      source.indexOf("const calendarSessionImportMutation", source.indexOf("const workoutTaxonomyDeleteMutation = useReliableMutation")),
    );

    expect(source).toContain("const workoutTaxonomyPilotEnabled = isReliableMutationsPilotEnabled()");
    expect(renameMutation).toContain('concurrency: "reject"');
    expect(renameMutation).toContain("workoutTaxonomyService.rename");
    expect(deleteMutation).toContain('concurrency: "reject"');
    expect(deleteMutation).toContain("workoutTaxonomyService.delete");
  });

  it("updates only confirmed taxonomy and linked library state in the pilot rename path", () => {
    const renamePilot = source.slice(renameStart, removeStart);
    const pilotStart = renamePilot.indexOf("if (workoutTaxonomyPilotEnabled) {");
    const legacyStart = renamePilot.indexOf("const { error } = await supabase", pilotStart);
    const pilot = renamePilot.slice(pilotStart, legacyStart);

    expect(pilot).toContain("workoutTaxonomyRenameMutation.mutate");
    expect(pilot).toContain("setCategories(updateTaxonomy)");
    expect(pilot).toContain("setSubcategories(updateTaxonomy)");
    expect(pilot).toContain("setLibrary((items)");
    expect(pilot).toContain("return false;");
    expect(pilot).not.toContain("alert(");
    expect(pilot).not.toContain("loadAllData");
    expect(pilot).not.toContain("supabase");
  });

  it("updates only confirmed taxonomy and linked library state in the pilot delete path", () => {
    const removePilot = source.slice(removeStart, planningStart);
    const pilotStart = removePilot.indexOf("if (workoutTaxonomyPilotEnabled) {");
    const legacyStart = removePilot.indexOf("if (linkedWorkouts.length)", pilotStart);
    const pilot = removePilot.slice(pilotStart, legacyStart);

    expect(pilot).toContain("workoutTaxonomyDeleteMutation.mutate");
    expect(pilot).toContain("items.filter((item) => item.name !== name)");
    expect(pilot).toContain("setLibrary((items)");
    expect(pilot).toContain("return false;");
    expect(pilot).not.toContain("alert(");
    expect(pilot).not.toContain("loadAllData");
    expect(pilot).not.toContain("supabase");
  });

  it("keeps the two-write legacy fallback and its global refresh outside the pilot", () => {
    const rename = source.slice(renameStart, removeStart);
    const remove = source.slice(removeStart, planningStart);

    expect(rename).toContain('.from(table)\n    .update({ name })');
    expect(rename).toContain('.from("workout_library")\n    .update({ [libraryField]: name })');
    expect(rename).toContain("await loadAllData();");
    expect(remove).toContain('.from("workout_library")\n      .delete()');
    expect(remove).toContain("await loadAllData();");
  });
});
