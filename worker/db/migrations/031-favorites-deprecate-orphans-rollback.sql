-- Rollback 031: restore orphan favorite tables to their original names.
ALTER TABLE _deprecated_foerdermittel_favoriten RENAME TO foerdermittel_favoriten;
ALTER TABLE _deprecated_me_favoriten RENAME TO me_favoriten;
