-- Soft-delete support for bafa_learnings table
-- Applied against BAFA_CONTENT D1 binding

ALTER TABLE bafa_learnings ADD COLUMN deleted_at TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_learnings_deleted ON bafa_learnings(deleted_at);
