// Promo Code Validation Service - Validates and applies promo discounts

interface PromoResult {
  valid: boolean
  discountedAmount: number
  discountAmount: number
  promoCodeId: string | null
}

export async function validateAndApplyPromo(
  db: D1Database,
  code: string,
  originalAmount: number
): Promise<PromoResult> {
  const g = await db.prepare(
    "SELECT * FROM gutscheine WHERE code = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > datetime('now'))"
  ).bind(code.toUpperCase()).first() as any

  if (!g || g.total_uses >= g.max_uses) {
    return { valid: false, discountedAmount: originalAmount, discountAmount: 0, promoCodeId: null }
  }

  const discountAmount = g.discount_type === 'percent'
    ? Math.round(originalAmount * g.discount_value / 100)
    : Math.min(g.discount_value, originalAmount)

  return {
    valid: true,
    discountedAmount: Math.max(0, originalAmount - discountAmount),
    discountAmount,
    promoCodeId: g.id,
  }
}
