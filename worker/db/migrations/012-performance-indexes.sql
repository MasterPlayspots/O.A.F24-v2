-- Migration 012: Performance indexes for frequently queried columns
-- Adds composite and single-column indexes identified from WHERE clause analysis
-- All statements use IF NOT EXISTS to be safely re-runnable

-- foerdermittel_matches: profile_id + status combo used in match listing
-- Query pattern: WHERE profile_id = ? AND status != 'dismissed'
CREATE INDEX IF NOT EXISTS idx_fm_matches_profile_status
  ON foerdermittel_matches(profile_id, status);

-- download_tokens: antrag_id + gueltig_bis for valid-token lookups in payment verification
-- Query pattern: WHERE antrag_id = ? AND gueltig_bis > datetime('now')
CREATE INDEX IF NOT EXISTS idx_download_tokens_antrag_valid
  ON download_tokens(antrag_id, gueltig_bis DESC);

-- payments: provider + provider_payment_id for webhook verification lookups
-- Query pattern: WHERE provider_payment_id = ? AND provider = 'stripe'
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment
  ON payments(provider, provider_payment_id);

-- users: verification_token for email verification flow
-- Query pattern: WHERE verification_token = ?
CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token) WHERE verification_token IS NOT NULL;

-- users: reset_token for password reset flow
-- Query pattern: WHERE reset_token = ? AND reset_token_expires > datetime('now')
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(reset_token) WHERE reset_token IS NOT NULL;

-- antraege: status + aktualisiert_am for retention cleanup queries
-- Query pattern: WHERE status = 'vorschau' AND aktualisiert_am < datetime('now', '-90 days')
CREATE INDEX IF NOT EXISTS idx_antraege_status_updated
  ON antraege(status, aktualisiert_am);

-- foerdermittel_cases: composite for ownership checks
-- Query pattern: WHERE id = ? AND profile_id = ?
CREATE INDEX IF NOT EXISTS idx_fm_cases_id_profile
  ON foerdermittel_cases(id, profile_id);

-- foerdermittel_conversations: composite for ownership checks
-- Query pattern: WHERE id = ? AND profile_id = ?
CREATE INDEX IF NOT EXISTS idx_fm_conv_id_profile
  ON foerdermittel_conversations(id, profile_id);

-- refresh_tokens: user_id + revoked for bulk revocation queries
-- Query pattern: WHERE user_id = ? AND revoked = 0
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens(user_id, revoked);

-- audit_logs: event_type + created_at for filtered log queries with date ranges
-- Query pattern: WHERE event_type = ? AND created_at > ?
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
  ON audit_logs(event_type, created_at DESC);
