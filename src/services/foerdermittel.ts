import { z } from 'zod'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

// Workers AI type — use `any` for model name since @cloudflare/workers-types
// may not include all available models in its AiModels interface.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ai = { run(model: any, options: any): Promise<any> }
import type {
  FoerderprogrammRow,
  FoerdermittelProfileRow,
  FoerdermittelMatchRow,
  FoerdermittelCaseRow,
  FoerdermittelCaseStepRow,
  FoerdermittelFunnelTemplateRow,
  FoerdermittelDokumentRow,
  FoerdermittelConversationRow,
  AuthUser,
} from '../types'

// ============================================
// Catalog Schemas & Types
// ============================================

export const katalogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  foerderart: z.string().optional(),
  foerderbereich: z.string().optional(),
  foerdergebiet: z.string().optional(),
  foerderberechtigte: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['titel', 'foerderart', 'foerdergebiet']).default('titel'),
})

export type KatalogQuery = z.infer<typeof katalogQuerySchema>

export interface KatalogResult {
  items: (FoerderprogrammRow & { total_count?: number })[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================
// Catalog: List & Search programs
// ============================================

export async function searchKatalog(
  query: KatalogQuery,
  foerderDb: D1Database
): Promise<KatalogResult> {
  const { page, limit, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, search, sort } = query
  const offset = (page - 1) * limit

  // Build dynamic WHERE clauses
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (foerderart) {
    conditions.push('foerderart = ?')
    params.push(foerderart)
  }
  if (foerderbereich) {
    conditions.push('foerderbereich LIKE ?')
    params.push(`%${foerderbereich}%`)
  }
  if (foerdergebiet) {
    conditions.push('foerdergebiet LIKE ?')
    params.push(`%${foerdergebiet}%`)
  }
  if (foerderberechtigte) {
    conditions.push('foerderberechtigte LIKE ?')
    params.push(`%${foerderberechtigte}%`)
  }
  if (search) {
    conditions.push('(titel LIKE ? OR kurztext LIKE ?)')
    params.push(`%${search}%`, `%${search}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Fetch page with total count in single query using window function
  const dataSql = `SELECT id, titel, typ, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext,
    COUNT(*) OVER() as total_count
    FROM foerderprogramme ${whereClause}
    ORDER BY ${sort} ASC
    LIMIT ? OFFSET ?`
  const dataResult = await foerderDb.prepare(dataSql).bind(...params, limit, offset).all<FoerderprogrammRow & { total_count: number }>()
  const total = (dataResult.results && dataResult.results.length > 0) ? (dataResult.results[0]?.total_count ?? 0) : 0

  return {
    items: dataResult.results ?? [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// ============================================
// Catalog: Get filter options
// ============================================

export interface FilterOptions {
  foerderart: unknown[]
  foerderbereich: unknown[]
  foerdergebiet: unknown[]
  foerderberechtigte: unknown[]
}

export async function getFilterOptions(foerderDb: D1Database): Promise<FilterOptions> {
  const [artResult, bereichResult, gebietResult, berechtigteResult] = await foerderDb.batch([
    foerderDb.prepare('SELECT DISTINCT foerderart FROM foerderprogramme WHERE foerderart IS NOT NULL ORDER BY foerderart'),
    foerderDb.prepare('SELECT DISTINCT foerderbereich FROM foerderprogramme WHERE foerderbereich IS NOT NULL ORDER BY foerderbereich'),
    foerderDb.prepare('SELECT DISTINCT foerdergebiet FROM foerderprogramme WHERE foerdergebiet IS NOT NULL ORDER BY foerdergebiet'),
    foerderDb.prepare('SELECT DISTINCT foerderberechtigte FROM foerderprogramme WHERE foerderberechtigte IS NOT NULL ORDER BY foerderberechtigte'),
  ])

  return {
    foerderart: (artResult?.results ?? []).map((r) => (r as Record<string, unknown>).foerderart),
    foerderbereich: (bereichResult?.results ?? []).map((r) => (r as Record<string, unknown>).foerderbereich),
    foerdergebiet: (gebietResult?.results ?? []).map((r) => (r as Record<string, unknown>).foerdergebiet),
    foerderberechtigte: (berechtigteResult?.results ?? []).map((r) => (r as Record<string, unknown>).foerderberechtigte),
  }
}

// ============================================
// Catalog: Get single program
// ============================================

export async function getProgramById(id: number, foerderDb: D1Database): Promise<FoerderprogrammRow | null> {
  const program = await foerderDb.prepare('SELECT * FROM foerderprogramme WHERE id = ?')
    .bind(id).first<FoerderprogrammRow>()
  return program || null
}

// ============================================
// Profile: Business profile for matchmaking
// ============================================

export const profileSchema = z.object({
  company_name: z.string().min(1, 'Firmenname erforderlich'),
  branche: z.string().optional(),
  standort: z.string().optional(),
  rechtsform: z.string().optional(),
  mitarbeiter_anzahl: z.number().int().min(0).optional(),
  jahresumsatz: z.number().min(0).optional(),
  gruendungsjahr: z.number().int().min(1800).max(2030).optional(),
  beschreibung: z.string().max(5000).optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>

export async function getUserProfile(userId: string, bafaDb: D1Database): Promise<FoerdermittelProfileRow | null> {
  const profile = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_profile WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(userId).first<FoerdermittelProfileRow>()
  return profile || null
}

export async function saveOrUpdateProfile(
  userId: string,
  data: ProfileInput,
  bafaDb: D1Database
): Promise<{ id: string }> {
  // Check if profile exists
  const existing = await bafaDb.prepare(
    'SELECT id FROM foerdermittel_profile WHERE user_id = ? LIMIT 1'
  ).bind(userId).first<{ id: string }>()

  if (existing) {
    // Update
    await bafaDb.prepare(
      `UPDATE foerdermittel_profile SET
        company_name = ?, branche = ?, standort = ?, rechtsform = ?,
        mitarbeiter_anzahl = ?, jahresumsatz = ?, gruendungsjahr = ?,
        beschreibung = ?, updated_at = datetime('now')
      WHERE id = ?`
    ).bind(
      data.company_name, data.branche ?? null, data.standort ?? null, data.rechtsform ?? null,
      data.mitarbeiter_anzahl ?? null, data.jahresumsatz ?? null, data.gruendungsjahr ?? null,
      data.beschreibung ?? null, existing.id
    ).run()

    return { id: existing.id }
  }

  // Create
  const id = crypto.randomUUID()
  await bafaDb.prepare(
    `INSERT INTO foerdermittel_profile
      (id, user_id, company_name, branche, standort, rechtsform, mitarbeiter_anzahl, jahresumsatz, gruendungsjahr, beschreibung)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, userId,
    data.company_name, data.branche ?? null, data.standort ?? null, data.rechtsform ?? null,
    data.mitarbeiter_anzahl ?? null, data.jahresumsatz ?? null, data.gruendungsjahr ?? null,
    data.beschreibung ?? null
  ).run()

  return { id }
}

// ============================================
// Matchmaking: AI-powered program matching
// ============================================

export interface ScoredMatch {
  programm_id: number
  match_score: number
  match_reasons: string[]
  disqualifiers: string[]
}

export async function performMatching(
  profile: FoerdermittelProfileRow,
  bafaDb: D1Database,
  foerderDb: D1Database,
  ai: Ai
): Promise<ScoredMatch[]> {
  // Layer 1: Rule-based pre-filter
  const filterConditions: string[] = []
  const filterParams: string[] = []

  if (profile.standort) {
    filterConditions.push('(foerdergebiet LIKE ? OR foerdergebiet LIKE ?)')
    filterParams.push(`%${profile.standort}%`, '%Bundesweit%')
  }
  if (profile.branche) {
    filterConditions.push('foerderbereich LIKE ?')
    filterParams.push(`%${profile.branche}%`)
  }

  const whereClause = filterConditions.length > 0 ? `WHERE ${filterConditions.join(' AND ')}` : ''
  const candidateSql = `SELECT id, titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, volltext, rechtliche_voraussetzungen
    FROM foerderprogramme ${whereClause} LIMIT 100`
  const candidates = await foerderDb.prepare(candidateSql).bind(...filterParams).all<FoerderprogrammRow>()

  if (!candidates.results || candidates.results.length === 0) {
    return []
  }

  // Layer 2: AI scoring (batch in chunks of 10)
  const profileSummary = `Firma: ${profile.company_name}, Branche: ${profile.branche || 'k.A.'}, Standort: ${profile.standort || 'k.A.'}, Rechtsform: ${profile.rechtsform || 'k.A.'}, Mitarbeiter: ${profile.mitarbeiter_anzahl || 'k.A.'}, Jahresumsatz: ${profile.jahresumsatz || 'k.A.'}, Gründungsjahr: ${profile.gruendungsjahr || 'k.A.'}, Beschreibung: ${profile.beschreibung || 'k.A.'}`

  const scoredMatches: ScoredMatch[] = []

  const chunks = []
  for (let i = 0; i < candidates.results.length; i += 10) {
    chunks.push(candidates.results.slice(i, i + 10))
  }

  for (const chunk of chunks) {
    const programList = chunk.map((p, idx) =>
      `[${idx}] ${p.titel} | Art: ${p.foerderart} | Berechtigte: ${p.foerderberechtigte} | Voraussetzungen: ${(p.rechtliche_voraussetzungen || '').slice(0, 500)}`
    ).join('\n\n')

    const prompt = `Du bist ein Experte für deutsche Förderprogramme. Bewerte die folgenden Programme für dieses Unternehmen.

UNTERNEHMEN:
${profileSummary}

PROGRAMME:
${programList}

Antworte AUSSCHLIESSLICH mit einem JSON-Array. Für jedes Programm:
[{"index": 0, "score": 0-100, "reasons": ["Grund1", "Grund2"], "disqualifiers": ["Blocker1"]}]

Bewerte score=0 wenn das Unternehmen eindeutig nicht berechtigt ist. Höhere Scores für bessere Passung.`

    try {
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      }) as { response?: string }

      if (result.response) {
        // Extract JSON from response
        const jsonMatch = result.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]) as Array<{ index: number; score: number; reasons: string[]; disqualifiers: string[] }>
          for (const s of scores) {
            const program = chunk[s.index]
            if (program && s.score > 0) {
              scoredMatches.push({
                programm_id: program.id,
                match_score: Math.min(100, Math.max(0, s.score)),
                match_reasons: s.reasons || [],
                disqualifiers: s.disqualifiers || [],
              })
            }
          }
        }
      }
    } catch {
      // If AI fails for a chunk, skip it — partial results are acceptable
    }
  }

  // Sort by score descending
  scoredMatches.sort((a, b) => b.match_score - a.match_score)

  return scoredMatches
}

