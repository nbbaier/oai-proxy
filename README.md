# OpenAI Token Tracking

Track OpenAI API usage and stay within free tier allocations. Choose between two approaches:

## 🔄 Proxy Approach (This Directory)
A lightweight proxy server that intercepts requests, tracks usage in real-time, and enforces daily limits. Built with Bun, TypeScript, and Hono.

**Best for:** Real-time enforcement, request blocking, detailed per-request logging

## ☁️ Polling Approach ([`/cloudflare-worker`](./cloudflare-worker))
A serverless Cloudflare Worker that polls OpenAI's usage API every few minutes and provides monitoring & alerts. Zero maintenance, free tier sufficient.

**Best for:** Monitoring, historical analysis, serverless deployments, zero maintenance

📊 **[See detailed comparison](./cloudflare-worker/COMPARISON.md)** to choose the right approach for your needs.

---

# Proxy Approach - Documentation

## Features

-  **Token Tracking**: Automatically tracks token usage across all OpenAI API requests
-  **Daily Limits**: Enforces daily token limits with automatic midnight resets
-  **Tier Management**: Separate tracking for premium (1M tokens/day) and mini (10M tokens/day) models
-  **Request History**: Logs all API requests with detailed token usage information
-  **Web Dashboard**: Beautiful, real-time dashboard to monitor usage and view history
-  **Rate Limiting**: Blocks requests when daily limits are exceeded
-  **Cloud-Ready**: Docker support and Fly.io configuration included

## Token Limits

OpenAI provides free daily tokens for approved models when you agree to data sharing for training:

### Premium Tier (1M tokens/day)

-  gpt-5, gpt-5-codex, gpt-5-chat-latest
-  gpt-4.1, gpt-4o
-  o1, o3, o1-preview

### Mini Tier (10M tokens/day)

-  gpt-5-mini, gpt-5-nano
-  gpt-4.1-mini, gpt-4.1-nano, gpt-4o-mini
-  o1-mini, o3-mini, o4-mini
-  codex-mini-latest

### Important Notes

**Reset Schedule:** Token quotas reset daily at **00:00 UTC** (not your local timezone). The proxy matches OpenAI's official reset schedule.

