import { describe, expect, it } from "vitest";

import {
  featureFlagRegistry,
  isFeatureEnabled,
  parseFeatureFlagValue,
  resolveFeatureFlags,
  type FeatureFlagKey,
} from "../../src/lib/features";
import { isReliableMutationsPilotEnabled } from "../../src/lib/features/reliable-mutations-pilot";

describe("feature flags", () => {
  it("uses the legacy defaults when no environment variable is present", () => {
    expect(resolveFeatureFlags()).toEqual({
      groupsV2: false,
      accessControlV2: false,
      athleteInvitesV2: false,
      athleteLifecycleV2: false,
      reliableMutationsV2: false,
    });
  });

  it("activates a flag only for an explicit enabled value", () => {
    expect(
      resolveFeatureFlags({
        NEXT_PUBLIC_FEATURE_GROUPS_V2: "enabled",
      }).groupsV2,
    ).toBe(true);
  });

  it("accepts every documented enabled value", () => {
    for (const value of ["true", "1", "on", "enabled"]) {
      expect(parseFeatureFlagValue(value, false)).toBe(true);
    }
  });

  it("accepts every documented disabled value", () => {
    for (const value of ["false", "0", "off", "disabled"]) {
      expect(parseFeatureFlagValue(value, true)).toBe(false);
    }
  });

  it("falls back to the default for invalid values", () => {
    expect(parseFeatureFlagValue("yes", false)).toBe(false);
    expect(parseFeatureFlagValue("", true)).toBe(true);
  });

  it("does not consider an unknown runtime key enabled", () => {
    const unknownFlag = "unknownFlag" as FeatureFlagKey;

    expect(isFeatureEnabled(unknownFlag)).toBe(false);
  });

  it("keeps every declared future module disabled by default", () => {
    const resolvedFlags = resolveFeatureFlags();

    for (const key of Object.keys(featureFlagRegistry) as FeatureFlagKey[]) {
      expect(resolvedFlags[key]).toBe(false);
    }
  });

  it("keeps reliable mutations on the legacy path unless the local pilot is explicit", () => {
    expect(
      isReliableMutationsPilotEnabled({
        featureEnabled: false,
        nodeEnv: "development",
      }),
    ).toBe(false);
    expect(
      isReliableMutationsPilotEnabled({
        featureEnabled: true,
        nodeEnv: "production",
      }),
    ).toBe(false);
    expect(
      isReliableMutationsPilotEnabled({
        featureEnabled: true,
        nodeEnv: "development",
      }),
    ).toBe(true);
  });
});
