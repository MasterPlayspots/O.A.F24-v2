CREATE TABLE IF NOT EXISTS eignungscheck (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  antworten TEXT NOT NULL,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  score_c INTEGER DEFAULT 0,
  ergebnis TEXT NOT NULL,
  blocker TEXT,
  fehlende_dokumente TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_eignungscheck_user ON eignungscheck(user_id);
