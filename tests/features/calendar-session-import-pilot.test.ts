import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const pilotStart = source.indexOf('if (calendarSessionImportPilotEnabled && planningTargetType !== "group")');
const legacyPayloadStart = source.indexOf("const payload = targetAthleteIds.map", pilotStart);
const pilotBranch = source.slice(pilotStart, legacyPayloadStart);

describe("calendar session import reliable mutation pilot", () => {
  it("is guarded by the existing local-only reliable mutations pilot", () => {
    expect(source).toContain("const calendarSessionImportPilotEnabled = isReliableMutationsPilotEnabled()");
  });

  it("uses a single-target reject-concurrent mutation and the existing calendar service", () => {
    expect(source).toContain('concurrency: "reject"');
    expect(source).toContain('type: "calendar-session.import"');
    expect(source).toContain("calendarSessionService.create({ athleteId, session }, context.signal)");
  });

  it("updates only the confirmed target session list and does not reload all data in the pilot", () => {
    expect(pilotBranch).toContain("[targetAthleteId]: [...(items[targetAthleteId] || []), result.data]");
    expect(pilotBranch).not.toContain("loadAllData");
  });

  it("leaves the legacy payload after the pilot branch for flags off and groups", () => {
    expect(legacyPayloadStart).toBeGreaterThan(pilotStart);
    expect(source).toContain("await loadAllData();");
  });
});
