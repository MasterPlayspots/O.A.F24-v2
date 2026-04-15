-- 018-nachrichten-rollback.sql
-- Target: BAFA_DB (bafa_antraege)
-- WARN: `messages` carries live user-to-user chat history.
--       Backup R2 `backups/<date>/bafa_antraege.sql` before running.

DROP INDEX IF EXISTS idx_participants_user;
DROP INDEX IF EXISTS idx_messages_conv;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