export async function saveMatches(
  profile: FoerdermittelProfileRow,
  matches: ScoredMatch[],
  bafaDb: D1Database
): Promise<void> {
  // Delete old matches for this profile
  await bafaDb.prepare('DELETE FROM foerdermittel_matches WHERE profile_id = ?').bind(profile.id).run()

  // Save top 50 matches
  const topMatches = matches.slice(0, 50)
  for (const match of topMatches) {
    const matchId = crypto.randomUUID()
    await bafaDb.prepare(
      `INSERT INTO foerdermittel_matches (id, profile_id, programm_id, match_score, match_reasons, disqualifiers, status)
       VALUES (?, ?, ?, ?, ?, ?, 'matched')`
    ).bind(
      matchId, profile.id, match.programm_id, match.match_score,
      JSON.stringify(match.match_reasons), JSON.stringify(match.disqualifiers)
    ).run()
  }
}

export async function getMatchesForProfile(
  profileId: string,
  bafaDb: D1Database,
  foerderDb: D1Database
): Promise<Array<FoerdermittelMatchRow & { match_reasons: string[]; disqualifiers: string[]; programm: FoerderprogrammRow | null }>> {
  const matches = await bafaDb.prepare(
    `SELECT * FROM foerdermittel_matches WHERE profile_id = ? AND status != 'dismissed'
     ORDER BY match_score DESC`
  ).bind(profileId).all<FoerdermittelMatchRow>()

  // Enrich with program titles
  const enriched = []
  for (const match of matches.results ?? []) {
    const program = await foerderDb.prepare(
      'SELECT id, titel, foerderart, foerdergebiet, kurztext FROM foerderprogramme WHERE id = ?'
    ).bind(match.programm_id).first<FoerderprogrammRow>()

    enriched.push({
      ...match,
      match_reasons: JSON.parse(match.match_reasons || '[]'),
      disqualifiers: JSON.parse(match.disqualifiers || '[]'),
      programm: program || null,
    })
  }

  return enriched
}

