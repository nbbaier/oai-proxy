/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  DB: D1Database;
  OPENAI_ADMIN_KEY: string;
  PREMIUM_TIER_LIMIT?: string;
  MINI_TIER_LIMIT?: string;
  ALERT_WEBHOOK_URL?: string;
  ALERT_THRESHOLD?: string;
}

/**
 * Model tier classification
 */
export type ModelTier = 'premium' | 'mini';

/**
 * OpenAI Usage API response structures
 */
export interface UsageResult {
  object: string;
  project_id: string | null;
  num_model_requests: number;
  user_id: string | null;
  api_key_id: string | null;
  model: string;
  batch: boolean | null;
  service_tier: string | null;
  input_tokens: number;
  output_tokens: number;
  input_cached_tokens?: number;
  input_uncached_tokens?: number;
  input_text_tokens?: number;
  output_text_tokens?: number;
  input_cached_text_tokens?: number;
  input_audio_tokens?: number;
  input_cached_audio_tokens?: number;
  output_audio_tokens?: number;
  input_image_tokens?: number;
  input_cached_image_tokens?: number;
  output_image_tokens?: number;
}

export interface UsageBucket {
  object: string;
  start_time: number;
  end_time: number;
  start_time_iso: string;
  end_time_iso: string;
  results: UsageResult[];
}

export interface UsageResponse {
  object: string;
  data: UsageBucket[];
  has_more: boolean;
  next_page: string | null;
}

/**
 * Database models
 */
export interface UsageSnapshot {
  id: number;
  timestamp: number;
  date: string;
  tier: ModelTier;
  tokens_used: number;
  created_at: string;
}

export interface ModelUsage {
  id: number;
  snapshot_id: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  num_requests: number;
  cached_tokens: number;
}

export interface DailySummary {
  id: number;
  date: string;
  premium_tokens: number;
  mini_tokens: number;
  premium_limit: number;
  mini_limit: number;
  created_at: string;
}

export interface Alert {
  id: number;
  timestamp: number;
  tier: ModelTier;
  tokens_used: number;
  limit_value: number;
  percentage: number;
  message: string;
  sent: boolean;
  created_at: string;
}

/**
 * API response types
 */
export interface UsageStats {
  date: string;
  premium: {
    tokens_used: number;
    limit: number;
    percentage: number;
  };
  mini: {
    tokens_used: number;
    limit: number;
    percentage: number;
  };
  last_updated: number;
}

export interface HistoricalSnapshot {
  timestamp: number;
  date: string;
  premium_tokens: number;
  mini_tokens: number;
}
