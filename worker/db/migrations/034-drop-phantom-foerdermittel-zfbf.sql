-- 034: Drop 8 phantom foerdermittel_* tables from zfbf-db.
--
-- Phase-4 audit (M-P4-01) detected identical foerdermittel_* table names
-- in BOTH databases. Grep across worker/src confirmed:
--   * all /api/foerdermittel/**, /api/antraege, /api/check handlers use
--     `c.env.BAFA_DB.prepare("… foerdermittel_* …")`.
--   * no code path uses `c.env.DB.prepare("… foerdermittel_* …")`.
-- So the zfbf-db copies are orphan duplicates. Same rationale as 033:
-- drop after backup.
--
-- ⚠ DESTRUCTIVE. `wrangler d1 export zfbf-db` first. Rollback = restore.
--
-- DB target: zfbf-db.

DROP TABLE IF EXISTS foerdermittel_profile;
DROP TABLE IF EXISTS foerdermittel_cases;
DROP TABLE IF EXISTS foerdermittel_case_steps;
DROP TABLE IF EXISTS foerdermittel_matches;
DROP TABLE IF EXISTS foerdermittel_dokumente;
DROP TABLE IF EXISTS foerdermittel_funnel_templates;
DROP TABLE IF EXISTS foerdermittel_conversations;
DROP TABLE IF EXISTS foerdermittel_benachrichtigungen;
