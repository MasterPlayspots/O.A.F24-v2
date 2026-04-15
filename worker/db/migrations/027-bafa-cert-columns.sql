-- 027-bafa-cert-columns.sql
-- Add BAFA-Zertifikat tracking to users (zfbf-db / DB).
-- Audit-Ref: docs/analysis/gap_analysis.md#GAP-001
-- Target: DB (zfbf-db)

ALTER TABLE users ADD COLUMN bafa_cert_status TEXT DEFAULT 'none';
ALTER TABLE users ADD COLUMN bafa_cert_uploaded_at TEXT;
ALTER TABLE users ADD COLUMN bafa_berater_nr TEXT;

-- Partial index: only rows that are actually in the admin queue or approved.
CREATE INDEX IF NOT EXISTS idx_users_bafa_cert_status
  ON users(bafa_cert_status)
  WHERE bafa_cert_status IN ('pending', 'approved');
