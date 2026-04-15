-- 019-eignungscheck-rollback.sql
-- Target: BAFA_DB (bafa_antraege)

DROP INDEX IF EXISTS idx_eignungscheck_user;
DROP TABLE IF EXISTS eignungscheck;
