import type { Env, ModelTier, UsageSnapshot, HistoricalSnapshot, UsageStats } from './types';
import { getTierLimit } from './models';

/**
 * Insert a usage snapshot into the database
 */
export async function insertSnapshot(
  db: D1Database,
  timestamp: number,
  date: string,
  tier: ModelTier,
  tokens: number
): Promise<number> {
  const result = await db
    .prepare(
      'INSERT INTO usage_snapshots (timestamp, date, tier, tokens_used) VALUES (?, ?, ?, ?) ON CONFLICT(timestamp, tier) DO UPDATE SET tokens_used = ?'
    )
    .bind(timestamp, date, tier, tokens, tokens)
    .run();

  return result.meta.last_row_id || 0;
}

/**
 * Insert model usage details
 */
export async function insertModelUsage(
  db: D1Database,
  snapshotId: number,
  model: string,
  inputTokens: number,
  outputTokens: number,
  numRequests: number,
  cachedTokens: number
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO model_usage (snapshot_id, model, input_tokens, output_tokens, num_requests, cached_tokens) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(snapshotId, model, inputTokens, outputTokens, numRequests, cachedTokens)
    .run();
}

/**
 * Get the latest snapshot for each tier
 */
export async function getLatestSnapshots(db: D1Database): Promise<UsageSnapshot[]> {
  const result = await db
    .prepare(
      `SELECT * FROM usage_snapshots
       WHERE id IN (
         SELECT MAX(id) FROM usage_snapshots GROUP BY tier
       )
       ORDER BY tier`
    )
    .all<UsageSnapshot>();

  return result.results || [];
}

/**
 * Get snapshots for a specific date
 */
export async function getSnapshotsForDate(
  db: D1Database,
  date: string
): Promise<HistoricalSnapshot[]> {
  const result = await db
    .prepare(
      `SELECT
        timestamp,
        date,
        SUM(CASE WHEN tier = 'premium' THEN tokens_used ELSE 0 END) as premium_tokens,
        SUM(CASE WHEN tier = 'mini' THEN tokens_used ELSE 0 END) as mini_tokens
       FROM usage_snapshots
       WHERE date = ?
       GROUP BY timestamp, date
       ORDER BY timestamp ASC`
    )
    .bind(date)
    .all<HistoricalSnapshot>();

  return result.results || [];
}

/**
 * Get historical snapshots for the last N days
 */
export async function getHistoricalSnapshots(
  db: D1Database,
  days: number = 7
): Promise<HistoricalSnapshot[]> {
  const result = await db
    .prepare(
      `SELECT
        timestamp,
        date,
        SUM(CASE WHEN tier = 'premium' THEN tokens_used ELSE 0 END) as premium_tokens,
        SUM(CASE WHEN tier = 'mini' THEN tokens_used ELSE 0 END) as mini_tokens
       FROM usage_snapshots
       WHERE date >= date('now', '-' || ? || ' days')
       GROUP BY timestamp, date
       ORDER BY timestamp DESC
       LIMIT 1000`
    )
    .bind(days)
    .all<HistoricalSnapshot>();

  return result.results || [];
}

/**
 * Get current usage statistics
 */
export async function getCurrentUsageStats(db: D1Database, env: Env): Promise<UsageStats> {
  const snapshots = await getLatestSnapshots(db);

  const premiumSnapshot = snapshots.find(s => s.tier === 'premium');
  const miniSnapshot = snapshots.find(s => s.tier === 'mini');

  const premiumLimit = getTierLimit('premium', env);
  const miniLimit = getTierLimit('mini', env);

  const premiumTokens = premiumSnapshot?.tokens_used || 0;
  const miniTokens = miniSnapshot?.tokens_used || 0;

  return {
    date: premiumSnapshot?.date || miniSnapshot?.date || new Date().toISOString().split('T')[0],
    premium: {
      tokens_used: premiumTokens,
      limit: premiumLimit,
      percentage: Math.round((premiumTokens / premiumLimit) * 100),
    },
    mini: {
      tokens_used: miniTokens,
      limit: miniLimit,
      percentage: Math.round((miniTokens / miniLimit) * 100),
    },
    last_updated: premiumSnapshot?.timestamp || miniSnapshot?.timestamp || Date.now(),
  };
}

/**
 * Insert an alert
 */
export async function insertAlert(
  db: D1Database,
  timestamp: number,
  tier: ModelTier,
  tokensUsed: number,
  limitValue: number,
  percentage: number,
  message: string
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO alerts (timestamp, tier, tokens_used, limit_value, percentage, message) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(timestamp, tier, tokensUsed, limitValue, percentage, message)
    .run();
}

/**
 * Check if an alert was already sent for this tier today
 */
export async function wasAlertSentToday(
  db: D1Database,
  tier: ModelTier,
  date: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count FROM alerts
       WHERE tier = ?
       AND datetime(created_at) >= datetime(?)
       AND sent = 1`
    )
    .bind(tier, `${date}T00:00:00Z`)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

/**
 * Mark an alert as sent
 */
export async function markAlertAsSent(db: D1Database, alertId: number): Promise<void> {
  await db
    .prepare('UPDATE alerts SET sent = 1 WHERE id = ?')
    .bind(alertId)
    .run();
}
