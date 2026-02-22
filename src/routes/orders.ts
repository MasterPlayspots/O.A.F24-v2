// Order Routes - Create order with promo discount
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, Variables } from '../types'
import { PACKAGES } from '../types'
import { requireAuth } from '../middleware/auth'
import { validateAndApplyPromo } from '../services/promo'

const orders = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const schema = z.object({
  packageType: z.enum(['einzel', 'starter', 'standard', 'pro']),
  promoCode: z.string().optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'invoice']),
})

orders.post('/create', requireAuth, async (c) => {
  const parsed = schema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: z.ZodIssue) => e.message) }, 400)

  const { packageType, promoCode, paymentMethod } = parsed.data
  const user = c.get('user'); const db = c.env.DB; const pkg = PACKAGES[packageType]
  if (!pkg) return c.json({ success: false, error: 'Ungültiges Paket' }, 400)

  let amount = pkg.price, discountAmount = 0, promoCodeId: string | null = null

  if (promoCode) {
    const promo = await validateAndApplyPromo(db, promoCode, pkg.price)
    if (promo.valid) {
      promoCodeId = promo.promoCodeId
      discountAmount = promo.discountAmount
      amount = promo.discountedAmount
    }
  }

  const orderId = crypto.randomUUID()
  await db.prepare("INSERT INTO orders (id, user_id, amount, discount_amount, final_amount, reports_count, status, promo_code_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)")
    .bind(orderId, user.id, pkg.price, discountAmount, amount, pkg.reports, promoCodeId).run()

  // Free (100% discount): complete immediately
  if (amount === 0) {
    await db.batch([
      db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").bind(orderId),
      db.prepare('UPDATE users SET kontingent_total = kontingent_total + ? WHERE id = ?').bind(pkg.reports, user.id),
    ])
    if (promoCodeId) await db.prepare('UPDATE gutscheine SET total_uses = total_uses + 1 WHERE id = ?').bind(promoCodeId).run()
    return c.json({ success: true, orderId, status: 'completed', reportsAdded: pkg.reports })
  }

  // Invoice: pending admin approval — kontingent NOT granted until admin confirms payment
  if (paymentMethod === 'invoice') {
    await db.prepare("UPDATE orders SET status = 'awaiting_payment' WHERE id = ?").bind(orderId).run()
    return c.json({ success: true, orderId, status: 'awaiting_payment', message: 'Rechnung wird erstellt. Kontingent wird nach Zahlungseingang freigeschaltet.' })
  }

  return c.json({ success: true, orderId, amount, discountAmount, packageName: pkg.name, reportsCount: pkg.reports, paymentMethod, status: 'pending' })
})

export { orders }
