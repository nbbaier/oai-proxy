# Edge-Native Unification

**Category:** Architecture
**Quarter:** Q4
**T-shirt Size:** XL

## Why This Matters

Currently, we have two split codebases: the main Proxy (Node/Bun) and the Cloudflare Worker (Polling). This is confusing and duplicates effort.

The goal is to make the main proxy logic *serverless-native* so it can run on Cloudflare Workers (or Bun) directly. This gives us global low-latency distribution and infinite scaling without managing Docker containers.

## Current State

- `src/` (Bun server).
- `cloudflare-worker/` (Totally separate polling logic).

## Proposed Future State

- **Unified Codebase:** One core logic library that runs everywhere.
- **Drizzle on D1:** Use Cloudflare D1 (SQLite at edge) for the database.
- **Deploy Targets:** `npm run deploy:fly` (Node/Bun) OR `npm run deploy:cloudflare` (Worker).

## Key Deliverables

- [ ] Remove Node.js specific dependencies (filesystem, etc) from core logic.
- [ ] Abstract the HTTP server layer (Hono does this well already).
- [ ] Migrate `bun:sqlite` specific code to a generic DB interface that supports D1.
- [ ] Deprecate the old polling worker in favor of this real-time proxy on Edge.

## Prerequisites

- **03-database-agnosticism** (Drizzle is key here to support D1).

## Risks & Open Questions

- **Edge Constraints:** Some libraries don't work on Workers (e.g., standard `pg` drivers, heavy crypto).
- **Latency:** DB writes on D1 can be slower than local SQLite.

## Notes

This is the "Endgame" architecture for a modern proxy.
