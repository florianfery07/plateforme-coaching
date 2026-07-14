import { isFeatureEnabled } from "./feature-flags";

type ReliableMutationsPilotEnvironment = {
  featureEnabled?: boolean;
  nodeEnv?: string | undefined;
};

/** A public flag controls rollout; this local-only check is never authorization. */
export function isReliableMutationsPilotEnabled(
  environment: ReliableMutationsPilotEnvironment = {},
): boolean {
  const featureEnabled = environment.featureEnabled ?? isFeatureEnabled("reliableMutationsV2");
  const nodeEnv = environment.nodeEnv ?? process.env.NODE_ENV;

  return featureEnabled && nodeEnv === "development";
}