// ============================================
// Cases: Workflow engine
// ============================================

interface FunnelPhase {
  id: string
  title: string
  steps: Array<{ title: string; description: string; type: string; required: boolean }>
}

export async function getOrCreateFunnelTemplate(
  programId: number,
  program: FoerderprogrammRow,
  bafaDb: D1Database,
  ai: Ai
): Promise<FoerdermittelFunnelTemplateRow> {
  // Check for existing funnel template
  let template = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_funnel_templates WHERE programm_id = ?'
  ).bind(programId).first<FoerdermittelFunnelTemplateRow>()

  if (template) {
    return template
  }

  // Generate funnel template via AI
  const funnelPrompt = `Du bist ein Experte für deutsche Fördermittelanträge. Erstelle einen strukturierten Antragsprozess für folgendes Förderprogramm:

PROGRAMM: ${program.titel}
ART: ${program.foerderart}
VORAUSSETZUNGEN: ${program.rechtliche_voraussetzungen || 'Keine angegeben'}
VOLLTEXT: ${(program.volltext || '').slice(0, 2000)}

Erstelle ein JSON mit Phasen und Schritten. Jede Phase hat steps mit Typ:
- document_upload: Dokument hochladen
- form_fill: Formular ausfüllen
- ai_review: KI-Prüfung
- consultant_action: Berater-Aktion
- approval: Genehmigung

Format:
{
  "phases": [
    {
      "id": "eligibility_check",
      "title": "Eignungsprüfung",
      "steps": [
        {"title": "...", "description": "...", "type": "form_fill", "required": true}
      ]
    }
  ]
}

Verwende diese Phase-IDs: eligibility_check, document_collection, application_draft, review, submission, follow_up.
Antworte NUR mit dem JSON.`

  let phasesJson = '[]'
  let generatedBy = 'fallback'

  try {
    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: funnelPrompt }],
      max_tokens: 3000,
    }) as { response?: string }

    if (result.response) {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        phasesJson = JSON.stringify(parsed.phases || [])
        generatedBy = '@cf/meta/llama-3.1-8b-instruct'
      }
    }
  } catch {
    // Fallback: create with default phases
    phasesJson = JSON.stringify([
      { id: 'eligibility_check', title: 'Eignungsprüfung', steps: [
        { title: 'Unternehmensform prüfen', description: 'Prüfen Sie ob Ihre Unternehmensform berechtigt ist', type: 'form_fill', required: true },
        { title: 'KI-Eignungsbewertung', description: 'Automatische Prüfung der Grundvoraussetzungen', type: 'ai_review', required: true },
      ]},
      { id: 'document_collection', title: 'Dokumentensammlung', steps: [
        { title: 'Handelsregisterauszug', description: 'Aktueller Handelsregisterauszug hochladen', type: 'document_upload', required: true },
        { title: 'Jahresabschluss', description: 'Jahresabschluss der letzten 2 Jahre', type: 'document_upload', required: true },
      ]},
      { id: 'application_draft', title: 'Antragsentwurf', steps: [
        { title: 'KI-Antragsgenerierung', description: 'KI erstellt einen Antragsentwurf', type: 'ai_review', required: true },
        { title: 'Berater-Review', description: 'Ihr Berater prüft den Entwurf', type: 'consultant_action', required: true },
      ]},
      { id: 'review', title: 'Prüfung', steps: [
        { title: 'Finale Prüfung', description: 'Letzte Überprüfung aller Unterlagen', type: 'consultant_action', required: true },
        { title: 'Freigabe', description: 'Bestätigen Sie die Einreichung', type: 'approval', required: true },
      ]},
      { id: 'submission', title: 'Einreichung', steps: [
        { title: 'Antragspaket erstellen', description: 'Alle Unterlagen zusammenstellen', type: 'ai_review', required: true },
        { title: 'Einreichung bestätigen', description: 'Antrag als eingereicht markieren', type: 'approval', required: true },
      ]},
      { id: 'follow_up', title: 'Nachverfolgung', steps: [
        { title: 'Bescheid abwarten', description: 'Bearbeitungsstatus verfolgen', type: 'form_fill', required: false },
      ]},
    ])
  }

  const templateId = crypto.randomUUID()
  await bafaDb.prepare(
    `INSERT INTO foerdermittel_funnel_templates (id, programm_id, phases, generated_by)
     VALUES (?, ?, ?, ?)`
  ).bind(templateId, programId, phasesJson, generatedBy).run()

  template = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_funnel_templates WHERE id = ?'
  ).bind(templateId).first<FoerdermittelFunnelTemplateRow>()

  return template!
}

