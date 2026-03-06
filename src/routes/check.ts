import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import {
  searchKatalog,
  getUserProfile,
  saveOrUpdateProfile,
  performMatching,
  saveMatches,
  getMatchesForProfile,
  processChat,
  uploadDocument,
  getProgramById,
} from '../services/foerdermittel'

/**
 * /check routes — Wizard-based Fördermittel-Check flow.
 *
 * This implements the 5-step frontend wizard:
 *   1. POST  /check                     → Submit company form, get session + greeting
 *   2. POST  /check/:sessionId/chat     → Chat interaction
 *   3. POST  /check/:sessionId/docs     → Upload documents
 *   4. POST  /check/:sessionId/analyze  → Run full AI matching
 *   5. GET   /check/:sessionId/plan     → Get action plan for top matches
 *
 * A "check session" is stored in KV (SESSIONS) and backed by a
 * foerdermittel_profile + foerdermittel_conversations row.
 */

interface CheckSession {
  profileId: string
  conversationId: string | null
  formData: Record<string, unknown>
  vorfilterCount: number
  step: number
  createdAt: string
}

const check = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================
// Step 1: Submit company form → create session
// ============================================
check.post('/', async (c) => {
  const body = await c.req.json() as {
    firmenname?: string
    rechtsform?: string
    branche?: string
    bundesland?: string
    plz?: string
    mitarbeiter?: number
    jahresumsatz?: number
    gruendungsjahr?: number
    vorhaben?: string
    vorhaben_details?: string
    investitionsvolumen?: number
    email?: string
  }

  if (!body.firmenname) {
    return c.json({ success: false, error: 'Firmenname erforderlich' }, 400)
  }

  // Create or update a temporary profile (using email or a guest ID)
  const sessionId = crypto.randomUUID()
  const profileId = crypto.randomUUID()

  // Store profile in DB
  await c.env.BAFA_DB.prepare(
    `INSERT INTO foerdermittel_profile (id, user_id, company_name, branche, standort, rechtsform, mitarbeiter_anzahl, jahresumsatz, gruendungsjahr, beschreibung)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    profileId,
    `check-${sessionId}`,
    body.firmenname,
    body.branche || null,
    body.bundesland || null,
    body.rechtsform || null,
    body.mitarbeiter || null,
    body.jahresumsatz || null,
    body.gruendungsjahr || null,
    body.vorhaben_details || body.vorhaben || null,
  ).run()

  // Quick pre-filter count: how many programs could match?
  const conditions: string[] = []
  const params: string[] = []

  if (body.bundesland) {
    conditions.push('(foerdergebiet LIKE ? OR foerdergebiet LIKE ?)')
    params.push(`%${body.bundesland}%`, '%Bundesweit%')
  }
  if (body.branche) {
    conditions.push('foerderbereich LIKE ?')
    params.push(`%${body.branche}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const countResult = await c.env.FOERDER_DB.prepare(
    `SELECT COUNT(*) as cnt FROM foerderprogramme ${whereClause}`
  ).bind(...params).first<{ cnt: number }>()

  const vorfilterCount = countResult?.cnt ?? 0

  // Generate greeting via AI
  let begruessung: string
  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'user',
        content: `Du bist ein freundlicher Experte für deutsche Fördermittel. Ein Unternehmen hat gerade den Fördermittel-Check gestartet. Begrüße es und stelle 3 kurze Rückfragen, um die passenden Programme besser einzugrenzen.

UNTERNEHMEN: ${body.firmenname}
BRANCHE: ${body.branche || 'k.A.'}
BUNDESLAND: ${body.bundesland || 'k.A.'}
VORHABEN: ${body.vorhaben || 'k.A.'}
VORFILTER-TREFFER: ${vorfilterCount} Programme

Antworte auf Deutsch, freundlich und professionell. Verwende Markdown für Formatierung. Nenne die Anzahl der vorläufigen Treffer.`,
      }],
      max_tokens: 500,
    }) as { response?: string }

    begruessung = result.response || `Willkommen zum Fördermittel-Check für **${body.firmenname}**! Basierend auf Ihren Angaben kommen ca. **${vorfilterCount} Förderprogramme** in Frage.\n\nUm die passenden Programme zu finden, habe ich ein paar Fragen:\n\n1. Haben Sie in den letzten 3 Jahren bereits Fördermittel erhalten?\n2. Wann planen Sie mit der Umsetzung zu beginnen?\n3. Befindet sich Ihr Unternehmen in wirtschaftlichen Schwierigkeiten?`
  } catch {
    begruessung = `Willkommen zum Fördermittel-Check für **${body.firmenname}**! Basierend auf Ihren Angaben kommen ca. **${vorfilterCount} Förderprogramme** in Frage.\n\nUm die passenden Programme zu finden, habe ich ein paar Fragen:\n\n1. Haben Sie in den letzten 3 Jahren bereits Fördermittel erhalten?\n2. Wann planen Sie mit der Umsetzung zu beginnen?\n3. Befindet sich Ihr Unternehmen in wirtschaftlichen Schwierigkeiten?`
  }

  // Store session in KV (24h TTL)
  const session: CheckSession = {
    profileId,
    conversationId: null,
    formData: body as Record<string, unknown>,
    vorfilterCount,
    step: 2,
    createdAt: new Date().toISOString(),
  }
  await c.env.SESSIONS.put(`check:${sessionId}`, JSON.stringify(session), { expirationTtl: 86400 })

  return c.json({
    success: true,
    session_id: sessionId,
    vorfilter_treffer: vorfilterCount,
    begruessung,
  })
})

