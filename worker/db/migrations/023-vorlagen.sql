-- 023-vorlagen.sql — Berater Template-Library
-- Target: BAFA_DB (bafa_antraege)

CREATE TABLE IF NOT EXISTS bafa_vorlagen (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  titel       TEXT NOT NULL,
  kategorie   TEXT,
  inhalt      TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bafa_vorlagen_user
  ON bafa_vorlagen(user_id, created_at DESC);
