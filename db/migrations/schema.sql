-- ZFBF D1 Database Schema
-- Run: wrangler d1 execute zfbf-db --file=./schema.sql

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
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
  ausgangslage_stichpunkte TEXT, -- JSON array
  ausgangslage_herausforderungen TEXT, -- JSON array (selected from template)
  ausgangslage_text TEXT, -- AI generated
  
  -- Step 3: Beratungsinhalte
  beratungsmodule TEXT, -- JSON array (selected modules)
  massnahmen TEXT, -- JSON array [{name, methode, ergebnis}]
  beratungsinhalte_text TEXT, -- AI generated
  
  -- Step 4: Massnahmen & Empfehlungen
  massnahmenplan TEXT, -- JSON array
  handlungsempfehlungen TEXT, -- JSON array [{titel, prioritaet, zeithorizont, aufwand}]
  umsetzungsplan TEXT, -- JSON array
  
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
  package_type TEXT, -- 'einzel', 'starter', 'standard', 'pro'
  amount INTEGER, -- in cents
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  provider TEXT, -- 'stripe', 'paypal', 'invoice'
  provider_payment_id TEXT,
  gutschein_code TEXT,
  gutschein_rabatt INTEGER DEFAULT 0,
  reports_added INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Gutscheine Table
CREATE TABLE IF NOT EXISTS gutscheine (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  rabatt_prozent INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_until TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default Gutscheine
INSERT OR IGNORE INTO gutscheine (id, code, rabatt_prozent, max_uses) VALUES
  ('g1', 'BAFA20', 20, 100),
  ('g2', 'STARTER10', 10, 100),
  ('g3', 'VIP30', 30, 50);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_bafa_id ON users(bafa_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_gutscheine_code ON gutscheine(code);
