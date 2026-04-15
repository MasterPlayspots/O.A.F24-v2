-- 017-netzwerk-rollback.sql
-- Target: BAFA_DB (bafa_antraege)
-- WARN: `netzwerk_anfragen` carries live production data. Take a backup
--       from R2 `backups/<date>/bafa_antraege.sql` before running this.

DROP INDEX IF EXISTS idx_anfragen_an;
DROP INDEX IF EXISTS idx_berater_user;
DROP TABLE IF EXISTS netzwerk_anfragen;
DROP TABLE IF EXISTS berater_profile;
