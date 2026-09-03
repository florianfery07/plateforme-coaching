import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const mutationStart = source.indexOf("const athleteGroupDeleteMutation = useReliableMutation");
const mutationEnd = source.indexOf("\n\nasync function loadAllData", mutationStart);
const pilotStart = source.indexOf("  if (athleteGroupDeletePilotEnabled) {");
const legacyStart = source.indexOf(
  "  try {\n    await removeAthleteGroup(groupId);\n    await loadAllData();",
  pilotStart,
);

describe("athlete group deletion reliable mutation pilot", () => {
  it("reuses the existing reliable mutation flag and rejects duplicate submissions", () => {
    const mutation = source.slice(mutationStart, mutationEnd);

    expect(source).toContain("const athleteGroupDeletePilotEnabled = isReliableMutationsPilotEnabled()");
    expect(mutation).toContain('key: "athlete-group.delete"');
    expect(mutation).toContain('type: "athlete-group.delete"');
    expect(mutation).toContain('concurrency: "reject"');
    expect(mutation).toContain("removeAthleteGroup(groupId)");
  });

  it("removes only confirmed local group state and never reloads global data in the pilot", () => {
    const pilotBranch = source.slice(pilotStart, legacyStart);

    expect(pilotBranch).toContain("setAthleteGroups((items) => items.filter((group) => group.id !== groupId))");
    expect(pilotBranch).toContain("items.filter((member) => member.group_id !== groupId)");
    expect(pilotBranch).not.toContain("loadAllData");
    expect(pilotBranch).toContain("return false;");
    expect(pilotBranch).not.toContain("alert(");
    expect(pilotBranch).not.toContain("error?.message");
  });

  it("keeps the legacy global reload after the pilot branch", () => {
    expect(legacyStart).toBeGreaterThan(pilotStart);
    expect(source.slice(legacyStart)).toContain("await loadAllData()");
  });
});
