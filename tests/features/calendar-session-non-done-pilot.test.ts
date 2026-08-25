import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const pilotStart = source.indexOf('if (calendarSessionNonDonePilotEnabled && field === "commit")');
const legacyStart = source.indexOf("  const session = activeSessions.find", pilotStart);
const pilotBranch = source.slice(pilotStart, legacyStart);

describe("calendar non-done reliable mutation pilot", () => {
  it("uses the existing calendar service through one reject-concurrent mutation", () => {
    expect(source).toContain("const calendarSessionNonDonePilotEnabled = isReliableMutationsPilotEnabled()");
    expect(source).toContain('key: "calendar-session-non-done"');
    expect(source).toContain('type: "calendar-session.non-done.save"');
    expect(source).toContain("calendarSessionService.saveNonDone");
  });

  it("updates only the confirmed target session and never reloads all data in the pilot", () => {
    expect(pilotBranch).toContain("setSessions((items) => ({");
    expect(pilotBranch).not.toContain("loadAllData");
  });

  it("keeps the legacy per-field writer after the pilot branch", () => {
    expect(legacyStart).toBeGreaterThan(pilotStart);
    expect(source.slice(legacyStart)).toContain(".from(\"calendar_workouts\")");
  });
});
