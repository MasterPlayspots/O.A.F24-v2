// Payment Routes - Stripe + PayPal
// Uses BAFA_DB for antrag status updates and download tokens
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, Variables } from '../types'
import { AUDIT_EVENTS, REPORT_PRICE_CENTS } from '../types'
import { requireAuth } from '../middleware/auth'
import { createCheckoutSession } from '../services/stripe'
import { createPayPalOrder, capturePayPalOrder } from '../services/paypal'
import { verifyStripeSignature } from '../services/hmac'
import { writeAuditLog } from '../services/audit'
import { createDownloadToken } from '../services/download'
import { validateAndApplyPromo } from '../services/promo'

const payments = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /stripe/create-session
payments.post('/stripe/create-session', requireAuth, async (c) => {
  const parsed = z.object({ reportId: z.string().uuid(), promoCode: z.string().optional() }).safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Ungültige Anfrage' }, 400)
  const { reportId, promoCode } = parsed.data; const user = c.get('user'); const db = c.env.DB

  // Verify ownership via zfbf-db reports table
  const report = await db.prepare('SELECT id, company_name FROM reports WHERE id = ? AND user_id = ?').bind(reportId, user.id).first<{ id: string; company_name: string }>()
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)

  // Get company name from BAFA_DB if available
  const antrag = await c.env.BAFA_DB.prepare('SELECT unternehmen_name FROM antraege WHERE id = ?').bind(reportId).first<{ unternehmen_name: string }>()
  const companyName = antrag?.unternehmen_name || report.company_name || 'Beratungsbericht'

  let amount = REPORT_PRICE_CENTS
  if (promoCode) {
    const promo = await validateAndApplyPromo(db, promoCode, amount)
    if (promo.valid) amount = promo.discountedAmount
  }

  if (amount === 0) {
    await db.prepare("UPDATE reports SET is_unlocked = 1, unlock_payment_id = 'promo-free' WHERE id = ?").bind(reportId).run()
    await c.env.BAFA_DB.prepare("UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?").bind(reportId).run()
    return c.json({ success: true, status: 'free', message: 'Bericht kostenlos freigeschaltet' })
  }

  try {
    const session = await createCheckoutSession(c.env.STRIPE_SECRET_KEY, { reportId, userId: user.id, amount, productName: `BAFA-Bericht: ${companyName}`, successUrl: 'https://zfbf.info/payment/success?session={CHECKOUT_SESSION_ID}', cancelUrl: 'https://zfbf.info/payment/cancel', customerEmail: user.email })
    await db.prepare("INSERT INTO payments (id, user_id, report_id, package_type, amount, provider, provider_payment_id, gutschein_code, status) VALUES (?, ?, ?, 'einzel', ?, 'stripe', ?, ?, 'pending')")
      .bind(crypto.randomUUID(), user.id, reportId, amount, session.id, promoCode || null).run()
    return c.json({ success: true, sessionId: session.id, checkoutUrl: session.url })
  } catch (err) { console.error('[Stripe] create-session failed:', err); return c.json({ success: false, error: 'Stripe Checkout konnte nicht erstellt werden' }, 500) }
})

// POST /stripe/webhook
payments.post('/stripe/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')
  if (!sig) return c.json({ error: 'Missing signature' }, 400)
  const payload = await c.req.text()
  if (!await verifyStripeSignature(payload, sig, c.env.STRIPE_WEBHOOK_SECRET)) return c.json({ error: 'Invalid signature' }, 403)

  const event = JSON.parse(payload)
  const eventKey = `stripe:${event.id}`
  if (await c.env.WEBHOOK_EVENTS.get(eventKey)) return c.json({ received: true, duplicate: true })
  await c.env.WEBHOOK_EVENTS.put(eventKey, '1', { expirationTtl: 86400 })

  const db = c.env.DB; const bafaDb = c.env.BAFA_DB
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object; const reportId = s.metadata?.reportId; const userId = s.metadata?.userId
    if (reportId && userId) {
      await db.prepare("UPDATE payments SET status = 'completed', provider_payment_id = ? WHERE provider_payment_id = ?").bind(s.payment_intent || s.id, s.id).run()
      await db.prepare("UPDATE reports SET is_unlocked=1, unlock_payment_id=? WHERE id=?").bind(s.id, reportId).run()
      await bafaDb.prepare("UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?").bind(reportId).run()
      await createDownloadToken(bafaDb, reportId)
      await writeAuditLog(db, { userId, eventType: AUDIT_EVENTS.PAYMENT, detail: `Stripe ${s.id} for ${reportId}` })
    }
  } else if (event.type === 'charge.refunded') {
    const charge = event.data.object
    const pay = await db.prepare('SELECT report_id FROM payments WHERE provider_payment_id = ?').bind(charge.payment_intent).first<{ report_id: string }>()
    if (pay?.report_id) {
      await db.batch([
        db.prepare('UPDATE reports SET is_unlocked = 0 WHERE id = ?').bind(pay.report_id),
        db.prepare("UPDATE payments SET status = 'refunded' WHERE provider_payment_id = ?").bind(charge.payment_intent),
      ])
      await bafaDb.prepare("UPDATE antraege SET status = 'vorschau', bezahlt_am = NULL, aktualisiert_am = datetime('now') WHERE id = ?").bind(pay.report_id).run()
    }
  }
  return c.json({ received: true })
})

