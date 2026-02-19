// Report Routes - Generate, Preview, Unlock, Download, CRUD
// Uses BAFA_DB (bafa_antraege) for antraege/antrag_bausteine/download_tokens
// Uses DB (zfbf-db) for user ownership (reports table) and kontingent checks
import { Hono } from 'hono'
import { z } from 'zod'
import type { Context } from 'hono'
import type { Bindings, Variables, AntragRow, AntragBausteinRow } from '../types'
import { AUDIT_EVENTS, AntragStatus } from '../types'
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
  branche: z.string().min(1, 'Branche ist erforderlich'),
  unterbranche: z.string().optional(),
  companyName: z.string().min(1, 'Unternehmensname ist erforderlich'),
  companyData: z.object({
    unternehmen_typ: z.string().optional(),
    unternehmen_mitarbeiter: z.number().optional(),
    unternehmen_umsatz: z.string().optional(),
    unternehmen_hauptproblem: z.string().optional(),
  }).optional(),
  beratungsschwerpunkte: z.string().optional(),
  stichpunkte: z.array(z.string()).optional(),
  herausforderungen: z.array(z.string()).optional(),
  module: z.array(z.string()).optional(),
  massnahmen: z.array(z.object({ name: z.string(), methode: z.string(), ergebnis: z.string() })).optional(),
})

const unlockSchema = z.object({
  reportId: z.string().uuid(),
  paymentId: z.string().min(1),
  provider: z.enum(['stripe', 'paypal', 'invoice']),
  signature: z.string().min(1),
})

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

async function checkKontingent(db: D1Database, userId: string): Promise<{ hasQuota: boolean }> {
  const u = await db.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(userId).first<{ kontingent_total: number; kontingent_used: number }>()
  return { hasQuota: !!u && u.kontingent_total - u.kontingent_used > 0 }
}

function kontingentError(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)
}

/** Load antrag with its bausteine from BAFA_DB */
async function loadAntragWithBausteine(bafaDb: D1Database, antragId: string): Promise<{ antrag: AntragRow; bausteine: AntragBausteinRow[] } | null> {
  const [antragResult, bausteineResult] = await bafaDb.batch([
    bafaDb.prepare('SELECT * FROM antraege WHERE id = ?').bind(antragId),
    bafaDb.prepare('SELECT * FROM antrag_bausteine WHERE antrag_id = ? ORDER BY id').bind(antragId),
  ])
  const antrag = antragResult?.results?.[0] as AntragRow | undefined
  if (!antrag) return null
  return { antrag, bausteine: (bausteineResult?.results ?? []) as AntragBausteinRow[] }
}