// ============================================
// Helper: Load session from KV
// ============================================
async function loadSession(sessionId: string, kv: KVNamespace): Promise<CheckSession | null> {
  const raw = await kv.get(`check:${sessionId}`)
  if (!raw) return null
  return JSON.parse(raw) as CheckSession
}

async function saveSession(sessionId: string, session: CheckSession, kv: KVNamespace): Promise<void> {
  await kv.put(`check:${sessionId}`, JSON.stringify(session), { expirationTtl: 86400 })
}

// ============================================
// Step 2: Chat interaction
// ============================================
check.post('/:sessionId/chat', async (c) => {
  const sessionId = c.req.param('sessionId')
  const session = await loadSession(sessionId, c.env.SESSIONS)
  if (!session) return c.json({ success: false, error: 'Session nicht gefunden oder abgelaufen' }, 404)

  const body = await c.req.json() as { nachricht?: string }
  if (!body.nachricht) return c.json({ success: false, error: 'Nachricht erforderlich' }, 400)

  // Load the profile
  const profile = await c.env.BAFA_DB.prepare(
    'SELECT * FROM foerdermittel_profile WHERE id = ?'
  ).bind(session.profileId).first()

  if (!profile) return c.json({ success: false, error: 'Profil nicht gefunden' }, 404)

  // Use processChat from service layer
  const result = await processChat(
    body.nachricht,
    profile as any,
    undefined,
    session.conversationId || undefined,
    'matchmaking',
    c.env.BAFA_DB,
    c.env.FOERDER_DB,
    c.env.AI,
  )

  // Save conversation ID back to session
  session.conversationId = result.conversationId
  await saveSession(sessionId, session, c.env.SESSIONS)

  // Check if the bot's response suggests moving to document phase
  const isDokumente = result.assistantMessage.toLowerCase().includes('dokument') ||
    result.assistantMessage.toLowerCase().includes('unterlagen') ||
    result.assistantMessage.toLowerCase().includes('hochladen')

  return c.json({
    success: true,
    nachricht: result.assistantMessage,
    status: isDokumente ? 'dokumente' : 'chat',
    extracted_data: {},
  })
})

// ============================================
// Step 3: Document upload
// ============================================
check.post('/:sessionId/docs', async (c) => {
  const sessionId = c.req.param('sessionId')
  const session = await loadSession(sessionId, c.env.SESSIONS)
  if (!session) return c.json({ success: false, error: 'Session nicht gefunden oder abgelaufen' }, 404)

  const formData = await c.req.formData()
  const file = formData.get('datei') as File | null
  const typ = formData.get('typ') as string || 'sonstiges'

  if (!file) return c.json({ success: false, error: 'Datei erforderlich' }, 400)
  if (file.size > 10 * 1024 * 1024) return c.json({ success: false, error: 'Datei zu groß (max 10 MB)' }, 400)

  // Upload to R2 via service
  const r2Key = `check/${sessionId}/${crypto.randomUUID()}-${file.name}`
  await c.env.REPORTS.put(r2Key, await file.arrayBuffer(), {
    customMetadata: { typ, originalName: file.name },
  })

  // AI extraction attempt
  let kiExtrakt: Record<string, string | number | boolean> = {}
  try {
    const textContent = await file.text()
    const truncated = textContent.slice(0, 3000)

    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'user',
        content: `Extrahiere die wichtigsten Informationen aus diesem ${typ}-Dokument als JSON-Objekt mit key-value Paaren (Deutsch). Nur die wichtigsten Fakten. Antwort NUR als JSON.

DOKUMENT:
${truncated}`,
      }],
      max_tokens: 500,
    }) as { response?: string }

    if (result.response) {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/)
      if (jsonMatch) kiExtrakt = JSON.parse(jsonMatch[0])
    }
  } catch {
    // AI extraction is best-effort
  }

  return c.json({
    success: true,
    dokument_id: r2Key,
    ki_extrakt: kiExtrakt,
  })
})

