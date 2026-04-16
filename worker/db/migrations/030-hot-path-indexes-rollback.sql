-- Rollback 030: drop hot-path indexes.
DROP INDEX IF EXISTS idx_unternehmen_user_id;
DROP INDEX IF EXISTS idx_unternehmen_branche;
DROP INDEX IF EXISTS idx_berater_profiles_user_id;
DROP INDEX IF EXISTS idx_berater_profiles_verfuegbar;
DROP INDEX IF EXISTS idx_berater_profiles_bafa_cert_status;
DROP INDEX IF EXISTS idx_antraege_v2_user_id_status;
DROP INDEX IF EXISTS idx_antraege_v2_created_at;
DROP INDEX IF EXISTS idx_antrag_dokumente_v2_antrag_id;
DROP INDEX IF EXISTS idx_netzwerk_anfragen_an_user_status;
DROP INDEX IF EXISTS idx_netzwerk_anfragen_von_user;
DROP INDEX IF EXISTS idx_netzwerk_nachrichten_anfrage_id;
DROP INDEX IF EXISTS idx_tracker_vorgaenge_user_id_phase;
DROP INDEX IF EXISTS idx_berater_foerder_expertise_berater_id;
DROP INDEX IF EXISTS idx_berater_dienstleistungen_berater_id;
DROP INDEX IF EXISTS idx_provisionen_status;
DROP INDEX IF EXISTS idx_provisionen_berater_profile_id;
DROP INDEX IF EXISTS idx_users_email_verified;