// POST /paypal/create-order
payments.post('/paypal/create-order', requireAuth, async (c) => {
  const parsed = z.object({ reportId: z.string().uuid(), promoCode: z.string().optional() }).safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Ungültige Anfrage' }, 400)
  const { reportId, promoCode } = parsed.data; const user = c.get('user'); const db = c.env.DB

  const report = await db.prepare('SELECT id, company_name FROM reports WHERE id = ? AND user_id = ?').bind(reportId, user.id).first<{ id: string; company_name: string }>()
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)

  const antrag = await c.env.BAFA_DB.prepare('SELECT unternehmen_name FROM antraege WHERE id = ?').bind(reportId).first<{ unternehmen_name: string }>()
  const companyName = antrag?.unternehmen_name || report.company_name || 'Beratungsbericht'

  let amount = REPORT_PRICE_CENTS
  if (promoCode) {
    const promo = await validateAndApplyPromo(db, promoCode, amount)
    if (promo.valid) amount = promo.discountedAmount
  }

  if (amount === 0) {
    await db.prepare("UPDATE reports SET is_unlocked = 1, unlock_payment_id = 'promo-free' WHERE id = ?").bind(reportId).run()
    await c.env.BAFA_DB.prepare("UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?").bind(reportId).run()
    return c.json({ success: true, status: 'free', message: 'Bericht kostenlos freigeschaltet' })
  }

  try {
    const order = await createPayPalOrder(c.env.PAYPAL_CLIENT_ID, c.env.PAYPAL_CLIENT_SECRET, { reportId, userId: user.id, amount, description: `BAFA-Bericht: ${companyName}` })
    await db.prepare("INSERT INTO payments (id, user_id, report_id, package_type, amount, provider, provider_payment_id, gutschein_code, status) VALUES (?, ?, ?, 'einzel', ?, 'paypal', ?, ?, 'pending')")
      .bind(crypto.randomUUID(), user.id, reportId, amount, order.orderId, promoCode || null).run()
    return c.json({ success: true, orderId: order.orderId, approveUrl: order.approveUrl })
  } catch (err) { console.error('[PayPal] create-order failed:', err); return c.json({ success: false, error: 'PayPal Order konnte nicht erstellt werden' }, 500) }
})

// POST /paypal/capture-order
payments.post('/paypal/capture-order', requireAuth, async (c) => {
  const parsed = z.object({ orderId: z.string().min(1) }).safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Order ID erforderlich' }, 400)
  const { orderId } = parsed.data
  const user = c.get('user'); const db = c.env.DB; const bafaDb = c.env.BAFA_DB

  // Verify payment record belongs to authenticated user
  const pay = await db.prepare('SELECT id, report_id, amount, user_id FROM payments WHERE provider_payment_id = ? AND provider = ?').bind(orderId, 'paypal').first<{ id: string; report_id: string; amount: number; user_id: string }>()
  if (!pay) return c.json({ success: false, error: 'Zahlung nicht gefunden' }, 404)
  if (pay.user_id !== user.id) return c.json({ success: false, error: 'Keine Berechtigung' }, 403)

  try {
    const capture = await capturePayPalOrder(c.env.PAYPAL_CLIENT_ID, c.env.PAYPAL_CLIENT_SECRET, orderId)
    if (capture.status === 'COMPLETED') {
      // Verify captured amount matches expected
      const capturedAmount = capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount
      if (capturedAmount) {
        const capturedCents = Math.round(parseFloat(capturedAmount.value) * 100)
        if (capturedCents !== pay.amount) {
          console.error(`[PayPal] Amount mismatch: expected ${pay.amount}, got ${capturedCents}`)
          return c.json({ success: false, error: 'Betrag stimmt nicht überein' }, 400)
        }
      }

      await db.batch([
        db.prepare("UPDATE payments SET status = 'completed' WHERE id = ?").bind(pay.id),
        db.prepare("UPDATE reports SET is_unlocked=1, unlock_payment_id=? WHERE id=?").bind(orderId, pay.report_id),
      ])
      await bafaDb.prepare("UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?").bind(pay.report_id).run()
      const { token: dlToken, validUntil } = await createDownloadToken(bafaDb, pay.report_id)
      await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.PAYMENT, detail: `PayPal ${orderId}` })
      return c.json({ success: true, downloadToken: dlToken, expiresAt: validUntil })
    }
    return c.json({ success: false, error: 'Zahlung nicht abgeschlossen' }, 400)
  } catch (err) { console.error('[PayPal] capture-order failed:', err); return c.json({ success: false, error: 'PayPal Capture fehlgeschlagen' }, 500) }
})

export { payments }
