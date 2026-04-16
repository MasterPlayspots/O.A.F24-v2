-- 030: Hot-path indexes.
-- Phase-4 audit (C-P4-01, H-P4-05) found several 0-index tables on hot
-- dashboard queries. Each index here covers a known WHERE/JOIN pattern
-- in worker/src/routes/*.ts or worker/src/repositories/*.
--
-- DB: bafa_antraege. Safe to re-run (CREATE INDEX IF NOT EXISTS).

-- ── unternehmen (34 cols, 0 idx) ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_unternehmen_user_id ON unternehmen(user_id);
CREATE INDEX IF NOT EXISTS idx_unternehmen_branche ON unternehmen(branche);

-- ── berater_profiles (17 cols, 0 idx) ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_berater_profiles_user_id ON berater_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_berater_profiles_verfuegbar ON berater_profiles(verfuegbar);
CREATE INDEX IF NOT EXISTS idx_berater_profiles_bafa_cert_status
  ON berater_profiles(bafa_cert_status);

-- ── antraege_v2 ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_antraege_v2_user_id_status
  ON antraege_v2(user_id, status);
CREATE INDEX IF NOT EXISTS idx_antraege_v2_created_at ON antraege_v2(created_at);

-- ── antrag_dokumente_v2 ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_antrag_dokumente_v2_antrag_id
  ON antrag_dokumente_v2(antrag_id);

-- ── netzwerk_anfragen + kontakt + nachrichten ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_an_user_status
  ON netzwerk_anfragen(an_user_id, status);
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_von_user
  ON netzwerk_anfragen(von_user_id);
CREATE INDEX IF NOT EXISTS idx_netzwerk_nachrichten_anfrage_id
  ON netzwerk_nachrichten(anfrage_id);

-- ── tracker ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tracker_vorgaenge_user_id_phase
  ON tracker_vorgaenge(user_id, phase);

-- ── berater expertise + dienstleistungen ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_berater_foerder_expertise_berater_id
  ON berater_foerder_expertise(berater_id);
CREATE INDEX IF NOT EXISTS idx_berater_dienstleistungen_berater_id
  ON berater_dienstleistungen(berater_id);

-- ── provisionen (zwei hot paths) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_provisionen_status
  ON provisionen(status);
CREATE INDEX IF NOT EXISTS idx_provisionen_berater_profile_id
  ON provisionen(berater_profile_id);

-- ── users (dashboard onboarding + email verification hot paths) ───────
-- zfbf-db already has idx on email + deleted_at; bafa_antraege.users is
-- the one reading email_verified=0 scans.
CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users(email_verified);
