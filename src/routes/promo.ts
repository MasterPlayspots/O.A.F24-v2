// Promo Code Routes - Validate, Redeem, Admin List/Create
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, Variables, GutscheinRow } from '../types'
import { AUDIT_EVENTS } from '../types'
import { requireAuth, requireRole } from '../middleware/auth'
import { writeAuditLog } from '../services/audit'

const promo = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const ACTIVE_GUTSCHEIN_QUERY = "SELECT * FROM gutscheine WHERE code = ? AND is_active = 1 AND (valid_from IS NULL OR valid_from <= datetime('now')) AND (valid_until IS NULL OR valid_until > datetime('now'))"

async function findActiveGutschein(db: D1Database, code: string): Promise<GutscheinRow | null> {
  const g = await db.prepare(ACTIVE_GUTSCHEIN_QUERY).bind(code.toUpperCase()).first<GutscheinRow>()
  if (!g || g.total_uses >= g.max_uses) return null
  return g
}

// POST /validate
promo.post('/validate', async (c) => {
  const { code } = await c.req.json()
  if (!code) return c.json({ success: false, error: 'Code ist erforderlich' }, 400)

  const g = await findActiveGutschein(c.env.DB, code)
  if (!g) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Code' }, 400)

  return c.json({ success: true, discount: { type: g.discount_type, value: g.discount_value, code: g.code, remainingUses: g.max_uses - g.total_uses } })
})

// POST /redeem
promo.post('/redeem', requireAuth, async (c) => {
  const { code, orderId } = await c.req.json()
  if (!code) return c.json({ success: false, error: 'Code ist erforderlich' }, 400)
  const user = c.get('user'); const db = c.env.DB

  const g = await findActiveGutschein(db, code)
  if (!g) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Code' }, 400)

  const existing = await db.prepare('SELECT id FROM promo_redemptions WHERE user_id = ? AND promo_code_id = ?').bind(user.id, g.id).first()
  if (existing) return c.json({ success: false, error: 'Code wurde bereits eingelöst' }, 400)

  const redemptionId = crypto.randomUUID()
  await db.batch([
    db.prepare('INSERT INTO promo_redemptions (id, user_id, promo_code_id, order_id, discount_amount) VALUES (?, ?, ?, ?, ?)').bind(redemptionId, user.id, g.id, orderId || null, g.discount_value),
    db.prepare('UPDATE gutscheine SET total_uses = total_uses + 1 WHERE id = ?').bind(g.id),
  ])

  await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.PROMO_REDEEM, detail: `${code} (${g.discount_type}: ${g.discount_value})`, ip: c.req.header('CF-Connecting-IP') })
  return c.json({ success: true, redemptionId, discount: { type: g.discount_type, value: g.discount_value } })
})

// GET /codes (admin)
promo.get('/codes', requireAuth, requireRole('admin'), async (c) => {
  const codes = await c.env.DB.prepare('SELECT * FROM gutscheine ORDER BY created_at DESC').all()
  return c.json({ success: true, codes: codes.results })
})

// POST /create (admin)
promo.post('/create', requireAuth, requireRole('admin'), async (c) => {
  const schema = z.object({ code: z.string().min(3).max(50), discountType: z.enum(['percent', 'fixed']), discountValue: z.number().positive(), maxUses: z.number().int().positive().default(1), validFrom: z.string().optional(), validUntil: z.string().optional() })
  const parsed = schema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: z.ZodIssue) => e.message) }, 400)

  const { code, discountType, discountValue, maxUses, validFrom, validUntil } = parsed.data
  const existing = await c.env.DB.prepare('SELECT id FROM gutscheine WHERE code = ?').bind(code.toUpperCase()).first()
  if (existing) return c.json({ success: false, error: 'Code existiert bereits' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO gutscheine (id, code, discount_type, discount_value, max_uses, valid_from, valid_until, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, code.toUpperCase(), discountType, discountValue, maxUses, validFrom || null, validUntil || null, c.get('user').id).run()

  return c.json({ success: true, codeId: id, code: code.toUpperCase() })
})

export { promo }
