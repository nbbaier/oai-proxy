# AGENTS.md

OpenAI API proxy (Bun + Hono + `bun:sqlite`) that counts tokens per model tier and returns 429 once a tier's daily limit is hit, keeping usage inside OpenAI's free allocation. `/v1/*` forwards to OpenAI, `/api/*` serves usage data, `/dashboard` serves the React build in `dashboard/dist`.

## Commands

Use Bun for everything, `dashboard/` included. Scripts are in `package.json` and `dashboard/package.json`. Lint and format with `bunx @biomejs/biome check --write`. No tests exist yet.

## Invariants

- **UTC everywhere.** The daily reset is 00:00 UTC to match OpenAI; every date computation uses UTC.
- **Block, never bill.** Over the limit → 429. Unknown models count as `premium`, the stricter tier.
- **Streaming is untracked.** Streaming responses pass through uncounted. `POST /api/reconcile` (needs `OPENAI_ADMIN_KEY`) backfills from OpenAI's usage API and only ever adds tokens.

## Where to look

- **Writing code**, backend or dashboard: read `CODING_STANDARDS.md` first.
- **Adding a model**: `src/lib/models.ts`. Prefixes match with `startsWith`, so a mini model must win over its premium parent (`gpt-4o-mini` vs `gpt-4o`).
- **Changing an `/api/*` response**: update `dashboard/src/types/api.ts` to match `src/types/index.ts`.
- **Changing the schema**: there are no migrations; `initDatabase()` creates tables on startup. Delete `db/usage.db` locally; production needs a migration.
- `cloudflare-worker/` is a separate polling-based alternative (own README). `2026-roadmap/` holds planned work.
