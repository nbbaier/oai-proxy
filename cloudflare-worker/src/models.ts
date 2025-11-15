import type { ModelTier } from './types';

/**
 * Models classified as premium tier (lower limits)
 * Uses prefix matching for simplicity
 */
const PREMIUM_MODELS = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'o1-preview',
  'o1-mini',
  'chatgpt-4o-latest',
  'gpt-4o-realtime-preview',
];

/**
 * Models classified as mini tier (higher limits)
 */
const MINI_MODELS = [
  'gpt-4o-mini',
  'gpt-3.5-turbo',
];

/**
 * Determine which tier a model belongs to
 * Uses prefix matching (e.g., "gpt-4o" matches "gpt-4o-2024-05-13")
 * IMPORTANT: Check mini models first since "gpt-4o-mini" contains "gpt-4o"
 */
export function getModelTier(model: string): ModelTier {
  // Normalize model name
  const normalizedModel = model.toLowerCase();

  // Check mini models first (more specific)
  for (const miniModel of MINI_MODELS) {
    if (normalizedModel.startsWith(miniModel.toLowerCase())) {
      return 'mini';
    }
  }

  // Then check premium models
  for (const premiumModel of PREMIUM_MODELS) {
    if (normalizedModel.startsWith(premiumModel.toLowerCase())) {
      return 'premium';
    }
  }

  // Default to premium tier for unknown models (safer, more restrictive)
  console.warn(`Unknown model: ${model}, defaulting to premium tier`);
  return 'premium';
}

/**
 * Get the daily token limit for a tier
 */
export function getTierLimit(tier: ModelTier, env: { PREMIUM_TIER_LIMIT?: string; MINI_TIER_LIMIT?: string }): number {
  if (tier === 'premium') {
    return parseInt(env.PREMIUM_TIER_LIMIT || '1000000', 10);
  }
  return parseInt(env.MINI_TIER_LIMIT || '10000000', 10);
}
