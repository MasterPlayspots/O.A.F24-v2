-- 015-favorites-rollback.sql
-- Target: FOERDER_DB (foerderprogramme)

DROP INDEX IF EXISTS idx_favorites_program;
DROP INDEX IF EXISTS idx_favorites_user;
DROP TABLE IF EXISTS favorites;
