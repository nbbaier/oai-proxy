# Database Agnosticism (Drizzle ORM)

**Category:** Architecture
**Quarter:** Q1
**T-shirt Size:** M

## Why This Matters

The current reliance on `bun:sqlite` locks the application to a single-instance, stateful deployment. This makes it impossible to scale horizontally (e.g., run 3 replicas behind a load balancer) or persist data reliably in ephemeral environments without tricky volume management.

Moving to an ORM (Drizzle) allows us to support PostgreSQL, which enables high availability, cloud-native deployments (Neon, Supabase, RDS), and complex queries for analytics.

## Current State

- Direct usage of `bun:sqlite` in `src/lib/database.ts`.
- Raw SQL queries string-concatenated in the code.
- "Database is locked" issues mentioned in README.

## Proposed Future State

- **Drizzle ORM:** Replace raw SQL with typed Drizzle schemas and queries.
- **Pluggable Backends:** Support `sqlite` (for simple local use) and `postgres` (for production).
- **Migrations:** Automated schema migrations instead of `CREATE TABLE IF NOT EXISTS` checks on startup.

## Key Deliverables

- [ ] Install Drizzle ORM and Kit.
- [ ] Define schema in `src/db/schema.ts`.
- [ ] Refactor `src/lib/database.ts` to use Drizzle.
- [ ] Add env var `DATABASE_URL` support.

## Prerequisites

None. This is a foundational refactor.

## Risks & Open Questions

- **Performance:** Ensure Drizzle doesn't introduce latency in the hot path (it's usually very fast).
- **Breaking Changes:** The DB schema format might change, requiring a migration script for existing SQLite users.

## Notes

Drizzle is chosen over Prisma for its lightweight nature and better cold-start performance in serverless/edge environments.
