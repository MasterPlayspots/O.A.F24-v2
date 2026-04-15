-- Migration 002: Enhanced Payments & Promo System

-- Payments Table (enhanced with provider details)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_id TEXT,
  package_type TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  provider TEXT,
  provider_payment_id TEXT,
  gutschein_code TEXT,
  gutschein_rabatt INTEGER DEFAULT 0,
  reports_added INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- Enhanced Gutscheine Table (supports percent + fixed discounts)
CREATE TABLE IF NOT EXISTS gutscheine (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT DEFAULT 'percent',  -- 'percent' or 'fixed'
  discount_value INTEGER NOT NULL,       -- percent (0-100) or cents
  max_uses INTEGER DEFAULT 1,
  total_uses INTEGER DEFAULT 0,
  valid_from TEXT,
  valid_until TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Promo Redemptions (track per-user usage)
CREATE TABLE IF NOT EXISTS promo_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  promo_code_id TEXT NOT NULL,
  order_id TEXT,
  discount_amount INTEGER DEFAULT 0,
  redeemed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (promo_code_id) REFERENCES gutscheine(id)
);

-- Orders Table (package-based purchases)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  final_amount INTEGER NOT NULL,
  reports_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  promo_code_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (promo_code_id) REFERENCES gutscheine(id)
);

-- Insert default promo codes (updated schema)
INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses) VALUES
  ('g1', 'BAFA20', 'percent', 20, 100),
  ('g2', 'STARTER10', 'percent', 10, 100),
  ('g3', 'VIP30', 'percent', 30, 50);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_report_id ON payments(report_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_gutscheine_code ON gutscheine(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
