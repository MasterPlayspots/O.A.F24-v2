-- Migration 001: Base Schema with Security Enhancements
-- Adds: hash_version, salt, role columns to users; enhanced gutscheine

-- Users Table (enhanced with PBKDF2 support)
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'entwurf',
  company_name TEXT,
  company_rechtsform TEXT,
  company_gruendung TEXT,
  company_mitarbeiter TEXT,
  company_umsatz TEXT,
  company_plz TEXT,
  company_ort TEXT,
  branche TEXT,
  unterbranche TEXT,
  ausgangslage_stichpunkte TEXT,
  ausgangslage_herausforderungen TEXT,
  ausgangslage_text TEXT,
  beratungsmodule TEXT,
  massnahmen TEXT,
  beratungsinhalte_text TEXT,
  massnahmenplan TEXT,
  handlungsempfehlungen TEXT,
  umsetzungsplan TEXT,
  ergebnisse_kurzfristig TEXT,
  ergebnisse_mittelfristig TEXT,
  ergebnisse_langfristig TEXT,
  nachhaltigkeit_oekonomisch TEXT,
  nachhaltigkeit_oekologisch TEXT,
  nachhaltigkeit_sozial TEXT,
  qa_vollstaendigkeit INTEGER DEFAULT 0,
  qa_bafa_konformitaet INTEGER DEFAULT 0,
  qa_textqualitaet INTEGER DEFAULT 0,
  qa_plausibilitaet INTEGER DEFAULT 0,
  qa_gesamt INTEGER DEFAULT 0,
  is_unlocked INTEGER DEFAULT 0,
  unlock_payment_id TEXT,
  pdf_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for base tables
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_bafa_id ON users(bafa_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
