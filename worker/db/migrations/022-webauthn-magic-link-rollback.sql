-- 022-webauthn-magic-link-rollback.sql
-- Target: DB (zfbf-db)
-- Note: /api/auth/webauthn/* and /api/auth/magic-link/* endpoints were
-- removed in Phase C (commit 18e4a54). Nothing reads these tables anymore.

DROP INDEX IF EXISTS idx_magic_link_email;
DROP INDEX IF EXISTS idx_passkey_credential;
DROP INDEX IF EXISTS idx_passkey_user;
DROP TABLE IF EXISTS magic_link_tokens;
DROP TABLE IF EXISTS passkey_credentials;
