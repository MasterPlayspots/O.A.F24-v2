-- 031: Mark orphan favorite tables as deprecated.
-- Phase-4 audit found three favorite tables across two DBs:
--   * foerderprogramme.favorites        ← CANONICAL (repositories/favorites.repository.ts)
--   * bafa_antraege.foerdermittel_favoriten   ← orphan, no writer
--   * bafa_antraege.me_favoriten              ← orphan, no writer
--
-- This migration renames both orphans to `_deprecated_*` so:
--   (a) any residual reads throw a clear "no such table" error,
--   (b) we keep the data for 1-2 releases in case we discover a forgotten
--       reader, and
--   (c) a future cleanup migration can DROP them confidently.
--
-- DB: bafa_antraege. Rollback restores the old names.

ALTER TABLE foerdermittel_favoriten RENAME TO _deprecated_foerdermittel_favoriten;
ALTER TABLE me_favoriten RENAME TO _deprecated_me_favoriten;
