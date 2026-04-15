-- Migration 011: Add profile_json column to users
-- Stores onboarding data (agency, branding, specialization) as JSON
-- Previously this data was only in browser localStorage

ALTER TABLE users ADD COLUMN profile_json TEXT DEFAULT NULL;
