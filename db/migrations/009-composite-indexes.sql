-- Migration 009: Composite Indexes for Query Performance
-- Adds composite indexes for frequently-used query patterns

-- Reports listing: WHERE user_id = ? ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_reports_user_updated ON reports(user_id, updated_at DESC);

-- Refresh token lookup: WHERE token_hash = ? AND revoked = 0 AND expires_at > datetime('now')
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active ON refresh_tokens(token_hash, revoked, expires_at);

-- Download token lookup with validity: WHERE token = ? AND valid_until > datetime('now')
CREATE INDEX IF NOT EXISTS idx_download_tokens_valid ON download_tokens(token, valid_until);

-- Gutscheine code lookup: WHERE code = ? AND is_active = 1
CREATE INDEX IF NOT EXISTS idx_gutscheine_code_active ON gutscheine(code, is_active);

-- Promo redemptions per user: WHERE user_id = ? AND promo_code_id = ?
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user_code ON promo_redemptions(user_id, promo_code_id);

-- Audit log lookup by user: WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
