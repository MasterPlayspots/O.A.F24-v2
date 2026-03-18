-- Migration 006: GDPR Compliance + Compound Indexes
-- Adds: privacy_accepted_at, deleted_at columns; compound indexes for query optimization

-- GDPR columns
ALTER TABLE users ADD COLUMN privacy_accepted_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments(provider, status);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
