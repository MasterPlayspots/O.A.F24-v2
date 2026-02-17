// Order Routes - Create order with promo discount
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, Variables } from '../types'
import { PACKAGES } from '../types'
import { requireAuth } from '../middleware/auth'

const orders = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const schema = z.object({
  packageType: z.enum(['einzel', 'starter', 'standard', 'pro']),
  promoCode: z.string().optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'invoice']),
})

orders.post('/create', requireAuth, async (c) => {
  const parsed = schema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: any) => e.message) }, 400)

  const { packageType, promoCode, paymentMethod } = parsed.data
  const user = c.get('user'); const db = c.env.DB; const pkg = PACKAGES[packageType]

  let amount = pkg.price, discountAmount = 0, promoCodeId: string | null = null

  if (promoCode) {
    const g = await db.prepare("SELECT * FROM gutscheine WHERE code = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > datetime('now'))").bind(promoCode.toUpperCase()).first() as any
    if (g && g.total_uses < g.max_uses) {
      promoCodeId = g.id
      discountAmount = g.discount_type === 'percent' ? Math.round(amount * g.discount_value / 100) : Math.min(g.discount_value, amount)
      amount = Math.max(0, amount - discountAmount)
    }
  }

  const orderId = crypto.randomUUID()
  await db.prepare("INSERT INTO orders (id, user_id, amount, discount_amount, final_amount, reports_count, status, promo_code_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)")
    .bind(orderId, user.id, pkg.price, discountAmount, amount, pkg.reports, promoCodeId).run()

  // Free or invoice: complete immediately
  if (amount === 0 || paymentMethod === 'invoice') {
    await db.batch([
      db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").bind(orderId),
      db.prepare('UPDATE users SET kontingent_total = kontingent_total + ? WHERE id = ?').bind(pkg.reports, user.id),
    ])
    if (promoCodeId) await db.prepare('UPDATE gutscheine SET total_uses = total_uses + 1 WHERE id = ?').bind(promoCodeId).run()
    return c.json({ success: true, orderId, status: 'completed', reportsAdded: pkg.reports })
  }

  return c.json({ success: true, orderId, amount, discountAmount, packageName: pkg.name, reportsCount: pkg.reports, paymentMethod, status: 'pending' })
})

export { orders }
