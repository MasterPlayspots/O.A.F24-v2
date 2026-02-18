// Report Routes - Generate, Preview, Unlock, Download, CRUD
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings, Variables, ReportRow } from '../types'
import { AUDIT_EVENTS } from '../types'
import { requireAuth } from '../middleware/auth'
import { downloadRateLimit, generateRateLimit } from '../middleware/rateLimit'
import { generateReportSection } from '../services/ai'
import { generateReportPreview, generateDownloadHtml } from '../services/report-html'
import { verifyHmacSignature } from '../services/hmac'
import { writeAuditLog } from '../services/audit'
import { sendDownloadEmail } from '../services/email'
import { createDownloadToken } from '../services/download'

const reports = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const generateSchema = z.object({
  branche: z.string().min(1, 'Branche ist erforderlich').max(100),
  unterbranche: z.string().max(100).optional(),
  companyName: z.string().min(1, 'Unternehmensname ist erforderlich').max(200),
  companyData: z.record(z.any()).optional(),
  stichpunkte: z.array(z.string().max(500)).max(20).optional(),
  herausforderungen: z.array(z.string().max(500)).max(20).optional(),
  module: z.array(z.string().max(200)).max(10).optional(),
  massnahmen: z.array(z.object({ name: z.string().max(200), methode: z.string().max(1000), ergebnis: z.string().max(1000) })).max(20).optional(),
})

const unlockSchema = z.object({
  reportId: z.string().uuid(),
  paymentId: z.string().min(1),
  provider: z.enum(['stripe', 'paypal', 'invoice']),
  signature: z.string().min(1),
})

// POST /generate
reports.post('/generate', requireAuth, generateRateLimit, async (c) => {
  const parsed = generateSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: any) => e.message) }, 400)

  const user = c.get('user'); const db = c.env.DB; const d = parsed.data
  const u = await db.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(user.id).first<{ kontingent_total: number; kontingent_used: number }>()
  if (!u || u.kontingent_total - u.kontingent_used <= 0) return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)

  const reportId = crypto.randomUUID()
  await db.prepare("INSERT INTO reports (id, user_id, status, company_name, branche, unterbranche) VALUES (?, ?, 'generating', ?, ?, ?)")
    .bind(reportId, user.id, d.companyName, d.branche, d.unterbranche || null).run()

  const phases = ['ausgangslage', 'beratungsinhalte', 'massnahmen', 'ergebnisse', 'nachhaltigkeit'] as const
  const results: Record<string, any> = {}
  for (const phase of phases) {
    const r = await generateReportSection(c.env.AI, { branche: d.branche, unterbranche: d.unterbranche, companyName: d.companyName, stichpunkte: d.stichpunkte, herausforderungen: d.herausforderungen, module: d.module, massnahmen: d.massnahmen, phase })
    if (!r.success) { await db.prepare("UPDATE reports SET status = 'error' WHERE id = ?").bind(reportId).run(); return c.json({ success: false, error: `Phase "${phase}" fehlgeschlagen`, reportId }, 500) }
    results[phase] = r
  }

  await db.prepare(`UPDATE reports SET status='generiert', ausgangslage_text=?, beratungsinhalte_text=?, massnahmenplan=?,
    ergebnisse_kurzfristig=?, ergebnisse_mittelfristig=?, ergebnisse_langfristig=?,
    nachhaltigkeit_oekonomisch=?, nachhaltigkeit_oekologisch=?, nachhaltigkeit_sozial=?, updated_at=datetime('now') WHERE id=?`)
    .bind(results.ausgangslage?.text || '', results.beratungsinhalte?.text || '', results.massnahmen?.text || '',
      results.ergebnisse?.structured?.kurzfristig || results.ergebnisse?.text || '', results.ergebnisse?.structured?.mittelfristig || '', results.ergebnisse?.structured?.langfristig || '',
      results.nachhaltigkeit?.structured?.oekonomisch || results.nachhaltigkeit?.text || '', results.nachhaltigkeit?.structured?.oekologisch || '', results.nachhaltigkeit?.structured?.sozial || '', reportId).run()

  await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.REPORT_GENERATE, detail: `${reportId} for ${d.companyName}`, ip: c.req.header('CF-Connecting-IP') })
  return c.json({ success: true, reportId, message: 'Bericht erfolgreich generiert' })
})

// GET /preview/:id
reports.get('/preview/:id', requireAuth, async (c) => {
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('user').id).first() as ReportRow | null
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)
  return new Response(generateReportPreview(report, report.is_unlocked === 1), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})

