-- 016-forum-rollback.sql
-- Target: BAFA_DB (bafa_antraege)
-- Note: the forum endpoints were dropped in Phase C (commit 18e4a54).
-- This rollback is safe to run because nothing reads these tables anymore.

DROP INDEX IF EXISTS idx_posts_thread;
DROP INDEX IF EXISTS idx_threads_created;
DROP INDEX IF EXISTS idx_threads_kategorie;
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS forum_threads;
