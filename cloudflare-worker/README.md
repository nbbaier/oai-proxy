# OpenAI Usage Tracker - Cloudflare Worker

A lightweight, serverless solution for tracking OpenAI API usage via scheduled polling. Runs on Cloudflare Workers with D1 database storage.

## Architecture

Instead of acting as a proxy, this worker:
- **Polls** OpenAI's Usage API every 5 minutes (configurable)
- **Stores** usage snapshots in Cloudflare D1 (SQLite)
- **Tracks** historical usage trends over time
- **Alerts** when approaching daily token limits
- **Provides** a REST API for dashboards

## Features

- ✅ **Zero maintenance**: Fully serverless on Cloudflare's edge network
- ✅ **Scheduled polling**: Automatic checks every 5 minutes via cron triggers
- ✅ **Historical tracking**: Stores timestamped snapshots for trend analysis
- ✅ **Smart alerts**: Webhook notifications when approaching limits
- ✅ **Per-model breakdown**: Tracks usage by individual models
- ✅ **REST API**: Easy integration with dashboards
- ✅ **Tier management**: Separate tracking for premium and mini tiers

## Setup

### Prerequisites

- Cloudflare account (free tier works)
- OpenAI Admin API key ([get one here](https://platform.openai.com/settings/organization/admin-keys))
- Node.js 18+ (for running Wrangler CLI)

### Installation

1. **Install dependencies:**
   ```bash
   cd cloudflare-worker
   npm install
   ```

2. **Create D1 database:**
   ```bash
   npm run db:create
   ```

   Copy the `database_id` from the output and update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "oai-usage"
   database_id = "your-database-id-here"
   ```

3. **Run migrations:**
   ```bash
   # For local development
   npm run db:migrate:local

   # For production
   npm run db:migrate
   ```

4. **Set secrets:**
   ```bash
   # Required: OpenAI Admin API key
   npx wrangler secret put OPENAI_ADMIN_KEY

   # Optional: Webhook URL for alerts (Slack, Discord, etc.)
   npx wrangler secret put ALERT_WEBHOOK_URL
   ```

5. **Configure limits (optional):**

   Edit `wrangler.toml` to adjust daily limits and alert threshold:
   ```toml
   [vars]
   PREMIUM_TIER_LIMIT = "1000000"    # 1M tokens/day
   MINI_TIER_LIMIT = "10000000"      # 10M tokens/day
   ALERT_THRESHOLD = "80"            # Alert at 80% usage
   ```

### Development

Run locally with Wrangler:
```bash
npm run dev
```

Test the cron trigger manually:
```bash
curl -X POST http://localhost:8787/api/poll
```

View logs:
```bash
npm run tail
```

### Deployment

Deploy to Cloudflare:
```bash
npm run deploy
```

The worker will automatically run every 5 minutes based on the cron schedule in `wrangler.toml`.

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1703001234567
}
```

### `GET /api/usage`
Get current usage statistics for today.

**Response:**
```json
{
  "date": "2024-12-19",
  "premium": {
    "tokens_used": 45000,
    "limit": 1000000,
    "percentage": 5
  },
  "mini": {
    "tokens_used": 120000,
    "limit": 10000000,
    "percentage": 1
  },
  "last_updated": 1703001234
}
```

### `GET /api/history?days=7`
Get historical snapshots for the last N days.

**Query params:**
- `days` (optional): Number of days to fetch (default: 7)
- `date` (optional): Specific date in YYYY-MM-DD format

**Response:**
```json
{
  "snapshots": [
    {
      "timestamp": 1703001234,
      "date": "2024-12-19",
      "premium_tokens": 45000,
      "mini_tokens": 120000
    }
  ],
  "count": 24
}
```

### `GET /api/alerts?days=7`
Get triggered alerts from the last N days.

**Query params:**
- `days` (optional): Number of days to fetch (default: 7)

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "timestamp": 1703001234,
      "tier": "premium",
      "tokens_used": 850000,
      "limit_value": 1000000,
      "percentage": 85,
      "message": "⚠️ OpenAI Usage Alert: PREMIUM tier at 85%",
      "sent": true,
      "created_at": "2024-12-19T10:30:00Z"
    }
  ],
  "count": 1
}
```

### `POST /api/poll`
Manually trigger a usage poll (for testing or on-demand updates).

**Response:**
```json
{
  "success": true,
  "date": "2024-12-19",
  "premium_tokens": 45000,
  "mini_tokens": 120000,
  "alerts_triggered": 0
}
```

## Configuration

### Cron Schedule

The polling frequency is configured in `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

