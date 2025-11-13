import { Hono } from "hono";
import {
	checkAndResetDaily,
	getRequestHistory,
	getRequestHistoryCount,
	getUsageStats,
} from "../lib/database";
import { reconcileUsage } from "../lib/reconciliation";

const api = new Hono();

/**
 * GET /api/health - Health check endpoint
 */
api.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});

/**
 * GET /api/usage - Get current usage statistics
 */
api.get("/usage", (c) => {
	try {
		// Check for daily reset before returning stats
		checkAndResetDaily();

		const stats = getUsageStats();
		return c.json(stats);
	} catch (error) {
		console.error("Error getting usage stats:", error);
		return c.json(
			{
				error: "Failed to retrieve usage statistics",
			},
			500,
		);
	}
});

/**
 * GET /api/history - Get request history (paginated)
 * Query params:
 *   - limit: number of records to return (default: 100, max: 500)
 *   - offset: number of records to skip (default: 0)
 */
api.get("/history", (c) => {
	try {
		const limit = Math.min(parseInt(c.req.query("limit") || "100", 10), 500);
		const offset = parseInt(c.req.query("offset") || "0", 10);

		const history = getRequestHistory(limit, offset);
		const total = getRequestHistoryCount();

		return c.json({
			data: history,
			pagination: {
				limit,
				offset,
				total,
				hasMore: offset + limit < total,
			},
		});
	} catch (error) {
		console.error("Error getting request history:", error);
		return c.json(
			{
				error: "Failed to retrieve request history",
			},
			500,
		);
	}
});

/**
 * GET /api/stats - Get aggregate statistics
 */
api.get("/stats", (c) => {
	try {
		checkAndResetDaily();

		const stats = getUsageStats();
		const total = getRequestHistoryCount();

		return c.json({
			usage: stats,
			totalRequests: total,
		});
	} catch (error) {
		console.error("Error getting stats:", error);
		return c.json(
			{
				error: "Failed to retrieve statistics",
			},
			500,
		);
	}
});

/**
 * POST /api/reconcile - Reconcile usage with OpenAI's actual usage data
 * Query params:
 *   - date: YYYY-MM-DD format (optional, defaults to today)
 *
 * Requires OPENAI_ADMIN_KEY environment variable to be set.
 * Get an admin key from: https://platform.openai.com/settings/organization/admin-keys
 */
api.post("/reconcile", async (c) => {
	try {
		const date = c.req.query("date");

		console.log(`Starting reconciliation${date ? ` for ${date}` : ""}...`);

		const result = await reconcileUsage(date);

		return c.json(result);
	} catch (error) {
		console.error("Error during reconciliation:", error);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		return c.json(
			{
				success: false,
				error: errorMessage,
			},
			500,
		);
	}
});

export default api;
