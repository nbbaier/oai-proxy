import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { pollUsage } from './poller';
import {
  getCurrentUsageStats,
  getHistoricalSnapshots,
  getSnapshotsForDate,
} from './database';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for dashboard
app.use('/*', cors());

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * Get current usage statistics
 */
app.get('/api/usage', async (c) => {
  try {
    const stats = await getCurrentUsageStats(c.env.DB, c.env);
    return c.json(stats);
  } catch (error) {
    console.error('Error fetching usage:', error);
    return c.json(
      {
        error: 'Failed to fetch usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get historical snapshots
 * Query params:
 *   - days: number of days to fetch (default: 7)
 *   - date: specific date in YYYY-MM-DD format (optional)
 */
app.get('/api/history', async (c) => {
  try {
    const date = c.req.query('date');
    const days = parseInt(c.req.query('days') || '7', 10);

    const snapshots = date
      ? await getSnapshotsForDate(c.env.DB, date)
      : await getHistoricalSnapshots(c.env.DB, days);

    return c.json({
      snapshots,
      count: snapshots.length,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    return c.json(
      {
        error: 'Failed to fetch history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Manually trigger a poll (for testing or on-demand updates)
 */
app.post('/api/poll', async (c) => {
  try {
    const result = await pollUsage(c.env);
    return c.json(result);
  } catch (error) {
    console.error('Error polling usage:', error);
    return c.json(
      {
        error: 'Failed to poll usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Get alerts
 * Query params:
 *   - days: number of days to fetch (default: 7)
 */
app.get('/api/alerts', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '7', 10);

    const result = await c.env.DB
      .prepare(
        `SELECT * FROM alerts
         WHERE datetime(created_at) >= datetime('now', '-' || ? || ' days')
         ORDER BY timestamp DESC
         LIMIT 100`
      )
      .bind(days)
      .all();

    return c.json({
      alerts: result.results,
      count: result.results?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return c.json(
      {
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Root endpoint - API info
 */
app.get('/', (c) => {
  return c.json({
    name: 'OpenAI Usage Tracker',
    version: '1.0.0',
    description: 'Cloudflare Worker that polls OpenAI usage API',
    endpoints: {
      health: 'GET /health',
      usage: 'GET /api/usage',
      history: 'GET /api/history?days=7&date=YYYY-MM-DD',
      alerts: 'GET /api/alerts?days=7',
      poll: 'POST /api/poll (manual trigger)',
    },
  });
});

/**
 * Scheduled event handler (cron trigger)
 * Runs every 5 minutes as configured in wrangler.toml
 */
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log('Cron triggered at:', new Date(event.scheduledTime).toISOString());

    try {
      ctx.waitUntil(pollUsage(env));
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
