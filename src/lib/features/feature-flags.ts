import {
  featureFlagRegistry,
  type FeatureFlagEnvironment,
  type FeatureFlagKey,
  type FeatureFlagValues,
} from "./flags";

const enabledValues = new Set(["true", "1", "on", "enabled"]);
const disabledValues = new Set(["false", "0", "off", "disabled"]);

const publicFeatureEnvironment: FeatureFlagEnvironment = {
  NEXT_PUBLIC_FEATURE_GROUPS_V2: process.env.NEXT_PUBLIC_FEATURE_GROUPS_V2,
  NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2:
    process.env.NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2,
  NEXT_PUBLIC_FEATURE_ATHLETE_INVITES_V2:
    process.env.NEXT_PUBLIC_FEATURE_ATHLETE_INVITES_V2,
  NEXT_PUBLIC_FEATURE_ATHLETE_LIFECYCLE_V2:
    process.env.NEXT_PUBLIC_FEATURE_ATHLETE_LIFECYCLE_V2,
  NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2:
    process.env.NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2,
};

export function parseFeatureFlagValue(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (enabledValues.has(normalizedValue)) {
    return true;
  }

  if (disabledValues.has(normalizedValue)) {
    return false;
  }

  return defaultValue;
}

export function resolveFeatureFlags(
  environment: FeatureFlagEnvironment = {},
): FeatureFlagValues {
  const values = {} as FeatureFlagValues;

  for (const key of Object.keys(featureFlagRegistry) as FeatureFlagKey[]) {
    const definition = featureFlagRegistry[key];
    values[key] = parseFeatureFlagValue(
      environment[definition.environmentVariable],
      definition.defaultValue,
    );
  }

  return values;
}

export const featureFlags = resolveFeatureFlags(publicFeatureEnvironment);

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag] === true;
}
