import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { requireAuth } from '../middleware/auth'
import {
  katalogQuerySchema,
  searchKatalog,
  getFilterOptions,
  getProgramById,
  profileSchema,
  getUserProfile,
  saveOrUpdateProfile,
  performMatching,
  saveMatches,
  getMatchesForProfile,
  getOrCreateFunnelTemplate,
  createCase,
  getCasesForProfile,
  getCaseWithSteps,
  updateCaseStep,
  chatSchema,
  processChat,
  getConversation,
  uploadDocument,
  getDocumentsForCase,
  getNotifications,
  markNotificationAsRead,
} from '../services/foerdermittel'

const foerdermittel = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================
// Catalog: List & Search programs
// ============================================

foerdermittel.get('/katalog', async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = katalogQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Ungültige Parameter', details: parsed.error.issues }, 400)
  }

  const result = await searchKatalog(parsed.data, c.env.FOERDER_DB)

  return c.json({
    success: true,
    data: result,
  })
})

// ============================================
// Catalog: Get filter options (distinct values)
// MUST be before /katalog/:id to avoid param catching "filters"
// ============================================

foerdermittel.get('/katalog/filters', async (c) => {
  const filters = await getFilterOptions(c.env.FOERDER_DB)

  return c.json({
    success: true,
    data: filters,
  })
})

// ============================================
// Catalog: Get single program detail
// ============================================

foerdermittel.get('/katalog/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ success: false, error: 'Ungültige Programm-ID' }, 400)

  const program = await getProgramById(id, c.env.FOERDER_DB)
  if (!program) return c.json({ success: false, error: 'Programm nicht gefunden' }, 404)

  return c.json({ success: true, data: program })
})

// ============================================
// Profile: Business profile for matchmaking
// ============================================

foerdermittel.get('/profile', requireAuth, async (c) => {
  const user = c.get('user')
  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  return c.json({ success: true, data: profile })
})

foerdermittel.post('/profile', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues }, 400)
  }

  const result = await saveOrUpdateProfile(user.id, parsed.data, c.env.BAFA_DB)
  return c.json({ success: true, data: result }, 201)
})

// ============================================
// Matchmaking: AI-powered program matching
// ============================================

foerdermittel.post('/match', requireAuth, async (c) => {
  const user = c.get('user')
  const profile = await getUserProfile(user.id, c.env.BAFA_DB)

  if (!profile) {
    return c.json({ success: false, error: 'Bitte erstellen Sie zuerst ein Unternehmensprofil' }, 400)
  }

  const scoredMatches = await performMatching(profile, c.env.BAFA_DB, c.env.FOERDER_DB, c.env.AI)
  await saveMatches(profile, scoredMatches, c.env.BAFA_DB)

  const topMatches = scoredMatches.slice(0, 50)
  return c.json({
    success: true,
    data: {
      matches: topMatches,
      total: topMatches.length,
    },
  })
})

// Get saved matches
foerdermittel.get('/matches', requireAuth, async (c) => {
  const user = c.get('user')
  const profile = await getUserProfile(user.id, c.env.BAFA_DB)

  if (!profile) return c.json({ success: true, data: { matches: [] } })

  const matches = await getMatchesForProfile(profile.id, c.env.BAFA_DB, c.env.FOERDER_DB)
  return c.json({ success: true, data: { matches } })
})

// ============================================
// Cases: Workflow engine
// ============================================

foerdermittel.post('/cases', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json() as { match_id?: string; programm_id: number }
  if (!body.programm_id) return c.json({ success: false, error: 'programm_id erforderlich' }, 400)

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Profil erforderlich' }, 400)

  const program = await getProgramById(body.programm_id, c.env.FOERDER_DB)
  if (!program) return c.json({ success: false, error: 'Programm nicht gefunden' }, 404)

  const template = await getOrCreateFunnelTemplate(body.programm_id, program, c.env.BAFA_DB, c.env.AI)
  const result = await createCase(profile.id, body.programm_id, body.match_id ?? null, template, c.env.BAFA_DB)

  return c.json({ success: true, data: result }, 201)
})

// List user's cases
foerdermittel.get('/cases', requireAuth, async (c) => {
  const user = c.get('user')
  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: true, data: { cases: [] } })

  const cases = await getCasesForProfile(profile.id, c.env.BAFA_DB, c.env.FOERDER_DB)
  return c.json({ success: true, data: { cases } })
})

// Get single case with all steps
foerdermittel.get('/cases/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const caseId = c.req.param('id')

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Nicht autorisiert' }, 403)

  const caseData = await getCaseWithSteps(caseId, profile.id, c.env.BAFA_DB, c.env.FOERDER_DB)
  if (!caseData) return c.json({ success: false, error: 'Fall nicht gefunden' }, 404)

  return c.json({
    success: true,
    data: {
      ...caseData.case,
      steps: caseData.steps,
      programm: caseData.programm,
    },
  })
})

