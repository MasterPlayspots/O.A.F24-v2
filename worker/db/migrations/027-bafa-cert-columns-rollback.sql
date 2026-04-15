-- Rollback for 027-bafa-cert-columns.sql
-- Target: DB (zfbf-db)

DROP INDEX IF EXISTS idx_users_bafa_cert_status;
ALTER TABLE users DROP COLUMN bafa_berater_nr;
ALTER TABLE users DROP COLUMN bafa_cert_uploaded_at;
ALTER TABLE users DROP COLUMN bafa_cert_status;
