-- Add email verification code columns for 2FA registration flow
ALTER TABLE users ADD COLUMN email_verification_code TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires TEXT;