export async function createCase(
  profileId: string,
  programId: number,
  matchId: string | null,
  template: FoerdermittelFunnelTemplateRow,
  bafaDb: D1Database
): Promise<{ caseId: string }> {
  const caseId = crypto.randomUUID()
  await bafaDb.prepare(
    `INSERT INTO foerdermittel_cases (id, match_id, profile_id, programm_id, phase, status)
     VALUES (?, ?, ?, ?, 'eligibility_check', 'active')`
  ).bind(caseId, matchId ?? null, profileId, programId).run()

  // Copy template steps into case_steps
  const phases = JSON.parse(template.phases) as FunnelPhase[]

  let stepOrder = 0
  for (const phase of phases) {
    for (const step of phase.steps || []) {
      stepOrder++
      await bafaDb.prepare(
        `INSERT INTO foerdermittel_case_steps (id, case_id, phase, step_order, title, description, step_type, required, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      ).bind(
        crypto.randomUUID(), caseId, phase.id, stepOrder,
        step.title, step.description, step.type, step.required ? 1 : 0
      ).run()
    }
  }

  // Update match status if applicable
  if (matchId) {
    await bafaDb.prepare("UPDATE foerdermittel_matches SET status = 'started' WHERE id = ?")
      .bind(matchId).run()
  }

  return { caseId }
}

export async function getCasesForProfile(
  profileId: string,
  bafaDb: D1Database,
  foerderDb: D1Database
): Promise<Array<FoerdermittelCaseRow & { programm: FoerderprogrammRow | null; steps_total: number; steps_completed: number }>> {
  const cases = await bafaDb.prepare(
    `SELECT * FROM foerdermittel_cases WHERE profile_id = ? ORDER BY created_at DESC`
  ).bind(profileId).all<FoerdermittelCaseRow>()

  // Enrich with program info and step counts
  const enriched = []
  for (const cs of cases.results ?? []) {
    const program = await foerderDb.prepare(
      'SELECT id, titel, foerderart FROM foerderprogramme WHERE id = ?'
    ).bind(cs.programm_id).first<FoerderprogrammRow>()

    const stepCounts = await bafaDb.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM foerdermittel_case_steps WHERE case_id = ?`
    ).bind(cs.id).first<{ total: number; completed: number }>()

    enriched.push({
      ...cs,
      programm: program || null,
      steps_total: stepCounts?.total ?? 0,
      steps_completed: stepCounts?.completed ?? 0,
    })
  }

  return enriched
}

export async function getCaseWithSteps(
  caseId: string,
  profileId: string,
  bafaDb: D1Database,
  foerderDb: D1Database
): Promise<{ case: FoerdermittelCaseRow; steps: FoerdermittelCaseStepRow[]; programm: FoerderprogrammRow | null } | null> {
  const cs = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?'
  ).bind(caseId, profileId).first<FoerdermittelCaseRow>()

  if (!cs) return null

  const steps = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_case_steps WHERE case_id = ? ORDER BY step_order'
  ).bind(caseId).all<FoerdermittelCaseStepRow>()

  const program = await foerderDb.prepare('SELECT * FROM foerderprogramme WHERE id = ?')
    .bind(cs.programm_id).first<FoerderprogrammRow>()

  return {
    case: cs,
    steps: steps.results ?? [],
    programm: program || null,
  }
}