// POST /generate
reports.post('/generate', requireAuth, generateRateLimit, async (c) => {
  const parsed = generateSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: z.ZodIssue) => e.message) }, 400)

  const user = c.get('user'); const db = c.env.DB; const bafaDb = c.env.BAFA_DB; const d = parsed.data
  const { hasQuota } = await checkKontingent(db, user.id)
  if (!hasQuota) return kontingentError(c)

  const antragId = crypto.randomUUID()
  const cd = d.companyData || {}

  // Create ownership record in zfbf-db
  await db.prepare("INSERT INTO reports (id, user_id, status, company_name, branche, unterbranche) VALUES (?, ?, 'generating', ?, ?, ?)")
    .bind(antragId, user.id, d.companyName, d.branche, d.unterbranche || null).run()

  // Create antrag in bafa_antraege with full company data
  await bafaDb.prepare(
    `INSERT INTO antraege (id, branche_id, unternehmen_name, unternehmen_typ, unternehmen_mitarbeiter,
      unternehmen_umsatz, unternehmen_hauptproblem, beratungsschwerpunkte, status, erstellt_am, aktualisiert_am)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'vorschau', datetime('now'), datetime('now'))`
  ).bind(
    antragId, d.branche, d.companyName,
    cd.unternehmen_typ || null, cd.unternehmen_mitarbeiter || null,
    cd.unternehmen_umsatz || null, cd.unternehmen_hauptproblem || null,
    d.beratungsschwerpunkte || null
  ).run()

  // Generate 5 content phases via AI
  const phases = ['ausgangslage', 'beratungsinhalte', 'massnahmen', 'ergebnisse', 'nachhaltigkeit'] as const
  const results: Record<string, any> = {}
  let totalWords = 0

  for (const phase of phases) {
    const r = await generateReportSection(c.env.AI, { branche: d.branche, unterbranche: d.unterbranche, companyName: d.companyName, stichpunkte: d.stichpunkte, herausforderungen: d.herausforderungen, module: d.module, massnahmen: d.massnahmen, phase })
    if (!r.success) {
      // Mark as failed in both databases
      await Promise.all([
        db.prepare("UPDATE reports SET status = 'error' WHERE id = ?").bind(antragId).run(),
        bafaDb.prepare("UPDATE antraege SET status = 'fehlgeschlagen', aktualisiert_am = datetime('now') WHERE id = ?").bind(antragId).run(),
      ])
      return c.json({ success: false, error: `Phase "${phase}" fehlgeschlagen`, reportId: antragId }, 500)
    }
    results[phase] = r
  }

  // Insert each phase as a baustein in antrag_bausteine
  const bausteinInserts: D1PreparedStatement[] = []
  for (const phase of phases) {
    const r = results[phase]
    const text = r.text || ''
    const wordCount = text.split(/\s+/).filter(Boolean).length
    totalWords += wordCount

    if (r.structured) {
      // Structured content (ergebnisse, nachhaltigkeit) - store as JSON
      bausteinInserts.push(
        bafaDb.prepare(
          `INSERT INTO antrag_bausteine (antrag_id, baustein_typ, baustein_name, inhalt, inhalt_json, wortanzahl, erstellt_am)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(antragId, phase, phase, text, JSON.stringify(r.structured), wordCount)
      )
    } else {
      bausteinInserts.push(
        bafaDb.prepare(
          `INSERT INTO antrag_bausteine (antrag_id, baustein_typ, baustein_name, inhalt, wortanzahl, erstellt_am)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        ).bind(antragId, phase, phase, text, wordCount)
      )
    }
  }

  // Batch insert all bausteine + update antrag status
  await bafaDb.batch([
    ...bausteinInserts,
    bafaDb.prepare("UPDATE antraege SET status = 'generiert', wortanzahl = ?, aktualisiert_am = datetime('now') WHERE id = ?")
      .bind(totalWords, antragId),
  ])

  // Update ownership record status
  await db.prepare("UPDATE reports SET status = 'generiert', updated_at = datetime('now') WHERE id = ?").bind(antragId).run()

  await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.REPORT_GENERATE, detail: `${antragId} for ${d.companyName}`, ip: c.req.header('CF-Connecting-IP') })
  return c.json({ success: true, reportId: antragId, message: 'Bericht erfolgreich generiert' })
})

// GET /preview/:id
reports.get('/preview/:id', requireAuth, async (c) => {
  const antragId = c.req.param('id')
  // Verify ownership via zfbf-db
  const ownership = await c.env.DB.prepare('SELECT id, is_unlocked FROM reports WHERE id = ? AND user_id = ?').bind(antragId, c.get('user').id).first<{ id: string; is_unlocked: number }>()
  if (!ownership) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)

  // Load antrag + bausteine from bafa_antraege
  const data = await loadAntragWithBausteine(c.env.BAFA_DB, antragId)
  if (!data) return c.json({ success: false, error: 'Antrag nicht gefunden' }, 404)

  return new Response(generateReportPreview(data.antrag, data.bausteine, ownership.is_unlocked === 1), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})

// POST /unlock
reports.post('/unlock', async (c) => {
  const parsed = unlockSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Ungültige Anfrage' }, 400)
  const { reportId, paymentId, provider, signature } = parsed.data
  if (!await verifyHmacSignature(reportId, paymentId, provider, signature, c.env.UNLOCK_SECRET)) return c.json({ success: false, error: 'Ungültige Signatur' }, 403)

  const db = c.env.DB; const bafaDb = c.env.BAFA_DB
  const report = await db.prepare('SELECT id, user_id, is_unlocked FROM reports WHERE id = ?').bind(reportId).first<{ id: string; user_id: string; is_unlocked: number }>()
  if (!report) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)
  if (report.is_unlocked === 1) return c.json({ success: true, message: 'Bereits freigeschaltet' })

  // Update ownership record in zfbf-db
  await db.prepare("UPDATE reports SET is_unlocked=1, unlock_payment_id=?, updated_at=datetime('now') WHERE id=?").bind(paymentId, reportId).run()
  // Update antrag status in bafa_antraege
  await bafaDb.prepare("UPDATE antraege SET status = 'bezahlt', bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?").bind(reportId).run()

  const { token: downloadToken, validUntil } = await createDownloadToken(bafaDb, reportId)

  const user = await db.prepare('SELECT email, first_name FROM users WHERE id = ?').bind(report.user_id).first<{ email: string; first_name: string }>()
  if (user && c.env.RESEND_API_KEY) await sendDownloadEmail(c.env.RESEND_API_KEY, user.email, user.first_name, `https://zfbf.info/api/bafa/download/${downloadToken}`)

  await writeAuditLog(db, { userId: report.user_id, eventType: AUDIT_EVENTS.REPORT_UNLOCK, detail: `${reportId} via ${provider}` })
  return c.json({ success: true, downloadToken, expiresAt: validUntil })
})

