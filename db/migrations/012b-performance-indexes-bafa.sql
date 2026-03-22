-- Migration 012b: Performance indexes for bafa_antraege tables
-- Split from 012-performance-indexes.sql (bafa_antraege portion)
-- All statements use IF NOT EXISTS to be safely re-runnable

-- foerdermittel_matches: profile_id + status combo used in match listing
CREATE INDEX IF NOT EXISTS idx_fm_matches_profile_status
  ON foerdermittel_matches(profile_id, status);

-- download_tokens: antrag_id + gueltig_bis for valid-token lookups in payment verification
CREATE INDEX IF NOT EXISTS idx_download_tokens_antrag_valid
  ON download_tokens(antrag_id, gueltig_bis DESC);

-- antraege: status + aktualisiert_am for retention cleanup queries
CREATE INDEX IF NOT EXISTS idx_antraege_status_updated
  ON antraege(status, aktualisiert_am);

-- foerdermittel_cases: composite for ownership checks
CREATE INDEX IF NOT EXISTS idx_fm_cases_id_profile
  ON foerdermittel_cases(id, profile_id);

-- foerdermittel_conversations: composite for ownership checks
CREATE INDEX IF NOT EXISTS idx_fm_conv_id_profile
  ON foerdermittel_conversations(id, profile_id);
