-- 035: Drop dead tables — PREPARATION.
--
-- ⚠ UNCOMMENT EACH LINE ONLY AFTER 48 h ERROR-FREE OPERATION POST-NACHT-4.
-- These tables were confirmed dead in Phase-5 gap analysis (G-P5-05..G-P5-08):
-- no reader, no writer, no frontend caller. The data exists only because
-- migrations created the tables but the features were never wired to UI.
--
-- DB: Varies (noted per table). Run against the correct DB.

-- ── foerdermittel-checks (CHECK_DB) ──────────────────────────
-- DROP TABLE IF EXISTS call_log;
-- DROP TABLE IF EXISTS caller_sessions;
-- DROP TABLE IF EXISTS password_reset_tokens;

-- ── bafa_antraege (BAFA_DB) ─────────────────────────────────
-- DROP TABLE IF EXISTS rechtsrahmen;
-- DROP TABLE IF EXISTS kombinationsregeln;
-- DROP TABLE IF EXISTS foerder_kombinationen;
-- DROP TABLE IF EXISTS bafa_custom_templates;
-- DROP TABLE IF EXISTS bafa_phasen;
-- DROP TABLE IF EXISTS bafa_vorlagen;
-- DROP TABLE IF EXISTS forum_antworten;
-- DROP TABLE IF EXISTS forum_threads;
-- DROP TABLE IF EXISTS forum_upvotes;

-- ── zfbf-db (DB) ────────────────────────────────────────────
-- DROP TABLE IF EXISTS forum_posts;
-- DROP TABLE IF EXISTS forum_threads;

-- ── foerderprogramme (FOERDER_DB) ───────────────────────────
-- DROP TABLE IF EXISTS businessplaene;
-- DROP TABLE IF EXISTS foerderkonzepte;
-- DROP TABLE IF EXISTS foerderplaene;