// GET /download/:token
reports.get('/download/:token', downloadRateLimit, async (c) => {
  const bafaDb = c.env.BAFA_DB
  // Validate token and get antrag from bafa_antraege
  const tokenRow = await bafaDb.prepare(
    "SELECT antrag_id, downloads, max_downloads FROM download_tokens WHERE token = ? AND gueltig_bis > datetime('now')"
  ).bind(c.req.param('token')).first<{ antrag_id: string; downloads: number; max_downloads: number }>()

  if (!tokenRow) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Download-Link' }, 403)
  if (tokenRow.downloads >= tokenRow.max_downloads) return c.json({ success: false, error: 'Maximale Anzahl Downloads erreicht' }, 403)

  // Load antrag + bausteine
  const data = await loadAntragWithBausteine(bafaDb, tokenRow.antrag_id)
  if (!data) return c.json({ success: false, error: 'Antrag nicht gefunden' }, 404)

  // Increment download counter
  await bafaDb.prepare('UPDATE download_tokens SET downloads = downloads + 1 WHERE token = ?').bind(c.req.param('token')).run()

  const filename = `BAFA-Bericht_${(data.antrag.unternehmen_name || 'Bericht').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}.html`

  // Get user_id from ownership table for audit log
  const ownership = await c.env.DB.prepare('SELECT user_id FROM reports WHERE id = ?').bind(tokenRow.antrag_id).first<{ user_id: string }>()
  if (ownership) await writeAuditLog(c.env.DB, { userId: ownership.user_id, eventType: AUDIT_EVENTS.REPORT_DOWNLOAD, detail: tokenRow.antrag_id })

  return new Response(generateDownloadHtml(data.antrag, data.bausteine), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"` } })
})

// GET / - List reports (with pagination)
reports.get('/', requireAuth, async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(c.req.query('limit') || String(DEFAULT_PAGE_SIZE), 10)))
  const offset = (page - 1) * limit

  // Get user's report IDs from ownership table
  const [countResult, ownershipResult] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as total FROM reports WHERE user_id = ?').bind(c.get('user').id).first<{ total: number }>(),
    c.env.DB.prepare('SELECT id, status, company_name, branche, unterbranche, is_unlocked, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?').bind(c.get('user').id, limit, offset).all(),
  ])

  const reportIds = (ownershipResult.results || []).map((r: any) => r.id)

  // Enrich with antrag data from BAFA_DB if we have IDs
  let enrichedReports = ownershipResult.results || []
  if (reportIds.length > 0) {
    const placeholders = reportIds.map(() => '?').join(',')
    const antraegeResult = await c.env.BAFA_DB.prepare(
      `SELECT id, unternehmen_name, branche_id, status as antrag_status, qualitaetsscore, wortanzahl, erstellt_am, aktualisiert_am FROM antraege WHERE id IN (${placeholders})`
    ).bind(...reportIds).all()

    const antragMap = new Map((antraegeResult.results || []).map((a: any) => [a.id, a]))
    enrichedReports = (ownershipResult.results || []).map((r: any) => {
      const antrag = antragMap.get(r.id) as any
      return {
        ...r,
        unternehmen_name: antrag?.unternehmen_name || r.company_name,
        qualitaetsscore: antrag?.qualitaetsscore || 0,
        wortanzahl: antrag?.wortanzahl || 0,
        antrag_status: antrag?.antrag_status || null,
      }
    })
  }

  return c.json({ success: true, reports: enrichedReports, pagination: { page, limit, total: countResult?.total || 0, totalPages: Math.ceil((countResult?.total || 0) / limit) } })
})

