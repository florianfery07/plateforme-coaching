import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/calendar/QuickLibrary.tsx"), "utf8");

describe("QuickLibrary Groups V2 pilot", () => {
  it("requires both flags and preserves the legacy path otherwise", () => {
    expect(source).toContain('isFeatureEnabled("groupsV2") && isFeatureEnabled("accessControlV2")');
    expect(source).toContain("importWorkout(pendingWorkout, undefined, selectedAthleteIds)");
  });

  it("uses the bridge then the existing atomic service without legacy writes", () => {
    expect(source).toContain("createLegacyGroupBridgeService");
    expect(source).toContain("createGroupSessionService");
    expect(source).not.toContain('from("calendar_workouts")');
    expect(source).not.toContain("create_group_session_v2");
  });

  it("falls back only when the bridge is invalid and rejects duplicate intent", () => {
    expect(source).toContain('kind: "legacy_fallback"');
    expect(source).toContain('concurrency: "reject"');
  });

  it("keeps the Groups V2 controls independent from the individual import pending state", () => {
    expect(source).toContain('disabled={planningTargetType !== "group" && importPending}');
  });
});
