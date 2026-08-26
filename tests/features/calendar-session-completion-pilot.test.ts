import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sessionSource = readFileSync(resolve(process.cwd(), "src/components/calendar/Session.tsx"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

describe("calendar workout completion pilot", () => {
  it("uses the existing reliable-mutations flag, one completion mutation, and no optimistic completion", () => {
    expect(sessionSource).toContain('type: "calendar-session.complete"');
    expect(sessionSource).toContain('concurrency: "reject"');
    expect(sessionSource).toContain("calendarWorkoutCompletionService.complete");
    expect(sessionSource).not.toContain("onMutate: ({ feedback }) =>");
  });

  it("keeps the legacy completion writer and its global reload outside the pilot", () => {
    expect(sessionSource).toContain('if (feedbackPilotEnabled && field === "validated" && value === true)');
    expect(pageSource).toContain('if (field === "validated" && value === true)');
    expect(pageSource).toContain("await loadAllData();");
  });
});