// ============================================
// Step 4: Run full analysis
// ============================================
check.post('/:sessionId/analyze', async (c) => {
  const sessionId = c.req.param('sessionId')
  const session = await loadSession(sessionId, c.env.SESSIONS)
  if (!session) return c.json({ success: false, error: 'Session nicht gefunden oder abgelaufen' }, 404)

  // Load profile
  const profile = await c.env.BAFA_DB.prepare(
    'SELECT * FROM foerdermittel_profile WHERE id = ?'
  ).bind(session.profileId).first()
  if (!profile) return c.json({ success: false, error: 'Profil nicht gefunden' }, 404)

  // Run AI matching
  const scoredMatches = await performMatching(
    profile as any,
    c.env.BAFA_DB,
    c.env.FOERDER_DB,
    c.env.AI,
  )

  // Save matches
  await saveMatches(profile as any, scoredMatches, c.env.BAFA_DB)

  // Build rich results for the frontend
  const topMatches = scoredMatches.slice(0, 10)
  const ergebnisse = []

  for (const match of topMatches) {
    const program = await getProgramById(match.programm_id, c.env.FOERDER_DB)
    if (!program) continue

    ergebnisse.push({
      programm: {
        id: program.id,
        titel: program.titel,
        foerderart: program.foerderart || '',
        foerdergebiet: program.foerdergebiet || '',
        url: program.url || undefined,
        kurztext: program.kurztext || undefined,
      },
      relevanz_score: match.match_score,
      begruendung: match.match_reasons.join('. '),
      max_foerdersumme: undefined,
      risiken: match.disqualifiers.length > 0 ? match.disqualifiers : undefined,
    })
  }

  // Generate summary
  let zusammenfassung: string
  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{
        role: 'user',
        content: `Fasse die Fördermittel-Analyse kurz zusammen (2-3 Sätze, Deutsch):

UNTERNEHMEN: ${profile.company_name}
TREFFER: ${ergebnisse.length} relevante Programme
TOP-PROGRAMME: ${ergebnisse.slice(0, 3).map(e => `${e.programm.titel} (Score: ${e.relevanz_score})`).join(', ')}

Nenne die Anzahl, die Top-Programme und eine grobe Einschätzung der Gesamtfördersumme.`,
      }],
      max_tokens: 300,
    }) as { response?: string }

    zusammenfassung = result.response || `Für ${profile.company_name} wurden ${ergebnisse.length} relevante Förderprogramme identifiziert.`
  } catch {
    zusammenfassung = `Für ${profile.company_name} wurden ${ergebnisse.length} relevante Förderprogramme identifiziert.`
  }

  // Update session
  session.step = 4
  await saveSession(sessionId, session, c.env.SESSIONS)

  return c.json({
    success: true,
    ergebnisse,
    zusammenfassung,
  })
})

// ============================================
// Step 5: Get action plan
// ============================================
check.get('/:sessionId/plan', async (c) => {
  const sessionId = c.req.param('sessionId')
  const session = await loadSession(sessionId, c.env.SESSIONS)
  if (!session) return c.json({ success: false, error: 'Session nicht gefunden oder abgelaufen' }, 404)

  // Load matches for this profile
  const matches = await getMatchesForProfile(session.profileId, c.env.BAFA_DB, c.env.FOERDER_DB)
  const topMatches = matches.filter(m => m.match_score >= 30).slice(0, 5)

  const aktionsplan = []

  for (const match of topMatches) {
    const program = match.programm
    if (!program) continue

    // Generate steps via AI
    let schritte: Array<{
      schritt: number
      aktion: string
      beschreibung?: string
      dokument_typ?: string
      status: string
      frist?: string
    }> = []

    try {
      const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{
          role: 'user',
          content: `Erstelle einen konkreten Aktionsplan (3-6 Schritte) für die Beantragung dieses Förderprogramms. Antworte NUR als JSON-Array.

PROGRAMM: ${program.titel}
ART: ${program.foerderart}

Format: [{"schritt": 1, "aktion": "...", "beschreibung": "...", "dokument_typ": "...", "status": "offen", "frist": "..."}]`,
        }],
        max_tokens: 800,
      }) as { response?: string }

      if (result.response) {
        const jsonMatch = result.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) schritte = JSON.parse(jsonMatch[0])
      }
    } catch {
      schritte = [
        { schritt: 1, aktion: 'Förderfähigkeit prüfen', beschreibung: 'Alle Voraussetzungen prüfen', status: 'offen' },
        { schritt: 2, aktion: 'Unterlagen zusammenstellen', beschreibung: 'Benötigte Dokumente vorbereiten', status: 'offen' },
        { schritt: 3, aktion: 'Antrag einreichen', beschreibung: 'Online-Antrag oder Papierformular', status: 'offen' },
      ]
    }

    aktionsplan.push({
      programm: {
        id: program.id,
        titel: program.titel,
        foerderart: program.foerderart || '',
      },
      relevanz_score: match.match_score,
      max_foerdersumme: undefined,
      schritte,
    })
  }

  // Update session
  session.step = 5
  await saveSession(sessionId, session, c.env.SESSIONS)

  return c.json({
    success: true,
    aktionsplan,
  })
})

export { check }