// Complete a step
foerdermittel.patch('/cases/:caseId/steps/:stepId', requireAuth, async (c) => {
  const user = c.get('user')
  const { caseId, stepId } = c.req.param()
  const body = await c.req.json() as { status?: string; result_data?: Record<string, unknown> }

  // Verify ownership
  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Nicht autorisiert' }, 403)

  const cs = await c.env.BAFA_DB.prepare(
    'SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?'
  ).bind(caseId, profile.id).first<{ id: string }>()
  if (!cs) return c.json({ success: false, error: 'Fall nicht gefunden' }, 404)

  const newStatus = body.status || 'completed'
  await updateCaseStep(caseId, stepId, newStatus, body.result_data ?? null, c.env.BAFA_DB)

  return c.json({ success: true })
})

// ============================================
// AI Chat: Conversation with funnel agent
// ============================================

foerdermittel.post('/chat', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues }, 400)
  const { message, case_id, context, conversation_id } = parsed.data

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Profil erforderlich' }, 400)

  const result = await processChat(message, profile, case_id, conversation_id, context, c.env.BAFA_DB, c.env.FOERDER_DB, c.env.AI)

  return c.json({
    success: true,
    data: {
      conversation_id: result.conversationId,
      message: result.assistantMessage,
    },
  })
})

// Get conversation history
foerdermittel.get('/chat/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const conversationId = c.req.param('id')

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Nicht autorisiert' }, 403)

  const conversation = await getConversation(conversationId, profile.id, c.env.BAFA_DB)
  if (!conversation) return c.json({ success: false, error: 'Konversation nicht gefunden' }, 404)

  return c.json({
    success: true,
    data: conversation,
  })
})

// ============================================
// Documents: Upload & tracking
// ============================================

foerdermittel.post('/cases/:caseId/dokumente', requireAuth, async (c) => {
  const user = c.get('user')
  const caseId = c.req.param('caseId')

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Nicht autorisiert' }, 403)

  const cs = await c.env.BAFA_DB.prepare(
    'SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?'
  ).bind(caseId, profile.id).first<{ id: string }>()
  if (!cs) return c.json({ success: false, error: 'Fall nicht gefunden' }, 404)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const stepId = formData.get('step_id') as string | null
  const dokumentTyp = formData.get('dokument_typ') as string || 'custom'

  if (!file) return c.json({ success: false, error: 'Datei erforderlich' }, 400)

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ success: false, error: 'Datei zu groß (max 10 MB)' }, 400)
  }

  const result = await uploadDocument(caseId, file, stepId, dokumentTyp, c.env.REPORTS, c.env.BAFA_DB)
  return c.json({ success: true, data: result }, 201)
})

// List documents for a case
foerdermittel.get('/cases/:caseId/dokumente', requireAuth, async (c) => {
  const user = c.get('user')
  const caseId = c.req.param('caseId')

  const profile = await getUserProfile(user.id, c.env.BAFA_DB)
  if (!profile) return c.json({ success: false, error: 'Nicht autorisiert' }, 403)

  const cs = await c.env.BAFA_DB.prepare(
    'SELECT id FROM foerdermittel_cases WHERE id = ? AND profile_id = ?'
  ).bind(caseId, profile.id).first<{ id: string }>()
  if (!cs) return c.json({ success: false, error: 'Fall nicht gefunden' }, 404)

  const docs = await getDocumentsForCase(caseId, c.env.BAFA_DB)
  return c.json({ success: true, data: { dokumente: docs } })
})

// ============================================
// Notifications
// ============================================

foerdermittel.get('/notifications', requireAuth, async (c) => {
  const user = c.get('user')
  const result = await getNotifications(user.id, c.env.BAFA_DB)

  return c.json({
    success: true,
    data: {
      notifications: result.notifications,
      unread_count: result.unreadCount,
    },
  })
})

// SSE endpoint for real-time notification count
foerdermittel.get('/notifications/stream', requireAuth, async (c) => {
  const user = c.get('user')
  const result = await getNotifications(user.id, c.env.BAFA_DB)

  const body = [
    'retry: 30000',
    `id: ${Date.now()}`,
    `data: ${JSON.stringify({ unreadCount: result.unreadCount })}`,
    '',
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': c.env.FRONTEND_URL || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
})

foerdermittel.patch('/notifications/:id/read', requireAuth, async (c) => {
  const user = c.get('user')
  const notifId = c.req.param('id')

  await markNotificationAsRead(notifId, user.id, c.env.BAFA_DB)
  return c.json({ success: true })
})

export { foerdermittel }
