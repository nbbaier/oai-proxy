import type { EnvConfig } from '../types';

/**
 * Load and validate environment configuration
 */
export function getConfig(): EnvConfig {
  const config: EnvConfig = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_PATH: process.env.DATABASE_PATH || './db/usage.db',
    PREMIUM_TIER_LIMIT: parseInt(process.env.PREMIUM_TIER_LIMIT || '1000000', 10),
    MINI_TIER_LIMIT: parseInt(process.env.MINI_TIER_LIMIT || '10000000', 10),
    DEBUG: process.env.DEBUG === 'true',
  };

  // Validate required fields
  if (!config.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return config;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return process.env.DEBUG === 'true';
}
