-- 028: AI quota per user per day.
-- Tracks AI-call usage to stop individual users from draining Workers-AI
-- quota. Middleware (aiQuota) increments `calls` on every Workers-AI
-- invocation and rejects requests once `calls >= 50` for the current
-- UTC day. Old rows are cleaned up in cleanupAiQuota() (90d retention).
--
-- DB: zfbf-db (shared with users table).

CREATE TABLE IF NOT EXISTS ai_quota_daily (
  user_id TEXT NOT NULL,
  day     TEXT NOT NULL,                    -- YYYY-MM-DD (UTC)
  calls   INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ai_quota_day ON ai_quota_daily(day);
