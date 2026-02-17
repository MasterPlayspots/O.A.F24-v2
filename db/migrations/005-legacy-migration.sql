-- Migration 005: Legacy Data Migration
-- Run AFTER migrations 001-004 to upgrade existing data

-- Add new columns to existing users table if they don't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so use try/ignore pattern

-- Add salt column for PBKDF2
ALTER TABLE users ADD COLUMN salt TEXT;

-- Add hash_version: 1=SHA-256 (legacy), 2=PBKDF2
ALTER TABLE users ADD COLUMN hash_version INTEGER DEFAULT 1;

-- Add role column
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';

-- Migrate gutscheine from old schema (rabatt_prozent → discount_type/discount_value)
-- Only needed if upgrading from old schema with rabatt_prozent column
-- ALTER TABLE gutscheine ADD COLUMN discount_type TEXT DEFAULT 'percent';
-- ALTER TABLE gutscheine ADD COLUMN discount_value INTEGER;
-- ALTER TABLE gutscheine ADD COLUMN total_uses INTEGER DEFAULT 0;
-- ALTER TABLE gutscheine ADD COLUMN valid_from TEXT;
-- ALTER TABLE gutscheine ADD COLUMN created_by TEXT;
-- UPDATE gutscheine SET discount_value = rabatt_prozent, total_uses = current_uses WHERE discount_value IS NULL;

-- Ensure all existing users have hash_version = 1 (SHA-256 legacy)
UPDATE users SET hash_version = 1 WHERE hash_version IS NULL;

-- Ensure all existing users have role = 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;