// GET /:id
reports.get('/:id', requireAuth, async (c) => {
  const antragId = c.req.param('id')
  // Verify ownership
  const ownership = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').bind(antragId, c.get('user').id).first()
  if (!ownership) return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)

  // Load antrag + bausteine from BAFA_DB
  const data = await loadAntragWithBausteine(c.env.BAFA_DB, antragId)

  return c.json({
    success: true,
    report: ownership,
    antrag: data?.antrag || null,
    bausteine: data?.bausteine || [],
  })
})

// POST / - Create draft
reports.post('/', requireAuth, async (c) => {
  const user = c.get('user'); const db = c.env.DB; const bafaDb = c.env.BAFA_DB
  const { hasQuota } = await checkKontingent(db, user.id)
  if (!hasQuota) return kontingentError(c)

  const id = crypto.randomUUID()
  // Create ownership record in zfbf-db
  await db.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(id, user.id).run()
  // Create antrag in bafa_antraege with vorschau status
  await bafaDb.prepare(
    "INSERT INTO antraege (id, unternehmen_name, status, erstellt_am, aktualisiert_am) VALUES (?, '', 'vorschau', datetime('now'), datetime('now'))"
  ).bind(id).run()

  return c.json({ success: true, reportId: id })
})

// PATCH /:id
reports.patch('/:id', requireAuth, async (c) => {
  const antragId = c.req.param('id')
  const updates = await c.req.json()

  // Update ownership table (zfbf-db) for legacy fields
  const ownershipAllowed = ['status', 'company_name', 'branche', 'unterbranche']
  const ownershipSet: string[] = []; const ownershipVals: unknown[] = []
  for (const [k, v] of Object.entries(updates)) {
    if (ownershipAllowed.includes(k)) { ownershipSet.push(`${k} = ?`); ownershipVals.push(typeof v === 'object' ? JSON.stringify(v) : v) }
  }
  if (ownershipSet.length) {
    ownershipVals.push(antragId, c.get('user').id)
    await c.env.DB.prepare(`UPDATE reports SET ${ownershipSet.join(', ')}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(...ownershipVals).run()
  }

  // Update antraege table (bafa_antraege) for BAFA-specific fields
  const antragAllowed: Record<string, string> = {
    'company_name': 'unternehmen_name',
    'unternehmen_name': 'unternehmen_name',
    'unternehmen_typ': 'unternehmen_typ',
    'unternehmen_mitarbeiter': 'unternehmen_mitarbeiter',
    'unternehmen_umsatz': 'unternehmen_umsatz',
    'unternehmen_hauptproblem': 'unternehmen_hauptproblem',
    'branche': 'branche_id',
    'branche_id': 'branche_id',
    'beratungsschwerpunkte': 'beratungsschwerpunkte',
    'beratungsthema': 'beratungsthema',
  }
  const antragSet: string[] = []; const antragVals: unknown[] = []
  for (const [k, v] of Object.entries(updates)) {
    const col = antragAllowed[k]
    if (col) { antragSet.push(`${col} = ?`); antragVals.push(typeof v === 'object' ? JSON.stringify(v) : v) }
  }
  if (antragSet.length) {
    antragVals.push(antragId)
    await c.env.BAFA_DB.prepare(`UPDATE antraege SET ${antragSet.join(', ')}, aktualisiert_am = datetime('now') WHERE id = ?`).bind(...antragVals).run()
  }

  return c.json({ success: true })
})

// POST /:id/finalize
reports.post('/:id/finalize', requireAuth, async (c) => {
  const user = c.get('user'); const db = c.env.DB; const bafaDb = c.env.BAFA_DB
  const { hasQuota } = await checkKontingent(db, user.id)
  if (!hasQuota) return kontingentError(c)

  const antragId = c.req.param('id')
  await db.batch([
    db.prepare("UPDATE reports SET status = 'finalisiert' WHERE id = ? AND user_id = ?").bind(antragId, user.id),
    db.prepare('UPDATE users SET kontingent_used = kontingent_used + 1 WHERE id = ?').bind(user.id),
  ])
  // Update antrag status in bafa_antraege
  await bafaDb.prepare("UPDATE antraege SET status = 'pending', aktualisiert_am = datetime('now') WHERE id = ?").bind(antragId).run()

  return c.json({ success: true })
})

export { reports }
