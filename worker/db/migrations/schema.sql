-- ZFBF D1 Database Schema (consolidated from migrations 001-006)
-- Run: wrangler d1 execute zfbf-db --file=./schema.sql

-- Users Table (PBKDF2 + legacy SHA-256 support)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT,
  hash_version INTEGER DEFAULT 1,  -- 1=SHA-256 (legacy), 2=PBKDF2
  role TEXT DEFAULT 'user',         -- 'user' or 'admin'
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  bafa_id TEXT,
  company TEXT,
  ust_id TEXT,
  steuernummer TEXT,
  is_kleinunternehmer INTEGER DEFAULT 0,
  phone TEXT,
  website TEXT,
  kontingent_total INTEGER DEFAULT 3,
  kontingent_used INTEGER DEFAULT 0,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TEXT,
  bafa_status TEXT DEFAULT 'pending',
  onboarding_completed INTEGER DEFAULT 0,
  privacy_accepted_at TEXT,
  deleted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'entwurf',

  -- Step 1: Firma & Branche
  company_name TEXT,
  company_rechtsform TEXT,
  company_gruendung TEXT,
  company_mitarbeiter TEXT,
  company_umsatz TEXT,
  company_plz TEXT,
  company_ort TEXT,
  branche TEXT,
  unterbranche TEXT,

  -- Step 2: Ausgangslage
  ausgangslage_stichpunkte TEXT,         -- JSON array
  ausgangslage_herausforderungen TEXT,   -- JSON array
  ausgangslage_text TEXT,                -- AI generated

  -- Step 3: Beratungsinhalte
  beratungsmodule TEXT,                  -- JSON array
  massnahmen TEXT,                       -- JSON array [{name, methode, ergebnis}]
  beratungsinhalte_text TEXT,            -- AI generated

  -- Step 4: Maßnahmen & Empfehlungen
  massnahmenplan TEXT,
  handlungsempfehlungen TEXT,
  umsetzungsplan TEXT,

  -- Step 5: Ergebnisse & Nachhaltigkeit
  ergebnisse_kurzfristig TEXT,
  ergebnisse_mittelfristig TEXT,
  ergebnisse_langfristig TEXT,
  nachhaltigkeit_oekonomisch TEXT,
  nachhaltigkeit_oekologisch TEXT,
  nachhaltigkeit_sozial TEXT,

  -- Step 6: QA & Export
  qa_vollstaendigkeit INTEGER DEFAULT 0,
  qa_bafa_konformitaet INTEGER DEFAULT 0,
  qa_textqualitaet INTEGER DEFAULT 0,
  qa_plausibilitaet INTEGER DEFAULT 0,
  qa_gesamt INTEGER DEFAULT 0,

  -- Meta
  is_unlocked INTEGER DEFAULT 0,
  unlock_payment_id TEXT,
  pdf_url TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payments Table
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

-- Gutscheine Table (supports percent + fixed discounts)
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

-- Promo Redemptions
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

-- Orders Table
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

-- Refresh Tokens (JWT rotation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Download Tokens (time-limited report access)
CREATE TABLE IF NOT EXISTS download_tokens (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  valid_until TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Audit Logs (GDPR-compliant, 90-day retention)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Default Gutscheine
INSERT OR IGNORE INTO gutscheine (id, code, discount_type, discount_value, max_uses) VALUES
  ('g1', 'BAFA20', 'percent', 20, 100),
  ('g2', 'STARTER10', 'percent', 10, 100),
  ('g3', 'VIP30', 'percent', 30, 50);

-- ============================================
-- Indexes
-- ============================================

-- Base indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_bafa_id ON users(bafa_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_report_id ON payments(report_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_gutscheine_code ON gutscheine(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Token indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_report ON download_tokens(report_id);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_reports_user_status ON reports(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments(provider, status);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
