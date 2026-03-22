-- Migration 012a: Performance indexes for zfbf-db tables
-- Split from 012-performance-indexes.sql (zfbf-db portion)
-- All statements use IF NOT EXISTS to be safely re-runnable

-- payments: provider + provider_payment_id for webhook verification lookups
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment
  ON payments(provider, provider_payment_id);

-- users: verification_token for email verification flow
CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(verification_token) WHERE verification_token IS NOT NULL;

-- users: reset_token for password reset flow
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(reset_token) WHERE reset_token IS NOT NULL;

-- refresh_tokens: user_id + revoked for bulk revocation queries
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active
  ON refresh_tokens(user_id, revoked);

-- audit_logs: event_type + created_at for filtered log queries with date ranges
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_created
  ON audit_logs(event_type, created_at DESC);
