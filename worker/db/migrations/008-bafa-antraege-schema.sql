-- bafa_antraege D1 Database Schema
-- Run: wrangler d1 execute bafa_antraege --remote --file=./db/migrations/007-bafa-antraege-schema.sql

-- Antraege (BAFA applications) - main table
CREATE TABLE IF NOT EXISTS antraege (
  id TEXT PRIMARY KEY,
  branche_id TEXT,
  unternehmen_name TEXT NOT NULL,
  unternehmen_typ TEXT,
  unternehmen_mitarbeiter INTEGER,
  unternehmen_umsatz TEXT,
  unternehmen_hauptproblem TEXT,
  beratungsthema TEXT DEFAULT 'BAFA-Beratung',
  beratungsschwerpunkte TEXT,
  status TEXT DEFAULT 'vorschau'
    CHECK(status IN ('vorschau','bezahlt','generiert','pending','bewilligt','abgelehnt','fehlgeschlagen')),
  qualitaetsscore INTEGER DEFAULT 0,
  wortanzahl INTEGER DEFAULT 0,
  r2_key TEXT,
  bezahlt_am TEXT,
  erstellt_am TEXT DEFAULT (datetime('now')),
  aktualisiert_am TEXT DEFAULT (datetime('now'))
);

-- Antrag Bausteine (content building blocks)
CREATE TABLE IF NOT EXISTS antrag_bausteine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  antrag_id TEXT NOT NULL,
  baustein_typ TEXT NOT NULL,
  baustein_name TEXT,
  inhalt TEXT,
  inhalt_json TEXT,
  qualitaets_score REAL,
  wortanzahl INTEGER,
  version INTEGER DEFAULT 1,
  erstellt_am TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (antrag_id) REFERENCES antraege(id) ON DELETE CASCADE
);

-- Download Tokens (time-limited access to generated reports)
CREATE TABLE IF NOT EXISTS download_tokens (
  id TEXT PRIMARY KEY,
  antrag_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  gueltig_bis TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,
  erstellt_am TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (antrag_id) REFERENCES antraege(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_antraege_status ON antraege(status);
CREATE INDEX IF NOT EXISTS idx_antraege_branche ON antraege(branche_id);
CREATE INDEX IF NOT EXISTS idx_antraege_erstellt ON antraege(erstellt_am);
CREATE INDEX IF NOT EXISTS idx_bausteine_antrag ON antrag_bausteine(antrag_id);
CREATE INDEX IF NOT EXISTS idx_bausteine_typ ON antrag_bausteine(baustein_typ);
CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_antrag ON download_tokens(antrag_id);
