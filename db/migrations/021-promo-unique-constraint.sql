-- Add unique constraint to prevent concurrent promo redemption race condition
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_redemptions_unique_user_code
  ON promo_redemptions(user_id, promo_code_id);
