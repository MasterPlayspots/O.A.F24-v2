-- 024-berater-profiles-drop-fk.sql
-- Drop FOREIGN KEY (user_id REFERENCES users) on berater_profiles.
-- Auth users live in zfbf-db; berater_profiles is in bafa_antraege.
-- Cross-DB FKs are not enforceable in SQLite, and the local users
-- table in bafa_antraege is empty, so the constraint always fires.
-- berater_profiles currently has 0 rows, so the rebuild is lossless.
-- Target: BAFA_DB (bafa_antraege)

PRAGMA foreign_keys = OFF;

CREATE TABLE berater_profiles_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  branchen TEXT DEFAULT '[]',
  spezialisierungen TEXT DEFAULT '[]',
  region TEXT,
  plz TEXT,
  telefon TEXT,
  website TEXT,
  verfuegbar BOOLEAN DEFAULT TRUE,
  rating_avg REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  profil_views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id)
);

INSERT INTO berater_profiles_new SELECT * FROM berater_profiles;
DROP TABLE berater_profiles;
ALTER TABLE berater_profiles_new RENAME TO berater_profiles;

PRAGMA foreign_keys = ON;
