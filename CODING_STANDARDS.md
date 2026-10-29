# Coding Standards

## Backend

- Use Bun-native APIs: `bun:sqlite`, Bun's built-in `.env` loading, and `export default { port, fetch }` for the server. Route with Hono.
- Errors: return the matching HTTP status with a generic client message; log the detail server-side.
- Comments: add them only when asked.

## Dashboard (`dashboard/`)

- New UI starts from shadcn/ui: `bunx shadcn@latest add <component>`.
- API calls live in a custom hook in `src/hooks/`, one per resource; components consume hooks.
- Import with the `@/` alias.
- Colour with the theme tokens (`primary`, `secondary`, `destructive`, …) instead of raw Tailwind colours.
