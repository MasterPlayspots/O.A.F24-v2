-- 029: Soft-delete for news_articles.
-- Replaces DELETE with UPDATE…SET deleted_at — preserves audit trail and
-- allows undo. All public/list queries must now filter `deleted_at IS NULL`.
--
-- DB: bafa_antraege.

ALTER TABLE news_articles ADD COLUMN deleted_at TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_news_articles_deleted_at ON news_articles(deleted_at);