// POST /unlock
reports.post('/unlock', async (c) => {
  const parsed = unlockSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Ungültige Anfrage' }, 400)
  const { reportId, paymentId, provider, signature } = parsed.data
  if (!await verifyHmacSignature(reportId, paymentId, provider, signature, c.env.UNLOCK_SECRET)) return c.json({ success: false, error: 'Ungültige Signatur' }, 403)

  const db = c.env.DB
  const report = await db.prepare('SELECT id, user_id, is_unlocked FROM reports WHERE id = ?').bind(reportId).first<{ id: string; user_id: string; is_unlocked: number }>()
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)
  if (report.is_unlocked === 1) return c.json({ success: true, message: 'Bereits freigeschaltet' })

  await db.prepare("UPDATE reports SET is_unlocked=1, unlock_payment_id=?, updated_at=datetime('now') WHERE id=?").bind(paymentId, reportId).run()
  const { token: downloadToken, validUntil } = await createDownloadToken(db, reportId)

  const user = await db.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(report.user_id).first<{ email: string; first_name: string }>()
  if (user && c.env.RESEND_API_KEY) await sendDownloadEmail(c.env.RESEND_API_KEY, user.email, user.first_name, `https://zfbf.info/api/bafa/download/${downloadToken}`)

  await writeAuditLog(db, { userId: report.user_id, eventType: AUDIT_EVENTS.REPORT_UNLOCK, detail: `${reportId} via ${provider}` })
  return c.json({ success: true, downloadToken, expiresAt: validUntil })
})

// GET /download/:token
reports.get('/download/:token', downloadRateLimit, async (c) => {
  const db = c.env.DB
  const report = await db.prepare(
    `SELECT r.* FROM reports r
     INNER JOIN download_tokens dt ON dt.report_id = r.id
     WHERE dt.token = ? AND dt.valid_until > datetime('now') AND r.is_unlocked = 1`
  ).bind(c.req.param('token')).first() as ReportRow | null
  if (!report) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Download-Link' }, 403)

  const filename = `BAFA-Bericht_${(report.company_name || 'Bericht').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}.html`
  await writeAuditLog(db, { userId: report.user_id, eventType: AUDIT_EVENTS.REPORT_DOWNLOAD, detail: report.id })
  return new Response(generateDownloadHtml(report), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` } })
})

// GET / - List reports
reports.get('/', requireAuth, async (c) => {
  const r = await c.env.DB.prepare('SELECT id, status, company_name, branche, unterbranche, qa_gesamt, is_unlocked, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY updated_at DESC').bind(c.get('user').id).all()
  return c.json({ success: true, reports: r.results })
})

// GET /:id
reports.get('/:id', requireAuth, async (c) => {
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').bind(c.req.param('id'), c.get('user').id).first()
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)
  return c.json({ success: true, report })
})

// POST / - Create draft
reports.post('/', requireAuth, async (c) => {
  const user = c.get('user'); const db = c.env.DB
  const u = await db.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(user.id).first<{ kontingent_total: number; kontingent_used: number }>()
  if (!u || u.kontingent_total - u.kontingent_used <= 0) return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)
  const id = crypto.randomUUID()
  await db.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(id, user.id).run()
  return c.json({ success: true, reportId: id })
})

// PATCH /:id
reports.patch('/:id', requireAuth, async (c) => {
  const updates = await c.req.json()
  const allowed = ['status','company_name','company_rechtsform','company_gruendung','company_mitarbeiter','company_umsatz','company_plz','company_ort','branche','unterbranche','ausgangslage_stichpunkte','ausgangslage_herausforderungen','ausgangslage_text','beratungsmodule','massnahmen','beratungsinhalte_text','massnahmenplan','handlungsempfehlungen','umsetzungsplan','ergebnisse_kurzfristig','ergebnisse_mittelfristig','ergebnisse_langfristig','nachhaltigkeit_oekonomisch','nachhaltigkeit_oekologisch','nachhaltigkeit_sozial','qa_vollstaendigkeit','qa_bafa_konformitaet','qa_textqualitaet','qa_plausibilitaet','qa_gesamt']
  const set: string[] = []; const vals: unknown[] = []
  for (const [k, v] of Object.entries(updates)) { if (allowed.includes(k)) { set.push(`${k} = ?`); vals.push(typeof v === 'object' ? JSON.stringify(v) : v) } }
  if (set.length) { vals.push(c.req.param('id'), c.get('user').id); await c.env.DB.prepare(`UPDATE reports SET ${set.join(', ')}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(...vals).run() }
  return c.json({ success: true })
})

// POST /:id/finalize
reports.post('/:id/finalize', requireAuth, async (c) => {
  const user = c.get('user'); const db = c.env.DB
  const u = await db.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(user.id).first<{ kontingent_total: number; kontingent_used: number }>()
  if (!u || u.kontingent_total - u.kontingent_used <= 0) return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)
  await db.batch([
    db.prepare("UPDATE reports SET status = 'finalisiert' WHERE id = ? AND user_id = ?").bind(c.req.param('id'), user.id),
    db.prepare('UPDATE users SET kontingent_used = kontingent_used + 1 WHERE id = ?').bind(user.id),
  ])
  return c.json({ success: true })
})

export { reports }
