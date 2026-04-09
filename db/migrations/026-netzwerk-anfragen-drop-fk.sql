-- 026-netzwerk-anfragen-drop-fk.sql
-- Drop cross-DB FKs on netzwerk_anfragen (von_user_id → users,
-- an_berater_id → berater_profiles). users lives in zfbf-db so the
-- FK can never resolve. Same trap as 024+025. 3 seed rows preserved.
-- Target: BAFA_DB (bafa_antraege)

PRAGMA foreign_keys = OFF;

CREATE TABLE netzwerk_anfragen_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  von_user_id TEXT NOT NULL,
  an_berater_id TEXT NOT NULL,
  typ TEXT NOT NULL CHECK(typ IN ('beratung', 'zusammenarbeit', 'frage')),
  nachricht TEXT,
  status TEXT DEFAULT 'offen' CHECK(status IN ('offen', 'angenommen', 'abgelehnt')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO netzwerk_anfragen_new SELECT * FROM netzwerk_anfragen;
DROP TABLE netzwerk_anfragen;
ALTER TABLE netzwerk_anfragen_new RENAME TO netzwerk_anfragen;

CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_berater
  ON netzwerk_anfragen(an_berater_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_user
  ON netzwerk_anfragen(von_user_id, created_at DESC);

PRAGMA foreign_keys = ON;
