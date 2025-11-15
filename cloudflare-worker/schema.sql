-- Usage snapshots table - stores periodic snapshots of usage data
CREATE TABLE IF NOT EXISTS usage_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL, -- Unix timestamp when snapshot was taken
  date TEXT NOT NULL, -- UTC date in YYYY-MM-DD format
  tier TEXT NOT NULL, -- 'premium' or 'mini'
  tokens_used INTEGER NOT NULL, -- Total tokens used for this tier on this date
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(timestamp, tier) -- Prevent duplicate snapshots
);

-- Index for fast date-based queries
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON usage_snapshots(date, tier);
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON usage_snapshots(timestamp);

-- Model breakdown table - stores per-model usage details
CREATE TABLE IF NOT EXISTS model_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  num_requests INTEGER NOT NULL,
  cached_tokens INTEGER DEFAULT 0,
  FOREIGN KEY (snapshot_id) REFERENCES usage_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_model_usage_snapshot ON model_usage(snapshot_id);

-- Daily usage summary table - stores end-of-day summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE, -- UTC date in YYYY-MM-DD format
  premium_tokens INTEGER NOT NULL,
  mini_tokens INTEGER NOT NULL,
  premium_limit INTEGER NOT NULL,
  mini_limit INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table - stores triggered alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  tier TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  limit_value INTEGER NOT NULL,
  percentage INTEGER NOT NULL,
  message TEXT NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
