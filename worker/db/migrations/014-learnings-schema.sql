-- bafa_learnings table for reverse learning cycle (E-4)
-- Applied against BAFA_CONTENT D1 binding (bafa_learnings database)

CREATE TABLE IF NOT EXISTS bafa_learnings (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('approved', 'rejected')),
  feedback TEXT,
  branche TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_learnings_report ON bafa_learnings(report_id);
CREATE INDEX IF NOT EXISTS idx_learnings_branche ON bafa_learnings(branche);
CREATE INDEX IF NOT EXISTS idx_learnings_outcome ON bafa_learnings(outcome);
CREATE INDEX IF NOT EXISTS idx_learnings_created ON bafa_learnings(created_at);
CREATE INDEX IF NOT EXISTS idx_learnings_deleted ON bafa_learnings(deleted_at);
