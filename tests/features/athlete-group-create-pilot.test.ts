import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const mutationStart = source.indexOf("const athleteGroupCreateMutation = useReliableMutation");
const mutationEnd = source.indexOf("\n\nasync function loadAllData", mutationStart);
const pilotStart = source.indexOf("  if (athleteGroupCreatePilotEnabled) {");
const legacyStart = source.indexOf(
  "  try {\n    await createAthleteGroup(newGroupName);",
  pilotStart,
);

describe("athlete group creation reliable mutation pilot", () => {
  it("reuses the existing reliable mutation flag and rejects duplicate submissions", () => {
    const mutation = source.slice(mutationStart, mutationEnd);

    expect(source).toContain("const athleteGroupCreatePilotEnabled = isReliableMutationsPilotEnabled()");
    expect(mutation).toContain('key: "athlete-group.create"');
    expect(mutation).toContain('type: "athlete-group.create"');
    expect(mutation).toContain('concurrency: "reject"');
    expect(mutation).toContain("createAthleteGroup(name)");
  });

  it("adds only the confirmed group locally and never reloads global data in the pilot", () => {
    const pilotBranch = source.slice(pilotStart, legacyStart);

    expect(pilotBranch).toContain("setAthleteGroups((current) => [...current, result.data])");
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
