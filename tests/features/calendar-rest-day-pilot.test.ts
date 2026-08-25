import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const pilotStart = source.indexOf("if (calendarRestDayPilotEnabled && planningTargetType !== \"group\")");
const legacyStart = source.indexOf("  const payload = targetAthleteIds.map", pilotStart);
const pilotBranch = source.slice(pilotStart, legacyStart);

describe("calendar rest-day reliable mutation pilot", () => {
  it("uses the existing calendar service through a reject-concurrent mutation", () => {
    expect(source).toContain("const calendarRestDayPilotEnabled = isReliableMutationsPilotEnabled()");
    expect(source).toContain('key: `calendar-rest-day:${activeId}:${dateKey(selectedDate)}`');
    expect(source).toContain('concurrency: "reject"');
    expect(source).toContain('type: "calendar-session.rest-day.create"');
    expect(source).toContain("calendarSessionService.createRestDay");
  });

  it("updates only the confirmed local athlete session and never reloads all data in the pilot", () => {
    expect(pilotBranch).toContain("setSessions((items) => ({");
    expect(pilotBranch).not.toContain("loadAllData");
  });

  it("keeps the group and feature-off legacy writer after the pilot branch", () => {
    expect(pilotBranch).toContain('planningTargetType !== "group"');
    expect(legacyStart).toBeGreaterThan(pilotStart);
    expect(source.slice(legacyStart)).toContain("await loadAllData();");
  });
});
