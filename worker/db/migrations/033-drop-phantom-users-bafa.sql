-- 033: Drop phantom `users` table from bafa_antraege.
--
-- Phase-4 audit (C-P4-01) detected a 40-col `users` table in bafa_antraege
-- alongside the canonical 32-col `users` in zfbf-db. Grep across
-- worker/src/**/*.ts confirms:
--   * every `requireAuth`, auth route, admin CRUD, me endpoint queries
--     `c.env.DB.prepare("… users …")` (zfbf-db).
--   * no code path ever touches `c.env.BAFA_DB.prepare("… users …")`.
-- Therefore the bafa_antraege.users rows are orphan data with no live
-- reader or writer. Drop them after backup so a future audit can stop
-- flagging the collision and future contributors can't accidentally
-- re-introduce cross-DB user lookups.
--
-- ⚠ DESTRUCTIVE. Run `wrangler d1 export bafa_antraege --output backup-XXX.sql`
--   before applying. Rollback script is advisory only — the real rollback
--   is restore-from-backup.
--
-- DB target: bafa_antraege.

DROP TABLE IF EXISTS users;
