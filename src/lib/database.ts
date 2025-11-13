import { Database } from "bun:sqlite";
import type {
	Config,
	ModelTier,
	RequestHistory,
	UsageRecord,
	UsageStats,
} from "../types";
import { getConfig } from "./config";

let db: Database;

/**
 * Initialize the database and create tables if they don't exist
 */
export function initDatabase(
	dbPath: string = getConfig().DATABASE_PATH,
): Database {
	db = new Database(dbPath);

	// Enable WAL mode for better concurrency
	db.run("PRAGMA journal_mode = WAL");

	createTables();
	initializeConfig();

	return db;
}

/**
 * Create database tables
 */
function createTables() {
	// Usage records table - tracks daily token usage per tier
	db.run(`
    CREATE TABLE IF NOT EXISTS usage_records (
      tier TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      "limit" INTEGER NOT NULL
    )
  `);

	// Request history table - logs all API requests
	db.run(`
    CREATE TABLE IF NOT EXISTS request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      request_path TEXT NOT NULL,
      status INTEGER NOT NULL,
      tier TEXT NOT NULL
    )
  `);

	// Create index on timestamp for faster history queries
	db.run(`
    CREATE INDEX IF NOT EXISTS idx_request_history_timestamp
    ON request_history(timestamp DESC)
  `);

	// Config table - stores application configuration
	db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

/**
 * Initialize configuration with default values
 */
function initializeConfig() {
	const config = getConfig();
	const today = getCurrentDate();

	// Set current date if not exists
	const currentDate = getConfigValue("current_date");
	if (!currentDate) {
		setConfigValue("current_date", today);
	}

	// Initialize usage records for both tiers if they don't exist
	const premiumUsage = getUsageRecord("premium");
	if (!premiumUsage) {
		upsertUsageRecord({
			tier: "premium",
			date: today,
			tokens_used: 0,
			limit: config.PREMIUM_TIER_LIMIT,
		});
	}

	const miniUsage = getUsageRecord("mini");
	if (!miniUsage) {
		upsertUsageRecord({
			tier: "mini",
			date: today,
			tokens_used: 0,
			limit: config.MINI_TIER_LIMIT,
		});
	}
}

/**
 * Get current date in YYYY-MM-DD format in UTC
 * Note: OpenAI resets free token quotas at 00:00 UTC daily
 */
export function getCurrentDate(): string {
	const now = new Date();

	// Format date in UTC timezone to match OpenAI's reset schedule
	const dateStr = now.toLocaleDateString("en-CA", {
		timeZone: "UTC",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	return dateStr;
}

/**
 * Check if a new day has started and reset usage if needed
 */
export function checkAndResetDaily(): boolean {
	const currentDate = getConfigValue("current_date");
	const today = getCurrentDate();

	if (currentDate !== today) {
		console.log(
			`New day detected: ${currentDate} -> ${today}. Resetting usage counters.`,
		);

		// Reset both tiers
		resetUsageRecord("premium");
		resetUsageRecord("mini");

		// Update current date
		setConfigValue("current_date", today);

		return true;
	}

	return false;
}

// ============================================================================
// Usage Records Operations
// ============================================================================

/**
 * Get usage record for a tier
 */
export function getUsageRecord(tier: ModelTier): UsageRecord | undefined {
	const stmt = db.prepare("SELECT * FROM usage_records WHERE tier = ?");
	return stmt.get(tier) as UsageRecord | undefined;
}

/**
 * Insert or update usage record
 */
function upsertUsageRecord(record: UsageRecord): void {
	const stmt = db.prepare(`
    INSERT INTO usage_records (tier, date, tokens_used, "limit")
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tier) DO UPDATE SET
      date = excluded.date,
      tokens_used = excluded.tokens_used,
      "limit" = excluded."limit"
  `);

	stmt.run(record.tier, record.date, record.tokens_used, record.limit);
}

/**
 * Increment tokens used for a tier
 */
export function incrementTokens(tier: ModelTier, tokens: number): void {
	const stmt = db.prepare(`
    UPDATE usage_records
    SET tokens_used = tokens_used + ?
    WHERE tier = ?
  `);

	stmt.run(tokens, tier);
}

/**
 * Reset usage record for a tier
 */
function resetUsageRecord(tier: ModelTier): void {
	const config = getConfig();
	const limit =
		tier === "premium" ? config.PREMIUM_TIER_LIMIT : config.MINI_TIER_LIMIT;
	const today = getCurrentDate();

	upsertUsageRecord({
		tier,
		date: today,
		tokens_used: 0,
		limit,
	});
}

/**
 * Get usage statistics for dashboard
 */
export function getUsageStats(): UsageStats {
	const premium = getUsageRecord("premium");
	const mini = getUsageRecord("mini");

	if (!premium || !mini) {
		throw new Error("Usage records not initialized");
	}

	return {
		premium: {
			used: premium.tokens_used,
			limit: premium.limit,
			percentage: (premium.tokens_used / premium.limit) * 100,
		},
		mini: {
			used: mini.tokens_used,
			limit: mini.limit,
			percentage: (mini.tokens_used / mini.limit) * 100,
		},
		date: getCurrentDate(),
	};
}

// ============================================================================
// Request History Operations
// ============================================================================

/**
 * Add a request to history
 */
export function addRequestHistory(entry: Omit<RequestHistory, "id">): void {
	const stmt = db.prepare(`
    INSERT INTO request_history
    (timestamp, model, prompt_tokens, completion_tokens, total_tokens, request_path, status, tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

	stmt.run(
		entry.timestamp,
		entry.model,
		entry.prompt_tokens,
		entry.completion_tokens,
		entry.total_tokens,
		entry.request_path,
		entry.status,
		entry.tier,
	);
}

/**
 * Get recent request history (paginated)
 */
export function getRequestHistory(
	limit: number = 100,
	offset: number = 0,
): RequestHistory[] {
	const stmt = db.prepare(`
    SELECT * FROM request_history
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

	return stmt.all(limit, offset) as RequestHistory[];
}

/**
 * Get request history count
 */
export function getRequestHistoryCount(): number {
	const stmt = db.prepare("SELECT COUNT(*) as count FROM request_history");
	const result = stmt.get() as { count: number };
	return result.count;
}

// ============================================================================
// Config Operations
// ============================================================================

/**
 * Get a config value
 */
function getConfigValue(key: string): string | undefined {
	const stmt = db.prepare("SELECT value FROM config WHERE key = ?");
	const result = stmt.get(key) as Config | undefined;
	return result?.value;
}

/**
 * Set a config value
 */
function setConfigValue(key: string, value: string): void {
	const stmt = db.prepare(`
    INSERT INTO config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

	stmt.run(key, value);
}
