-- Rollback 034: advisory only. Same pattern as 033-rollback — the phantom
-- foerdermittel_* tables in zfbf-db were never defined via a CREATE TABLE
-- migration, so DDL reconstruction would be guesswork. Real rollback is
-- restore from backup:
--   wrangler d1 execute zfbf-db --file backup-zfbf-YYYYMMDD.sql --remote
SELECT 'rollback-034: restore from wrangler d1 export backup; no automatic DDL' AS message;
