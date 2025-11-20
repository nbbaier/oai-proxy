# AGENTS.md

## Commands

**Backend:**
- `bun start` - Run server
- `bun run dev` - Hot reload development
- `bun test` - Run all tests
- `bun test path/to/test.ts` - Run single test file
- `bun run build:dashboard` - Build React dashboard

**Code Quality:**
- `bunx @biomejs/biome check --write` - Format and lint all files
- `bunx @biomejs/biome check src/` - Check specific directory

## Code Style

**Runtime:** Use Bun APIs only - `bun:sqlite`, Hono framework, `Bun.serve()`
**Imports:** Organized automatically via Biome, use `@/` aliases for dashboard
**Formatting:** Tabs for indentation, double quotes for strings
**Types:** Strict TypeScript enabled, backend types in `src/types/index.ts`
**Naming:** camelCase for functions/variables, PascalCase for components/types
**Error Handling:** Return proper HTTP status codes, never expose internal errors
**Comments:** Only add when explicitly requested
**UTC Time:** All dates must use UTC for OpenAI reset alignment (00:00 UTC)

## Key Patterns

- Unknown models default to premium tier (conservative)
- Streaming requests pass through without token tracking
- Database uses WAL mode for concurrency
- Frontend uses shadcn/ui components and Tailwind CSS
- Never commit `.env` files or API keys