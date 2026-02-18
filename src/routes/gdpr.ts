// GDPR Routes - DSGVO Art. 15 Export, Art. 17 Deletion
import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { AUDIT_EVENTS } from '../types'
import { requireAuth } from '../middleware/auth'
import { writeAuditLog } from '../services/audit'

const gdpr = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// GET /export - DSGVO Art. 15: Right of access (Auskunftsrecht)
gdpr.get('/export', requireAuth, async (c) => {
  const userId = c.get('user').id
  const db = c.env.DB

  const [user, reports, payments, orders, promoRedemptions, auditLogs] = await db.batch([
    db.prepare('SELECT id, email, first_name, last_name, company, bafa_id, ust_id, steuernummer, phone, website, bafa_status, kontingent_total, kontingent_used, created_at, updated_at, privacy_accepted_at FROM users WHERE id = ?').bind(userId),
    db.prepare('SELECT id, status, company_name, branche, unterbranche, is_unlocked, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY created_at DESC').bind(userId),
    db.prepare('SELECT id, report_id, package_type, amount, currency, status, provider, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC').bind(userId),
    db.prepare('SELECT id, amount, discount_amount, final_amount, reports_count, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC').bind(userId),
    db.prepare('SELECT pr.id, g.code, pr.discount_amount, pr.redeemed_at FROM promo_redemptions pr JOIN gutscheine g ON g.id = pr.promo_code_id WHERE pr.user_id = ? ORDER BY pr.redeemed_at DESC').bind(userId),
    db.prepare("SELECT event_type, detail, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(userId),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    dsgvoArticle: 'Art. 15 DSGVO - Auskunftsrecht',
    user: user.results[0] || null,
    reports: reports.results,
    payments: payments.results,
    orders: orders.results,
    promoRedemptions: promoRedemptions.results,
    recentAuditLogs: auditLogs.results,
  }

  await writeAuditLog(db, { userId, eventType: 'gdpr_export', ip: c.req.header('CF-Connecting-IP') })

  return c.json({ success: true, data: exportData }, 200, {
    'Content-Disposition': `attachment; filename="dsgvo-export-${new Date().toISOString().slice(0, 10)}.json"`,
  })
})

// DELETE /account - DSGVO Art. 17: Right to erasure (Recht auf Löschung)
gdpr.delete('/account', requireAuth, async (c) => {
  const userId = c.get('user').id
  const db = c.env.DB

  const deletedEmail = `deleted-${crypto.randomUUID().slice(0, 8)}@deleted.local`

  // Soft-delete user and anonymize PII
  // Keep payment records for HGB 10-year retention (Handelsgesetzbuch §257)
  await db.batch([
    // Anonymize user data
    db.prepare(`UPDATE users SET
      email = ?, first_name = '[GELÖSCHT]', last_name = '[GELÖSCHT]',
      company = NULL, phone = NULL, website = NULL, bafa_id = NULL,
      ust_id = NULL, steuernummer = NULL,
      password_hash = '', salt = NULL,
      verification_token = NULL, reset_token = NULL, reset_token_expires = NULL,
      deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`).bind(deletedEmail, userId),
    // Revoke all sessions
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').bind(userId),
    // Invalidate download tokens
    db.prepare("UPDATE download_tokens SET valid_until = datetime('now') WHERE report_id IN (SELECT id FROM reports WHERE user_id = ?)").bind(userId),
    // Anonymize audit logs (keep event types for compliance)
    db.prepare("UPDATE audit_logs SET ip = NULL, user_agent = NULL, detail = '[GELÖSCHT]' WHERE user_id = ?").bind(userId),
  ])

  await writeAuditLog(db, { userId, eventType: 'gdpr_deletion', detail: 'Account anonymized per Art. 17 DSGVO' })

  return c.json({ success: true, message: 'Ihr Konto wurde gelöscht und Ihre Daten anonymisiert. Zahlungsdaten werden gemäß HGB §257 aufbewahrt.' })
})

// POST /privacy-consent - Record privacy policy acceptance
gdpr.post('/privacy-consent', requireAuth, async (c) => {
  const userId = c.get('user').id
  await c.env.DB.prepare("UPDATE users SET privacy_accepted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(userId).run()
  return c.json({ success: true, message: 'Datenschutzerklärung akzeptiert' })
})

export { gdpr }
