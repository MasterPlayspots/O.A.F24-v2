-- Rollback 028: drop ai_quota_daily.
DROP INDEX IF EXISTS idx_ai_quota_day;
DROP TABLE IF EXISTS ai_quota_daily;
