-- Rollback 029: drop deleted_at index + column.
-- Note: D1 supports `ALTER TABLE … DROP COLUMN` since the SQLite 3.35 backing;
-- if your instance is older, leave the column in place and drop only the index.
DROP INDEX IF EXISTS idx_news_articles_deleted_at;
ALTER TABLE news_articles DROP COLUMN deleted_at;