export async function updateCaseStep(
  caseId: string,
  stepId: string,
  status: string,
  resultData: Record<string, unknown> | null,
  bafaDb: D1Database
): Promise<void> {
  const resultDataStr = resultData ? JSON.stringify(resultData) : null

  await bafaDb.prepare(
    `UPDATE foerdermittel_case_steps SET
      status = ?, result_data = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE completed_at END
    WHERE id = ? AND case_id = ?`
  ).bind(status, resultDataStr, status, stepId, caseId).run()

  // Check if all required steps in current phase are completed → advance phase
  const cs = await bafaDb.prepare(
    'SELECT id, phase FROM foerdermittel_cases WHERE id = ?'
  ).bind(caseId).first<{ id: string; phase: string }>()

  if (!cs) return

  const phaseSteps = await bafaDb.prepare(
    `SELECT required, status FROM foerdermittel_case_steps WHERE case_id = ? AND phase = ?`
  ).bind(caseId, cs.phase).all<{ required: number; status: string }>()

  const allRequiredDone = (phaseSteps.results ?? []).every(
    s => s.required === 0 || s.status === 'completed'
  )

  if (allRequiredDone) {
    const phaseOrder = ['eligibility_check', 'document_collection', 'application_draft', 'review', 'submission', 'follow_up']
    const currentIdx = phaseOrder.indexOf(cs.phase)
    if (currentIdx < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIdx + 1]
      await bafaDb.prepare(
        "UPDATE foerdermittel_cases SET phase = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(nextPhase, caseId).run()
    } else {
      // Final phase completed
      await bafaDb.prepare(
        "UPDATE foerdermittel_cases SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
      ).bind(caseId).run()
    }
  }
}

