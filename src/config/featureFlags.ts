export const FEATURE_FLAGS = {
  ENABLE_CHUNK_STREAMING: false,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
