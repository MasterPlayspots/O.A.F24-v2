-- Rollback 035: This is a commented-out prep migration; nothing to roll back.
-- If any lines were uncommented and applied, restore from backup:
--   wrangler d1 execute [DB] --file backup-YYYYMMDD.sql --remote
SELECT 'rollback-035: no-op — all statements were commented out by default' AS message;