**Usage Tier:** These limits apply to Usage Tiers 3-5. Tiers 1-2 receive lower limits (250K/2.5M tokens respectively). Check your tier at [platform.openai.com/settings/organization/limits](https://platform.openai.com/settings/organization/limits).

**Exclusions:** The free token program does NOT include:
- Fine-tuned models
- Fine-tuning training
- Evaluations (evals)
- Tool/function calling is included, but tokens used are counted

**Blocking vs Billing:** Unlike OpenAI which bills overage at normal rates, this proxy **blocks** requests that would exceed your daily limit to prevent unexpected charges.

## Quick Start

### Prerequisites

-  [Bun](https://bun.sh) v1.0 or higher
-  OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd oai-proxy
```

2. Install dependencies:

```bash
bun install
```

3. Create a `.env` file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
DATABASE_PATH=./db/usage.db
TIMEZONE=UTC
PREMIUM_TIER_LIMIT=1000000
MINI_TIER_LIMIT=10000000
```

5. Start the server:

```bash
bun start
```

The server will be available at `http://localhost:3000`

## Usage

### Web Dashboard

Visit `http://localhost:3000/dashboard` to view:

-  Real-time token usage for both tiers
-  Progress bars and percentage indicators
-  Request history with pagination
-  Auto-refresh every 10 seconds

### Using the Proxy

Instead of calling OpenAI's API directly at `https://api.openai.com/v1`, point your applications to your proxy:

```javascript
// Before
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
   baseURL: "https://api.openai.com/v1",
});

// After
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
   baseURL: "http://localhost:3000/v1", // Point to your proxy
});
```

The proxy will:

1. Check if your daily limit has been exceeded
2. Forward the request to OpenAI if within limits
3. Track token usage from the response
4. Return a 429 error if the limit is exceeded

### API Endpoints

#### `GET /` - Service information

Returns basic service information and available endpoints.

#### `GET /api/health` - Health check

Returns server status for monitoring.

#### `GET /api/usage` - Current usage statistics

```json
{
   "premium": {
      "used": 15000,
      "limit": 1000000,
      "percentage": 1.5
   },
   "mini": {
      "used": 50000,
      "limit": 10000000,
      "percentage": 0.5
   },
   "date": "2025-01-15"
}
```

#### `GET /api/history` - Request history

Query parameters:

-  `limit` (default: 100, max: 500) - Number of records to return
-  `offset` (default: 0) - Number of records to skip

```json
{
   "data": [
      {
         "id": 1,
         "timestamp": "2025-01-15T10:30:00.000Z",
         "model": "gpt-4o",
         "prompt_tokens": 100,
         "completion_tokens": 50,
         "total_tokens": 150,
         "request_path": "/v1/chat/completions",
         "status": 200,
         "tier": "premium"
      }
   ],
   "pagination": {
      "limit": 100,
      "offset": 0,
      "total": 1,
      "hasMore": false
   }
}
```

#### `GET /api/stats` - Aggregate statistics

Returns combined usage and request count information.

#### `POST /api/reconcile` - Reconcile usage with OpenAI

Fetches actual usage data from OpenAI's Admin API and updates your database to reflect the true token usage. This is especially useful for tracking streaming requests which can't be tracked in real-time.

**Requirements:**
- `OPENAI_ADMIN_KEY` environment variable must be set
- Get an admin key from: https://platform.openai.com/settings/organization/admin-keys

**Query parameters:**
- `date` (optional) - YYYY-MM-DD format. Defaults to today.

**Example usage:**
```bash
# Reconcile today's usage
curl -X POST http://localhost:3000/api/reconcile

# Reconcile a specific date
curl -X POST "http://localhost:3000/api/reconcile?date=2025-11-12"
```

**Response:**
```json
{
  "success": true,
  "date": "2025-11-12",
  "premium": {
    "before": 92,
    "after": 350,
    "added": 258
  },
  "mini": {
    "before": 0,
    "after": 150,
    "added": 150
  },
  "details": [
    "gpt-5 (premium): 258 tokens",
    "gpt-4o-mini (mini): 150 tokens"
  ]
}
```

**Note:** Streaming requests don't provide token usage in real-time, so reconciliation is recommended after using streaming to get accurate counts.

## Development

### Run in development mode with auto-reload:

```bash
bun run dev
```

### Project Structure

```
oai-proxy/
├── src/
│   ├── lib/
│   │   ├── config.ts      # Environment configuration
│   │   ├── database.ts    # SQLite operations
│   │   ├── models.ts      # Model tier mapping
│   │   └── proxy.ts       # Core proxy logic
│   ├── routes/
│   │   └── api.ts         # API endpoints
│   └── types/
│       └── index.ts       # TypeScript interfaces
├── public/
│   ├── index.html         # Dashboard HTML
│   ├── styles.css         # Dashboard styles
│   └── app.js             # Dashboard JavaScript
├── db/                    # SQLite database (created automatically)
├── index.ts               # Main server entry point
├── Dockerfile             # Docker configuration
└── fly.toml               # Fly.io deployment config
```

## Deployment

### Docker

Build and run with Docker:

```bash
# Build the image
bun run docker:build

# Run the container
bun run docker:run
```

Or manually:

```bash
docker build -t oai-proxy .
docker run -p 3000:3000 --env-file .env -v $(pwd)/db:/app/db oai-proxy
```

### Fly.io

1. Install the Fly CLI:

```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly.io:

```bash
fly auth login
```

3. Create and configure your app:

```bash
fly launch
```

4. Set your OpenAI API key as a secret:

```bash
fly secrets set OPENAI_API_KEY=your_api_key_here
```

5. Deploy:

```bash
fly deploy
```

6. Create a volume for persistent storage:

```bash
fly volumes create oai_proxy_data --size 1
```

Your app will be available at `https://your-app-name.fly.dev`

### Other Platforms

This proxy can be deployed to any platform that supports Docker or Node.js/Bun:

-  Railway
-  Render
-  DigitalOcean App Platform
-  AWS ECS
-  Google Cloud Run

## Configuration

### Environment Variables

| Variable             | Description                                      | Default         |
| -------------------- | ------------------------------------------------ | --------------- |
| `OPENAI_API_KEY`     | Your OpenAI API key (required)                   | -               |
| `OPENAI_ADMIN_KEY`   | OpenAI Admin API key (optional, for reconciliation) | -               |
| `PORT`               | Server port                                      | `3000`          |
| `DATABASE_PATH`      | Path to SQLite database                          | `./db/usage.db` |
| `PREMIUM_TIER_LIMIT` | Daily token limit for premium models             | `1000000`       |
| `MINI_TIER_LIMIT`    | Daily token limit for mini models                | `10000000`      |
| `DEBUG`              | Enable verbose reconciliation logging            | `false`         |

## How It Works

1. **Request Interception**: When your app makes a request to `/v1/*`, the proxy intercepts it
2. **Limit Check**: Checks if the model's tier has exceeded its daily limit
3. **Daily Reset**: Automatically resets counters at 00:00 UTC (matches OpenAI's reset schedule)
4. **Request Forwarding**: If within limits, forwards the request to OpenAI's API
5. **Token Tracking**: Extracts token usage from the response and updates the database
6. **History Logging**: Stores request details for the dashboard and API

## Troubleshooting

### Database locked error

If you see "database is locked" errors, ensure only one instance of the proxy is running.

### Unknown model warning

If you see "Unknown model X - defaulting to premium tier", the model isn't recognized. It will be counted against the premium tier (safer default). Add it to `src/lib/models.ts` if needed.

### Timezone issues

Ensure your `TIMEZONE` environment variable uses a valid IANA timezone identifier. Test with:

```javascript
Intl.DateTimeFormat(undefined, { timeZone: "Your/Timezone" });
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this for your projects!

## Acknowledgments

Built with [Bun](https://bun.sh) - the fast all-in-one JavaScript runtime.
