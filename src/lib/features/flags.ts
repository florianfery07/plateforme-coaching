export type FeatureFlagStage =
  | "experimental"
  | "pilot"
  | "rollout"
  | "legacy-removal";

export type FeatureFlagDefinition = {
  description: string;
  defaultValue: boolean;
  environmentVariable: `NEXT_PUBLIC_FEATURE_${string}`;
  owner: string;
  removal: string;
  stage: FeatureFlagStage;
};

export const featureFlagRegistry = {
  groupsV2: {
    description: "Future progressive replacement for the legacy groups module.",
    defaultValue: false,
    environmentVariable: "NEXT_PUBLIC_FEATURE_GROUPS_V2",
    owner: "Platform",
    removal: "Remove after the groups V2 rollout is complete and legacy is retired.",
    stage: "experimental",
  },
  accessControlV2: {
    description: "Future progressive replacement for legacy access-control flows.",
    defaultValue: false,
    environmentVariable: "NEXT_PUBLIC_FEATURE_ACCESS_CONTROL_V2",
    owner: "Platform",
    removal:
      "Remove after access-control V2 has replaced the legacy implementation.",
    stage: "pilot",
  },
  reliableMutationsV2: {
    description: "Future progressive replacement for legacy mutation reliability flows.",
    defaultValue: false,
    environmentVariable: "NEXT_PUBLIC_FEATURE_RELIABLE_MUTATIONS_V2",
    owner: "Platform",
    removal:
      "Remove after reliable mutations V2 has replaced the legacy implementation.",
    stage: "experimental",
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

export type FeatureFlagKey = keyof typeof featureFlagRegistry;

export type FeatureFlagEnvironmentVariable =
  (typeof featureFlagRegistry)[FeatureFlagKey]["environmentVariable"];

export type FeatureFlagEnvironment = Readonly<
  Partial<Record<FeatureFlagEnvironmentVariable, string | undefined>>
>;

export type FeatureFlagValues = Record<FeatureFlagKey, boolean>;