Adjust as needed:
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours

### Alert Webhooks

Set `ALERT_WEBHOOK_URL` to receive notifications via:

**Slack:**
1. Create an [Incoming Webhook](https://api.slack.com/messaging/webhooks)
2. Set the webhook URL: `npx wrangler secret put ALERT_WEBHOOK_URL`

**Discord:**
1. Create a webhook in Server Settings → Integrations
2. Set the webhook URL: `npx wrangler secret put ALERT_WEBHOOK_URL`

**Other services:**
Any service that accepts JSON webhooks with a `text` field.

### Model Tiers

Models are classified in `src/models.ts`:

- **Premium tier** (1M tokens/day): gpt-4o, gpt-4-turbo, gpt-4, o1-preview, o1-mini
- **Mini tier** (10M tokens/day): gpt-4o-mini, gpt-3.5-turbo

Unknown models default to premium tier (safer, more restrictive).

## Dashboard Integration

This worker provides a REST API compatible with the existing React dashboard. To adapt the dashboard:

1. Update the API base URL to point to your Cloudflare Worker
2. The endpoints match the existing proxy API structure
3. No changes needed to the dashboard code!

## Database Schema

The D1 database stores:

- **usage_snapshots**: Timestamped usage snapshots per tier
- **model_usage**: Per-model token breakdown
- **daily_summaries**: End-of-day usage summaries
- **alerts**: Triggered usage alerts

See `schema.sql` for full details.

## Comparison: Proxy vs. Polling

| Feature | Proxy (original) | Polling (this) |
|---------|------------------|----------------|
| **Architecture** | Sits between client and OpenAI | Standalone worker |
| **Tracking** | Real-time request interception | Periodic polling (5-15 min) |
| **Blocking** | Can block requests at limit | Monitoring only |
| **Complexity** | Medium (proxy logic) | Low (simple polling) |
| **Hosting** | Requires server | Serverless (Cloudflare) |
| **Cost** | Server costs | Free tier works |
| **Data accuracy** | Real-time | Delayed (polling interval) |
| **Use case** | Enforce limits | Monitor usage |

Choose polling when:
- ✅ You want monitoring without blocking
- ✅ You prefer serverless/zero-maintenance
- ✅ 5-15 minute delay is acceptable
- ✅ You want historical trend analysis

Choose proxy when:
- ✅ You need real-time limit enforcement
- ✅ You want to block requests at limit
- ✅ You need per-request tracking

## Troubleshooting

### "OPENAI_ADMIN_KEY is required"
You need an Admin API key (not a regular API key). Get one from:
https://platform.openai.com/settings/organization/admin-keys

### Cron not triggering
- Cron triggers only work in production (not local dev)
- Use `POST /api/poll` to test manually
- Check logs with `npm run tail` after deploying

### Database errors
- Make sure you ran migrations: `npm run db:migrate`
- Check the database exists: `npx wrangler d1 list`
- Verify `database_id` in `wrangler.toml`

### High usage costs
The free tier includes:
- 100,000 Worker requests/day
- 5M D1 reads/day, 100K writes/day

With 5-minute polling:
- 288 cron triggers/day (well within limits)
- ~1000 D1 operations/day (well within limits)

## License

Same as parent project (see root LICENSE file).
