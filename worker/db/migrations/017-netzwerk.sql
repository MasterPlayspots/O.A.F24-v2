-- Netzwerk & Berater features
CREATE TABLE IF NOT EXISTS berater_profile (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  spezialisierung TEXT,
  regionen TEXT,
  bio TEXT,
  erfahrung_jahre INTEGER DEFAULT 0,
  erfolgsquote REAL DEFAULT 0,
  bewertung REAL DEFAULT 0,
  anzahl_bewertungen INTEGER DEFAULT 0,
  verfuegbar INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS netzwerk_anfragen (
  id TEXT PRIMARY KEY,
  von_user_id TEXT NOT NULL,
  an_user_id TEXT NOT NULL,
  nachricht TEXT,
  status TEXT DEFAULT 'offen',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_berater_user ON berater_profile(user_id);
CREATE INDEX idx_anfragen_an ON netzwerk_anfragen(an_user_id, status);
