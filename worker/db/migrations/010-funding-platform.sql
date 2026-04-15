-- ============================================
-- Funding Platform Schema (in bafa_antraege D1)
-- ============================================

-- Business profiles for matchmaking
CREATE TABLE IF NOT EXISTS foerdermittel_profile (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  branche TEXT,
  standort TEXT,
  rechtsform TEXT,
  mitarbeiter_anzahl INTEGER,
  jahresumsatz REAL,
  gruendungsjahr INTEGER,
  beschreibung TEXT,
  dokumente_analysiert TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fm_profile_user ON foerdermittel_profile(user_id);

-- Matchmaking results
CREATE TABLE IF NOT EXISTS foerdermittel_matches (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  programm_id INTEGER NOT NULL,
  match_score INTEGER DEFAULT 0,
  match_reasons TEXT,
  disqualifiers TEXT,
  status TEXT DEFAULT 'matched' CHECK(status IN ('matched','dismissed','started','completed')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES foerdermittel_profile(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fm_matches_profile ON foerdermittel_matches(profile_id);
CREATE INDEX IF NOT EXISTS idx_fm_matches_score ON foerdermittel_matches(match_score DESC);

-- Workflow engine: cases
CREATE TABLE IF NOT EXISTS foerdermittel_cases (
  id TEXT PRIMARY KEY,
  match_id TEXT,
  profile_id TEXT NOT NULL,
  programm_id INTEGER NOT NULL,
  berater_id TEXT,
  phase TEXT DEFAULT 'eligibility_check' CHECK(phase IN (
    'eligibility_check','document_collection','application_draft','review','submission','follow_up'
  )),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed','rejected')),
  phase_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES foerdermittel_profile(id) ON DELETE CASCADE,
  FOREIGN KEY (match_id) REFERENCES foerdermittel_matches(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fm_cases_profile ON foerdermittel_cases(profile_id);
CREATE INDEX IF NOT EXISTS idx_fm_cases_berater ON foerdermittel_cases(berater_id);
CREATE INDEX IF NOT EXISTS idx_fm_cases_status ON foerdermittel_cases(status);

-- Granular steps within each phase
CREATE TABLE IF NOT EXISTS foerdermittel_case_steps (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  step_type TEXT NOT NULL CHECK(step_type IN (
    'document_upload','form_fill','ai_review','consultant_action','approval'
  )),
  required INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','skipped')),
  result_data TEXT,
  completed_at TEXT,
  FOREIGN KEY (case_id) REFERENCES foerdermittel_cases(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fm_steps_case ON foerdermittel_case_steps(case_id);

-- AI-generated funnel blueprints per program
CREATE TABLE IF NOT EXISTS foerdermittel_funnel_templates (
  id TEXT PRIMARY KEY,
  programm_id INTEGER NOT NULL UNIQUE,
  phases TEXT NOT NULL,
  generated_by TEXT,
  reviewed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fm_funnels_programm ON foerdermittel_funnel_templates(programm_id);

-- Per-case document tracking
CREATE TABLE IF NOT EXISTS foerdermittel_dokumente (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  step_id TEXT,
  dokument_typ TEXT NOT NULL,
  dateiname TEXT NOT NULL,
  dateityp TEXT NOT NULL,
  dateigroesse INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded' CHECK(status IN ('uploaded','ai_analysiert','geprueft','abgelehnt')),
  ai_extraktion TEXT,
  uploaded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES foerdermittel_cases(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES foerdermittel_case_steps(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_fm_docs_case ON foerdermittel_dokumente(case_id);

-- AI agent conversation history
CREATE TABLE IF NOT EXISTS foerdermittel_conversations (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  profile_id TEXT NOT NULL,
  context TEXT NOT NULL CHECK(context IN ('matchmaking','funnel_guidance','document_help')),
  messages TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (case_id) REFERENCES foerdermittel_cases(id) ON DELETE SET NULL,
  FOREIGN KEY (profile_id) REFERENCES foerdermittel_profile(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fm_conv_case ON foerdermittel_conversations(case_id);
CREATE INDEX IF NOT EXISTS idx_fm_conv_profile ON foerdermittel_conversations(profile_id);

-- Notifications
CREATE TABLE IF NOT EXISTS foerdermittel_benachrichtigungen (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  case_id TEXT,
  typ TEXT NOT NULL,
  titel TEXT NOT NULL,
  nachricht TEXT,
  gelesen INTEGER DEFAULT 0,
  email_gesendet INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fm_notif_user ON foerdermittel_benachrichtigungen(user_id);
CREATE INDEX IF NOT EXISTS idx_fm_notif_unread ON foerdermittel_benachrichtigungen(user_id, gelesen);
