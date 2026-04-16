-- Rollback 032: remove the prep column + index.
DROP INDEX IF EXISTS idx_audit_logs_source_created;
ALTER TABLE audit_logs DROP COLUMN source;