// ============================================
// AI Chat: Conversation with funnel agent
// ============================================

export const chatSchema = z.object({
  message: z.string().min(1).max(5000),
  case_id: z.string().optional(),
  context: z.enum(['matchmaking', 'funnel_guidance', 'document_help']).default('funnel_guidance'),
  conversation_id: z.string().optional(),
})

export type ChatInput = z.infer<typeof chatSchema>

interface ConversationMessage {
  role: string
  content: string
  timestamp: string
}

export async function processChat(
  message: string,
  profile: FoerdermittelProfileRow,
  caseId: string | undefined,
  conversationId: string | undefined,
  context: string,
  bafaDb: D1Database,
  foerderDb: D1Database,
  ai: Ai
): Promise<{ conversationId: string; assistantMessage: string }> {
  // Load or create conversation
  let conversation: FoerdermittelConversationRow | null = null
  let messages: ConversationMessage[] = []

  if (conversationId) {
    conversation = await bafaDb.prepare(
      'SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?'
    ).bind(conversationId, profile.id).first<FoerdermittelConversationRow>()
    if (conversation) messages = JSON.parse(conversation.messages)
  }

  // Build system context
  let systemPrompt = `Du bist ein Experte für deutsche Fördermittel und unterstützt Unternehmen bei der Antragstellung. Antworte auf Deutsch, professionell und hilfreich. Beziehe dich auf konkrete Förderprogramme und rechtliche Anforderungen.

UNTERNEHMEN: ${profile.company_name}, Branche: ${profile.branche || 'k.A.'}, Standort: ${profile.standort || 'k.A.'}, Rechtsform: ${profile.rechtsform || 'k.A.'}`

  // Add case context if available
  if (caseId) {
    const cs = await bafaDb.prepare(
      'SELECT * FROM foerdermittel_cases WHERE id = ? AND profile_id = ?'
    ).bind(caseId, profile.id).first<FoerdermittelCaseRow>()

    if (cs) {
      const program = await foerderDb.prepare('SELECT titel, volltext, rechtliche_voraussetzungen FROM foerderprogramme WHERE id = ?')
        .bind(cs.programm_id).first<FoerderprogrammRow>()

      if (program) {
        systemPrompt += `\n\nAKTUELLES FÖRDERPROGRAMM: ${program.titel}
PHASE: ${cs.phase}
VORAUSSETZUNGEN: ${(program.rechtliche_voraussetzungen || '').slice(0, 2000)}`
      }
    }
  }

  // Add user message
  const timestamp = new Date().toISOString()
  messages.push({ role: 'user', content: message, timestamp })

  // Build AI messages (keep last 20 messages for context)
  const aiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-20).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: aiMessages,
    max_tokens: 1500,
  }) as { response?: string }

  const assistantMessage = result.response || 'Entschuldigung, ich konnte keine Antwort generieren.'
  messages.push({ role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() })

  // Save conversation
  if (conversation) {
    await bafaDb.prepare(
      "UPDATE foerdermittel_conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(JSON.stringify(messages), conversation.id).run()
  } else {
    const convId = conversationId || crypto.randomUUID()
    await bafaDb.prepare(
      `INSERT INTO foerdermittel_conversations (id, case_id, profile_id, context, messages)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(convId, caseId ?? null, profile.id, context, JSON.stringify(messages)).run()
    conversation = { id: convId } as FoerdermittelConversationRow
  }

  return {
    conversationId: conversation!.id,
    assistantMessage,
  }
}

export async function getConversation(
  conversationId: string,
  profileId: string,
  bafaDb: D1Database
): Promise<FoerdermittelConversationRow & { messages: ConversationMessage[] } | null> {
  const conversation = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_conversations WHERE id = ? AND profile_id = ?'
  ).bind(conversationId, profileId).first<FoerdermittelConversationRow>()

  if (!conversation) return null

  return {
    ...conversation,
    messages: JSON.parse(conversation.messages),
  }
}

// ============================================
// Documents: Upload & tracking
// ============================================

export async function uploadDocument(
  caseId: string,
  file: File,
  stepId: string | null,
  dokumentTyp: string,
  r2: R2Bucket,
  bafaDb: D1Database
): Promise<{ id: string; r2_key: string }> {
  // Upload to R2
  const docId = crypto.randomUUID()
  const r2Key = `foerdermittel/${caseId}/${docId}-${file.name}`
  await r2.put(r2Key, await file.arrayBuffer(), {
    customMetadata: { caseId, dokumentTyp, originalName: file.name },
  })

  // Save metadata
  await bafaDb.prepare(
    `INSERT INTO foerdermittel_dokumente (id, case_id, step_id, dokument_typ, dateiname, dateityp, dateigroesse, r2_key, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`
  ).bind(docId, caseId, stepId ?? null, dokumentTyp, file.name, file.type, file.size, r2Key).run()

  // If linked to a step, mark step as in_progress
  if (stepId) {
    await bafaDb.prepare(
      "UPDATE foerdermittel_case_steps SET status = 'in_progress' WHERE id = ? AND case_id = ?"
    ).bind(stepId, caseId).run()
  }

  return { id: docId, r2_key: r2Key }
}

export async function getDocumentsForCase(
  caseId: string,
  bafaDb: D1Database
): Promise<FoerdermittelDokumentRow[]> {
  const docs = await bafaDb.prepare(
    'SELECT * FROM foerdermittel_dokumente WHERE case_id = ? ORDER BY uploaded_at DESC'
  ).bind(caseId).all<FoerdermittelDokumentRow>()

  return docs.results ?? []
}

// ============================================
// Notifications
// ============================================

export async function getNotifications(userId: string, bafaDb: D1Database): Promise<{ notifications: unknown[]; unreadCount: number }> {
  const notifications = await bafaDb.prepare(
    `SELECT * FROM foerdermittel_benachrichtigungen
     WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(userId).all()

  const unreadCount = await bafaDb.prepare(
    'SELECT COUNT(*) as count FROM foerdermittel_benachrichtigungen WHERE user_id = ? AND gelesen = 0'
  ).bind(userId).first<{ count: number }>()

  return {
    notifications: notifications.results ?? [],
    unreadCount: unreadCount?.count ?? 0,
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string, bafaDb: D1Database): Promise<void> {
  await bafaDb.prepare(
    'UPDATE foerdermittel_benachrichtigungen SET gelesen = 1 WHERE id = ? AND user_id = ?'
  ).bind(notificationId, userId).run()
}
