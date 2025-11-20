# OpenAI Proxy - Codebase Overview

**Last Updated:** November 20, 2025

## Quick Architecture Summary

This is an OpenAI token tracking system with **two deployment approaches**:

### 1. Real-time Proxy Server (Main Directory)
- **Purpose**: Intercepts and enforces daily token limits
- **Tech**: Bun + Hono framework + SQLite
- **Key**: Blocks requests when limits exceeded (1M premium, 10M mini)
- **Entry**: `index.ts` → serves dashboard + proxy API

### 2. Serverless Polling (Cloudflare Worker)
- **Purpose**: Monitors usage via scheduled polling
- **Tech**: Cloudflare Workers + D1 database
- **Key**: Zero-maintenance with webhook alerts
- **Entry**: `cloudflare-worker/src/index.ts`

## Core Components Flow

```
Client Request → Proxy Server → OpenAI API
      ↓              ↓
   Check Limits   Track Usage
      ↓              ↓
   SQLite DB ← Response Data
```

## Key Files to Know

**Backend Logic:**
- `src/lib/proxy.ts` - Request interception & limit enforcement
- `src/lib/database.ts` - SQLite operations & daily resets
- `src/lib/models.ts` - Model tier classification (premium/mini)

**Frontend:**
- `dashboard/src/App.tsx` - React dashboard with usage charts
- `dashboard/src/components/` - shadcn/ui components

**API Routes:**
- `src/routes/api.ts` - Health, usage, history endpoints

## First Tasks When Resuming

1. **Check current usage**: Visit `/dashboard` or hit `/api/usage` endpoint
2. **Verify limits**: Premium models (gpt-4, o1, etc.) = 1M tokens/day, Mini models = 10M tokens/day
3. **Test proxy**: Send request to `http://localhost:3000/v1/chat/completions`
4. **Check logs**: Look for daily reset at 00:00 UTC in request history
5. **Run quality checks**: `bunx @biomejs/biome check --write`

## Quick Commands
- `bun start` - Start proxy server
- `bun run dev` - Hot reload development
- `bun test` - Run tests
- `bunx @biomejs/biome check --write` - Format & lint

## Important Notes
- Unknown models default to premium tier (conservative)
- Streaming requests pass through without token tracking
- Daily reset happens at 00:00 UTC (aligns with OpenAI)
- Database uses WAL mode for concurrent access
- Dashboard auto-refreshes every 10 seconds