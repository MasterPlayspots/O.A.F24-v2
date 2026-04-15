-- 023-vorlagen-rollback.sql
-- Target: BAFA_DB (bafa_antraege)
-- WARN: `bafa_vorlagen` holds berater-authored templates (live data).
--       Backup R2 `backups/<date>/bafa_antraege.sql` before running.

DROP INDEX IF EXISTS idx_bafa_vorlagen_user;
DROP TABLE IF EXISTS bafa_vorlagen;
