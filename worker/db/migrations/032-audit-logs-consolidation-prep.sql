-- 032: Audit logs consolidation — PREPARATION only (no data movement yet).
--
-- Phase-4 audit (H-P4-03) flagged that we have TWO `audit_logs` tables:
--   * zfbf-db.audit_logs       ← auth + payment events (writeAuditLog in
--                                services/audit.ts, workerside repo layer)
--   * bafa_antraege.audit_logs ← admin CRUD events (writeAuditLog called
--                                from admin.ts handlers)
-- Compliance requires a single forensic log. Actual consolidation needs:
--   (1) pick canonical DB (zfbf-db is the authentication source of truth,
--       so it stays as canonical),
--   (2) backfill rows from bafa_antraege.audit_logs into zfbf-db.audit_logs,
--   (3) switch all writers in code to target zfbf-db,
--   (4) drop the secondary table.
--
-- THIS migration does NOT execute steps 2-4. It only adds a composite
-- index that makes the eventual backfill fast, and a `source` column so
-- post-merge queries can distinguish the two legacy streams.
--
-- DB: zfbf-db.

-- Columns may already exist on re-run; guard with a no-op.
ALTER TABLE audit_logs ADD COLUMN source TEXT DEFAULT 'zfbf';

CREATE INDEX IF NOT EXISTS idx_audit_logs_source_created
  ON audit_logs(source, created_at);

-- Same index on the legacy table so the upcoming backfill SELECT is fast.
-- (This one runs in bafa_antraege; split into a separate migration if your
-- D1 tooling can't target two DBs in one file — here it's documentation.)
