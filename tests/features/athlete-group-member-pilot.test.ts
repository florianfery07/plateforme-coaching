import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const mutationStart = source.indexOf("const athleteGroupMemberMutation = useReliableMutation");
const mutationEnd = source.indexOf("\n\nasync function loadAllData", mutationStart);
const pilotStart = source.indexOf("  if (athleteGroupMemberPilotEnabled) {");
const legacyStart = source.indexOf(
  "  try {\n    await setAthleteGroupMember(groupId, athleteId, checked);",
  pilotStart,
);

describe("athlete group membership reliable mutation pilot", () => {
  it("reuses the existing reliable mutation foundation without a new feature flag", () => {
    const mutation = source.slice(mutationStart, mutationEnd);

    expect(source).toContain("const athleteGroupMemberPilotEnabled = isReliableMutationsPilotEnabled()");
    expect(mutation).toContain('key: "athlete-group-member"');
    expect(mutation).toContain('type: "athlete-group-member.save"');
    expect(mutation).toContain('concurrency: "parallel"');
    expect(mutation).toContain("setAthleteGroupMember(groupId, athleteId, checked)");
  });

  it("updates only the targeted membership and rolls it back without reloading global data", () => {
    const mutation = source.slice(mutationStart, mutationEnd);
    const pilotBranch = source.slice(pilotStart, legacyStart);

    expect(mutation).toContain("setAthleteGroupMembers((current) => {");
    expect(mutation).toContain("return () => {");
    expect(pilotBranch).not.toContain("loadAllData");
    expect(pilotBranch).toContain("athleteGroupMemberLocksRef.current.has(membershipKey)");
  });

  it("keeps the legacy writer unchanged after the pilot branch", () => {
    expect(legacyStart).toBeGreaterThan(pilotStart);
    expect(source.slice(legacyStart)).toContain("await loadAllData()");
  });
});
