# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---
description: OpenAI Token Tracking Proxy - Architecture and Development Guide
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

## Project Overview

This is an OpenAI API proxy server that tracks token usage and enforces daily limits to help stay within OpenAI's free tier allocations. Built with Bun, Hono (web framework), and SQLite (via `bun:sqlite`).

## Runtime and Commands

**Use Bun, not Node.js:**
- Run the server: `bun run index.ts` or `bun start`
- Development mode with hot reload: `bun run dev` or `bun --watch index.ts`
- Install dependencies: `bun install`
- Run tests: `bun test`
- Docker: `bun run docker:build` and `bun run docker:run`

**Note:** Bun automatically loads `.env` files - do not use dotenv package.

## Architecture

### Request Flow

1. Client makes request to `/v1/*` (e.g., `/v1/chat/completions`)
2. Proxy checks for daily reset (00:00 UTC) via `checkAndResetDaily()`
3. Extracts model from request body, determines tier via `getModelTier()`
4. Checks if tier's daily token limit is exceeded
5. If within limits: forwards to OpenAI API, tracks usage in response
6. If limit exceeded: returns 429 error
7. For non-streaming: extracts token usage from response and updates database
8. For streaming: passes through as-is (requires manual reconciliation later)

### Core Components

**Entry point:** `index.ts`
- Initializes database and Hono app
- Sets up routes: API endpoints (`/api/*`), dashboard (`/dashboard`), proxy (`/v1/*`)
- Exports server config for Bun runtime

**Database:** `src/lib/database.ts`
- Uses `bun:sqlite` with WAL mode for concurrency
- Three tables: `usage_records`, `request_history`, `config`
- Daily reset logic in `checkAndResetDaily()` - compares stored date vs current UTC date
- All dates use UTC to match OpenAI's reset schedule (00:00 UTC)

**Proxy logic:** `src/lib/proxy.ts`
- `proxyRequest()` - main handler that intercepts `/v1/*` requests
- Checks limits before forwarding to OpenAI
- Extracts and tracks token usage from non-streaming responses
- Streaming requests pass through without token tracking (need reconciliation)

**Model tiers:** `src/lib/models.ts`
- Two tiers: `premium` (1M tokens/day) and `mini` (10M tokens/day)
- `getModelTier()` uses prefix matching (e.g., "gpt-4o" → premium, "gpt-4o-mini" → mini)
- Unknown models default to premium tier (safer, more restrictive)

**Reconciliation:** `src/lib/reconciliation.ts`
- Fetches actual usage from OpenAI's Admin API
- Fills gaps from streaming requests (which don't report tokens in real-time)
- Requires `OPENAI_ADMIN_KEY` environment variable
- Triggered via `POST /api/reconcile?date=YYYY-MM-DD`
- Only adds missing tokens (never reduces counts)

**API routes:** `src/routes/api.ts`
- `GET /api/health` - health check
- `GET /api/usage` - current token usage stats
- `GET /api/history` - paginated request history
- `GET /api/stats` - aggregate statistics
- `POST /api/reconcile` - reconcile with OpenAI's actual usage

### Key Design Decisions

**UTC timezone:** All dates and daily resets use UTC to match OpenAI's reset schedule (00:00 UTC). Do not use local timezones.

**Streaming limitation:** Streaming responses pass through without token tracking because the usage data isn't available until the stream completes. Users must run reconciliation to get accurate counts for streaming requests.

**Default to premium:** Unknown models default to premium tier to be conservative with limits.

**Blocking vs billing:** Unlike OpenAI which bills overage, this proxy blocks requests that exceed limits to prevent unexpected charges.

## Environment Configuration

Required environment variables (see `.env.example`):
- `OPENAI_API_KEY` - Required for proxying requests
- `OPENAI_ADMIN_KEY` - Optional, required only for reconciliation feature
- `PORT` - Server port (default: 3000)
- `DATABASE_PATH` - SQLite database path (default: ./db/usage.db)
- `PREMIUM_TIER_LIMIT` - Daily token limit for premium tier (default: 1000000)
- `MINI_TIER_LIMIT` - Daily token limit for mini tier (default: 10000000)
- `DEBUG` - Enable verbose reconciliation logging (default: false)

## Development Guidelines

**Adding new models:** Update the `PREMIUM_MODELS` or `MINI_MODELS` arrays in `src/lib/models.ts`. Use prefix matching (e.g., "gpt-5" matches "gpt-5", "gpt-5-turbo-preview", etc.).

**Database changes:** The database is initialized on startup. Schema changes require migration logic or manual database deletion for development (production requires proper migrations).

**TypeScript types:** All type definitions are in `src/types/index.ts`. Key types include `ModelTier`, `UsageRecord`, `RequestHistory`, `UsageStats`.

**Bun APIs used:**
- `bun:sqlite` for database (not `better-sqlite3`)
- Hono framework for HTTP routing (not Express)
- `Bun.serve()` exports via `export default { port, fetch }` pattern

**Testing streaming:** Streaming requests won't show accurate token usage until reconciliation is run. Test with `DEBUG=true` for verbose reconciliation logs.

**CORS:** The proxy includes CORS headers for local development. Adjust `Access-Control-Allow-Origin` in production as needed.

## Deployment

Supports Docker and Fly.io (see `Dockerfile` and `fly.toml`). Database requires persistent storage:
- Docker: mount volume at `/app/db`
- Fly.io: create volume with `fly volumes create oai_proxy_data --size 1`

Set `OPENAI_API_KEY` as a secret in deployment platform (do not commit to `.env`).
