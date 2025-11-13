import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getConfig } from "./src/lib/config";
import { initDatabase } from "./src/lib/database";
import { handleOptions, proxyRequest } from "./src/lib/proxy";
import api from "./src/routes/api";

// Initialize configuration
const config = getConfig();

// Initialize database
console.log("Initializing database...");
initDatabase(config.DATABASE_PATH);
console.log(`Database initialized at ${config.DATABASE_PATH}`);

// Create Hono app
const app = new Hono();

// Logging middleware
app.use("*", async (c, next) => {
	const start = Date.now();
	await next();
	const ms = Date.now() - start;
	console.log(`${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`);
});

// API routes
app.route("/api", api);

// Serve static files for React dashboard
app.use("/dashboard/*", serveStatic({ root: "./dashboard/dist" }));
app.get("/dashboard", serveStatic({ path: "./dashboard/dist/index.html" }));

// Health check at root
app.get("/", (c) => {
	return c.json({
		name: "OpenAI Token Tracking Proxy",
		version: "1.0.0",
		status: "running",
		endpoints: {
			dashboard: "/dashboard",
			health: "/api/health",
			usage: "/api/usage",
			history: "/api/history",
			proxy: "/v1/*",
		},
	});
});

// Handle OPTIONS requests for CORS
app.options("/v1/*", handleOptions);

// Proxy all /v1/* requests to OpenAI
app.all("/v1/*", proxyRequest);

// Start server
console.log(`Starting server on port ${config.PORT}...`);
console.log(`Daily reset: 00:00 UTC`);
console.log(
	`Premium tier limit: ${config.PREMIUM_TIER_LIMIT.toLocaleString()} tokens/day`,
);
console.log(
	`Mini tier limit: ${config.MINI_TIER_LIMIT.toLocaleString()} tokens/day`,
);

export default {
	port: config.PORT,
	fetch: app.fetch,
};

console.log(`\n✓ Server is running!`);
console.log(`  - Dashboard: http://localhost:${config.PORT}/dashboard`);
console.log(`  - API: http://localhost:${config.PORT}/api`);
console.log(`  - Proxy: http://localhost:${config.PORT}/v1`);
