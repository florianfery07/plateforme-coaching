import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveFeatureFlags } from "../../src/lib/features";

const root = process.cwd();
const activeLegacyEntrypoints = [
  "src/app/page.tsx",
  "src/components/calendar/QuickLibrary.tsx",
  "src/components/calendar/DayView.tsx",
  "src/components/athlete/ManagementPage.tsx",
];

describe("groups V2 foundation isolation", () => {
  it("stays disabled unless the existing public flag is explicitly enabled", () => {
    expect(resolveFeatureFlags({}).groupsV2).toBe(false);
    expect(
      resolveFeatureFlags({ NEXT_PUBLIC_FEATURE_GROUPS_V2: "enabled" }).groupsV2,
    ).toBe(true);
  });

  it("does not connect an active legacy entrypoint to the V2 foundation", () => {
    for (const path of activeLegacyEntrypoints) {
      expect(readFileSync(resolve(root, path), "utf8")).not.toContain("groups-v2");
    }
  });
});
