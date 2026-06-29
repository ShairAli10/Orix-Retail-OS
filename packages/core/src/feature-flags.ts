import type { CoreResult } from "./result.js";

export type FeatureFlagKey = string;

export type FeatureFlagContext = Readonly<Record<string, unknown>>;

export interface FeatureFlags {
  isEnabled(key: FeatureFlagKey, context?: FeatureFlagContext): CoreResult<boolean>;

  getVariant(key: FeatureFlagKey, context?: FeatureFlagContext): CoreResult<string | undefined>;
}
