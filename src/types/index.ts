/**
 * Model tiers for token tracking
 */
export type ModelTier = 'premium' | 'mini';

/**
 * Usage record for daily token tracking
 */
export interface UsageRecord {
  tier: ModelTier;
  date: string; // YYYY-MM-DD format
  tokens_used: number;
  limit: number;
}

/**
 * Request history entry
 */
export interface RequestHistory {
  id?: number;
  timestamp: string; // ISO 8601
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  request_path: string;
  status: number;
  tier: ModelTier;
}

/**
 * Configuration storage
 */
export interface Config {
  key: string;
  value: string;
}

/**
 * OpenAI API usage response field
 */
export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * OpenAI API response structure (simplified)
 */
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: OpenAIUsage;
  choices: Array<{
    index: number;
    message?: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

/**
 * Usage statistics for dashboard
 */
export interface UsageStats {
  premium: {
    used: number;
    limit: number;
    percentage: number;
  };
  mini: {
    used: number;
    limit: number;
    percentage: number;
  };
  date: string;
}

/**
 * Environment configuration
 */
export interface EnvConfig {
  OPENAI_API_KEY: string;
  PORT: number;
  DATABASE_PATH: string;
  PREMIUM_TIER_LIMIT: number;
  MINI_TIER_LIMIT: number;
  DEBUG: boolean;
}
