-- 025-unternehmen-drop-fk.sql
-- Drop FOREIGN KEY (user_id REFERENCES users(id)) on unternehmen.
-- Auth users live in zfbf-db; unternehmen sits in bafa_antraege.
-- bafa_antraege.users is a separate, empty table — every insert
-- would fire SQLITE_CONSTRAINT_FOREIGNKEY. Same pattern as 024.
-- 0 rows currently → lossless rebuild.
-- Target: BAFA_DB (bafa_antraege)

PRAGMA foreign_keys = OFF;

CREATE TABLE unternehmen_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  firmenname TEXT NOT NULL,
  rechtsform TEXT,
  handelsregister_nr TEXT,
  steuernummer TEXT,
  ust_id TEXT,
  strasse TEXT,
  plz TEXT,
  ort TEXT,
  bundesland TEXT,
  land TEXT DEFAULT 'Deutschland',
  branche TEXT,
  branche_code TEXT,
  unterbranche TEXT,
  gruendungsjahr INTEGER,
  mitarbeiter_anzahl INTEGER,
  jahresumsatz REAL,
  bilanzsumme REAL,
  eigenkapitalquote REAL,
  ist_kmu INTEGER DEFAULT 1,
  kmu_klasse TEXT,
  de_minimis_summe_3j REAL DEFAULT 0,
  insolvenzverfahren INTEGER DEFAULT 0,
  unternehmen_in_schwierigkeiten INTEGER DEFAULT 0,
  ocr_daten TEXT DEFAULT '{}',
  ocr_confidence REAL,
  ocr_quellen TEXT DEFAULT '[]',
  profil_vollstaendigkeit INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  brand TEXT DEFAULT 'fund24',
  deleted_at TEXT,
  owner_user_id TEXT,
  UNIQUE(user_id)
);

INSERT INTO unternehmen_new SELECT * FROM unternehmen;
DROP TABLE unternehmen;
ALTER TABLE unternehmen_new RENAME TO unternehmen;

PRAGMA foreign_keys = ON;
