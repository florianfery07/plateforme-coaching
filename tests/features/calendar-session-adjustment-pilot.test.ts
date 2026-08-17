import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const pilotStart = source.indexOf("if (\n    calendarSessionAdjustmentPilotEnabled");
const legacyStart = source.indexOf("  updateSession((items) =>", pilotStart);
const pilotBranch = source.slice(pilotStart, legacyStart);

describe("calendar session adjustment reliable mutation pilot", () => {
  it("uses the existing calendar service through a reject-concurrent mutation", () => {
    expect(source).toContain('key: "calendar-session-adjustment"');
    expect(source).toContain('concurrency: "reject"');
    expect(source).toContain('type: "calendar-session.adjustment.save"');
    expect(source).toContain("calendarSessionService.saveAdjustment");
  });

  it("updates only the confirmed local session and never reloads all data in the pilot", () => {
    expect(pilotBranch).toContain("setSessions((items) => ({");
    expect(pilotBranch).not.toContain("loadAllData");
  });

  it("keeps the legacy writer after the pilot branch", () => {
    expect(legacyStart).toBeGreaterThan(pilotStart);
    expect(source).toContain("await loadAllData();");
  });
});
