import type { Env, ModelTier, UsageResult } from './types';
import { fetchOpenAIUsage, getUTCDateString, getDateTimestamps } from './openai';
import { getModelTier, getTierLimit } from './models';
import {
  insertSnapshot,
  insertModelUsage,
  insertAlert,
  wasAlertSentToday,
  markAlertAsSent,
} from './database';

/**
 * Poll OpenAI usage API and update database
 * This function is called by the cron trigger
 */
export async function pollUsage(env: Env): Promise<{
  success: boolean;
  date: string;
  premium_tokens: number;
  mini_tokens: number;
  alerts_triggered: number;
}> {
  const db = env.DB;
  const adminKey = env.OPENAI_ADMIN_KEY;

  if (!adminKey) {
    throw new Error('OPENAI_ADMIN_KEY is required');
  }

  const date = getUTCDateString();
  const { startTime, endTime } = getDateTimestamps(date);
  const timestamp = Math.floor(Date.now() / 1000);

  console.log(`Polling usage for ${date} (${new Date().toISOString()})...`);

  try {
    // Fetch usage data from OpenAI
    const results = await fetchOpenAIUsage(startTime, endTime, adminKey);

    // Aggregate by tier
    const tierTotals: Record<ModelTier, number> = {
      premium: 0,
      mini: 0,
    };

    const modelBreakdown: Record<string, {
      tier: ModelTier;
      inputTokens: number;
      outputTokens: number;
      numRequests: number;
      cachedTokens: number;
    }> = {};

    // Process each result
    for (const result of results) {
      const tier = getModelTier(result.model);
      const totalTokens = result.input_tokens + result.output_tokens;
      const cachedTokens = result.input_cached_tokens || 0;

      tierTotals[tier] += totalTokens;

      // Track per-model breakdown
      if (!modelBreakdown[result.model]) {
        modelBreakdown[result.model] = {
          tier,
          inputTokens: 0,
          outputTokens: 0,
          numRequests: 0,
          cachedTokens: 0,
        };
      }

      const breakdown = modelBreakdown[result.model];
      breakdown.inputTokens += result.input_tokens;
      breakdown.outputTokens += result.output_tokens;
      breakdown.numRequests += result.num_model_requests;
      breakdown.cachedTokens += cachedTokens;
    }

    // Insert snapshots for each tier
    const premiumSnapshotId = await insertSnapshot(
      db,
      timestamp,
      date,
      'premium',
      tierTotals.premium
    );

    const miniSnapshotId = await insertSnapshot(
      db,
      timestamp,
      date,
      'mini',
      tierTotals.mini
    );

    // Insert model-level details
    for (const [model, breakdown] of Object.entries(modelBreakdown)) {
      const snapshotId = breakdown.tier === 'premium' ? premiumSnapshotId : miniSnapshotId;

      await insertModelUsage(
        db,
        snapshotId,
        model,
        breakdown.inputTokens,
        breakdown.outputTokens,
        breakdown.numRequests,
        breakdown.cachedTokens
      );
    }

    console.log(`Snapshot saved: Premium=${tierTotals.premium.toLocaleString()}, Mini=${tierTotals.mini.toLocaleString()}`);

    // Check for alerts
    const alertsTriggered = await checkAndSendAlerts(env, date, tierTotals);

    return {
      success: true,
      date,
      premium_tokens: tierTotals.premium,
      mini_tokens: tierTotals.mini,
      alerts_triggered: alertsTriggered,
    };
  } catch (error) {
    console.error('Polling failed:', error);
    throw error;
  }
}

/**
 * Check usage against limits and send alerts if needed
 */
async function checkAndSendAlerts(
  env: Env,
  date: string,
  tierTotals: Record<ModelTier, number>
): Promise<number> {
  const db = env.DB;
  const alertThreshold = parseInt(env.ALERT_THRESHOLD || '80', 10);
  const webhookUrl = env.ALERT_WEBHOOK_URL;

  let alertsTriggered = 0;

  for (const tier of ['premium', 'mini'] as ModelTier[]) {
    const tokens = tierTotals[tier];
    const limit = getTierLimit(tier, env);
    if (limit <= 0) {
      console.warn(`Invalid limit (${limit}) for tier "${tier}". Skipping alert check.`);
      continue;
    }
    const percentage = Math.round((tokens / limit) * 100);

    // Check if we've crossed the threshold
    if (percentage >= alertThreshold) {
      // Check if we already sent an alert today
      const alreadySent = await wasAlertSentToday(db, tier, date);

      if (!alreadySent) {
        const message = `⚠️ OpenAI Usage Alert: ${tier.toUpperCase()} tier at ${percentage}% (${tokens.toLocaleString()}/${limit.toLocaleString()} tokens)`;

        console.log(message);

        // Insert alert record
        const timestamp = Math.floor(Date.now() / 1000);
        const result = await db
          .prepare(
            'INSERT INTO alerts (timestamp, tier, tokens_used, limit_value, percentage, message) VALUES (?, ?, ?, ?, ?, ?) RETURNING id'
          )
          .bind(timestamp, tier, tokens, limit, percentage, message)
          .first<{ id: number }>();

        const alertId = result?.id;

        // Send webhook if configured
        if (webhookUrl && alertId != null) {
          try {
            await sendWebhookAlert(webhookUrl, message, tier, tokens, limit, percentage);
            await markAlertAsSent(db, alertId);
            console.log(`Alert sent via webhook for ${tier} tier`);
          } catch (error) {
            console.error('Failed to send webhook alert:', error);
          }
        }

        alertsTriggered++;
      }
    }
  }

  return alertsTriggered;
}

/**
 * Send alert via webhook (supports Slack, Discord, etc.)
 */
async function sendWebhookAlert(
  webhookUrl: string,
  message: string,
  tier: ModelTier,
  tokens: number,
  limit: number,
  percentage: number
): Promise<void> {
  // Generic webhook payload (works with Slack, Discord, etc.)
  const payload = {
    text: message,
    attachments: [
      {
        color: percentage >= 90 ? 'danger' : 'warning',
        fields: [
          {
            title: 'Tier',
            value: tier.toUpperCase(),
            short: true,
          },
          {
            title: 'Usage',
            value: `${percentage}%`,
            short: true,
          },
          {
            title: 'Tokens Used',
            value: tokens.toLocaleString(),
            short: true,
          },
          {
            title: 'Daily Limit',
            value: limit.toLocaleString(),
            short: true,
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }
}
