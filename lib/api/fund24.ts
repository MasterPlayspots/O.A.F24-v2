// lib/api/fund24.ts — fund24-api Worker Client
import { apiCall } from './client'
import { API } from './config'
import type { StatsResponse, FilterOptions, ProgrammeResponse, Foerderprogramm } from '../types'

export async function getStats(): Promise<StatsResponse> {
  return apiCall<StatsResponse>(API.FUND24, '/api/stats')
}

export async function getFilterOptions(): Promise<FilterOptions> {
  return apiCall<FilterOptions>(API.FUND24, '/api/filter-options')
}

interface ProgrammeFilter {
  bundesland?: string
  foerderart?: string
  foerderbereich?: string
  suche?: string
  limit?: number
  offset?: number
}

export async function getProgramme(filter?: ProgrammeFilter): Promise<ProgrammeResponse> {
  const params = new URLSearchParams()
  if (filter?.bundesland) params.set('bundesland', filter.bundesland)
  if (filter?.foerderart) params.set('foerderart', filter.foerderart)
  if (filter?.foerderbereich) params.set('foerderbereich', filter.foerderbereich)
  if (filter?.suche) params.set('suche', filter.suche)
  if (filter?.limit) params.set('limit', String(filter.limit))
  if (filter?.offset) params.set('offset', String(filter.offset))
  const qs = params.toString()
  return apiCall<ProgrammeResponse>(API.FUND24, `/api/foerderprogramme${qs ? `?${qs}` : ''}`)
}

export async function getProgramm(id: number): Promise<Foerderprogramm> {
  return apiCall<Foerderprogramm>(API.FUND24, `/api/foerderprogramme/${id}`)
}

// =====================================================================
// fund24 v2 endpoints (added 2026-04-08)
// Worker: bafa-creator-ai-worker, version 45e66295
// Token wird aus useAuth.getState().token gezogen.
// =====================================================================
import { useAuth } from '../store/authStore'

function token(): string | null {
  if (typeof window === 'undefined') return null
  return useAuth.getState().token
}

// ---------- Favoriten ----------
export interface Favorit { programm_id: string; created_at: string }

export async function listFavoriten(): Promise<Favorit[]> {
  return apiCall<Favorit[]>(API.FUND24, '/api/me/favoriten', undefined, token())
}
export async function addFavorit(programmId: string) {
  return apiCall(API.FUND24, `/api/me/favoriten/${programmId}`, { method: 'POST' }, token())
}
export async function removeFavorit(programmId: string) {
  return apiCall(API.FUND24, `/api/me/favoriten/${programmId}`, { method: 'DELETE' }, token())
}

// ---------- Notifications ----------
export interface Notification {
  id: string
  typ: string
  titel: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}
export interface NotificationsResponse { results: Notification[]; unread: number }

export async function listNotifications(): Promise<NotificationsResponse> {
  return apiCall<NotificationsResponse>(API.FUND24, '/api/me/notifications', undefined, token())
}
export async function markNotificationRead(id: string) {
  return apiCall(API.FUND24, `/api/me/notifications/${id}/read`, { method: 'POST' }, token())
}
export async function markAllNotificationsRead() {
  return apiCall(API.FUND24, '/api/me/notifications/read-all', { method: 'POST' }, token())
}

// ---------- Dashboard summary ----------
export interface DashboardSummary {
  antraege: { n: number; entwurf: number | null; eingereicht: number | null; bewilligt: number | null }
  reports: { n: number }
  dokumente: { n: number }
}
export async function getDashboard(): Promise<DashboardSummary> {
  return apiCall<DashboardSummary>(API.FUND24, '/api/me/dashboard', undefined, token())
}

// ---------- Berichte (γ-Hybrid) ----------
export interface Bericht {
  id: string
  status: 'draft' | 'preview' | 'paid' | 'downloaded'
  content: unknown
  quality_score: number | null
  finalized_by_berater_id: string | null
  created_at: string
  updated_at: string
}

export async function getBericht(id: string): Promise<Bericht> {
  return apiCall<Bericht>(API.FUND24, `/api/berichte/${id}`, undefined, token())
}

export async function listBerichte(): Promise<Bericht[]> {
  return apiCall<Bericht[]>(API.FUND24, '/api/berichte', undefined, token())
}

export async function createBericht(body: { unternehmen_id?: string; bafa_beratung_id?: string; branche?: string; content?: unknown }) {
  return apiCall<{ id: string; status: string }>(
    API.FUND24, '/api/berichte',
    { method: 'POST', body: JSON.stringify(body) }, token()
  )
}
export async function updateBericht(id: string, body: { content?: unknown; status?: 'draft' | 'review' }) {
  return apiCall(API.FUND24, `/api/berichte/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token())
}
export async function finalizeBericht(id: string) {
  return apiCall(API.FUND24, `/api/berichte/${id}/finalize`, { method: 'PATCH' }, token())
}

// ---------- Beratungen ----------
// Sprint 18: aligned with bafa_beratungen.phase CHECK constraint.
export type BeratungPhase =
  | 'anlauf'
  | 'datenerhebung'
  | 'durchfuehrung'
  | 'bericht'
  | 'eingereicht'
  | 'bewilligt'
  | 'abgeschlossen'
  | 'abgelehnt'

export interface Beratung {
  id: string
  berater_id: string
  unternehmen_id: string
  user_id: string | null
  phase: BeratungPhase
  bafa_antrag_nr: string | null
  foerderhoehe: number | null
  eigenanteil: number | null
  protokoll: string | null
  branche: string | null
  unternehmen_name?: string | null
  created_at: string
  updated_at: string
}

export async function getBeratung(id: string): Promise<Beratung> {
  return apiCall<Beratung>(API.FUND24, `/api/beratungen/${id}`, undefined, token())
}

export async function listBeratungen(): Promise<Beratung[]> {
  const r = await apiCall<{ success: boolean; beratungen: Beratung[] }>(
    API.FUND24,
    '/api/beratungen',
    undefined,
    token()
  )
  return r.beratungen ?? []
}

export async function updateBeratung(
  id: string,
  body: {
    status?: string
    phase?: BeratungPhase
    protokoll?: string
    foerderhoehe?: number
    eigenanteil?: number
  }
) {
  return apiCall(API.FUND24, `/api/beratungen/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token())
}

// ---------- Antrag (Detail + Dokumente) ----------
export interface Antrag {
  id: string
  user_id: string
  programm_id: string | null
  programm_name?: string | null
  status: 'entwurf' | 'eingereicht' | 'bewilligt' | 'abgelehnt'
  foerdersumme_beantragt: number | null
  foerdersumme_bewilligt: number | null
  vollstaendigkeit: number | null
  created_at: string
  updated_at: string
}

export interface AntragDokumentDTO {
  id: string
  filename: string
  size_bytes: number | null
  mime_type: string | null
  uploaded_at: string | null
}

// GET /api/antraege/:id existiert laut ECOSYSTEM TEIL C.3 im Worker.
export async function getAntrag(id: string): Promise<Antrag> {
  return apiCall<Antrag>(API.FUND24, `/api/antraege/${id}`, undefined, token())
}

export async function listMeineAntraege(): Promise<Antrag[]> {
  return apiCall<Antrag[]>(API.FUND24, '/api/me/antraege', undefined, token())
}

export async function createAntrag(body: { programm_id: string; beschreibung?: string }): Promise<{ id: string }> {
  // Worker (foerdermittel/cases) returns {success, data:{caseId}}.
  // Wrapper normalizes to {id} for the existing frontend caller.
  const r = await apiCall<{ success: boolean; data?: { caseId?: string }; case?: { id: string }; id?: string }>(
    API.FUND24,
    '/api/me/antraege',
    { method: 'POST', body: JSON.stringify(body) },
    token()
  )
  return { id: r.data?.caseId ?? r.case?.id ?? r.id ?? '' }
}

// ---------- Vorlagen (Template-Library) ----------
export interface Vorlage {
  id: string
  user_id: string
  titel: string
  kategorie: string | null
  inhalt: string
  created_at: string
  updated_at: string
}

export async function listVorlagen(): Promise<Vorlage[]> {
  return apiCall<Vorlage[]>(API.FUND24, '/api/vorlagen', undefined, token())
}

export async function createVorlage(body: { titel: string; kategorie?: string; inhalt: string }): Promise<{ id: string }> {
  return apiCall<{ id: string }>(
    API.FUND24,
    '/api/vorlagen',
    { method: 'POST', body: JSON.stringify(body) },
    token()
  )
}

export async function deleteVorlage(id: string) {
  return apiCall(API.FUND24, `/api/vorlagen/${id}`, { method: 'DELETE' }, token())
}

// ---------- Admin: Email Outbox ----------
export type EmailOutboxStatus = 'queued' | 'sending' | 'sent' | 'failed'

export interface EmailOutbox {
  id: string
  to_email: string
  to?: string | null
  subject: string
  status: EmailOutboxStatus
  created_at: string
  sent_at: string | null
  error: string | null
}

export async function listEmailOutbox(filter?: { status?: EmailOutboxStatus; limit?: number; offset?: number }) {
  const params = new URLSearchParams()
  if (filter?.status) params.set('status', filter.status)
  if (filter?.limit) params.set('limit', String(filter.limit))
  if (filter?.offset) params.set('offset', String(filter.offset))
  const qs = params.toString()
  return apiCall<{ results: EmailOutbox[]; limit: number; offset: number }>(
    API.FUND24,
    `/api/admin/email-outbox${qs ? `?${qs}` : ''}`,
    undefined,
    token()
  )
}

export async function retryEmail(id: string) {
  return apiCall<{ ok: boolean }>(
    API.FUND24,
    `/api/admin/email-outbox/${id}/retry`,
    { method: 'POST' },
    token()
  )
}

export async function listAntragDokumente(antragId: string): Promise<AntragDokumentDTO[]> {
  const r = await apiCall<{ data?: AntragDokumentDTO[] } | AntragDokumentDTO[]>(
    API.FUND24, `/api/antraege/${antragId}/dokumente`, undefined, token()
  )
  return Array.isArray(r) ? r : (r.data ?? [])
}

export async function uploadAntragDokument(
  antragId: string,
  file: File,
  dokumentTyp?: string
): Promise<AntragDokumentDTO> {
  const fd = new FormData()
  fd.append('file', file)
  if (dokumentTyp) fd.append('dokument_typ', dokumentTyp)
  const r = await apiCall<{ data: AntragDokumentDTO }>(
    API.FUND24,
    `/api/antraege/${antragId}/dokumente`,
    { method: 'POST', body: fd },
    token()
  )
  return r.data
}

export async function deleteAntragDokument(antragId: string, dokId: string) {
  return apiCall(
    API.FUND24,
    `/api/antraege/${antragId}/dokumente/${dokId}`,
    { method: 'DELETE' },
    token()
  )
}

// ---------- Antrag-Zugriff (Berater einladen / entziehen) ----------
export interface AntragZugriff {
  id: string
  user_id: string | null
  berater_id: string | null
  rolle: 'editor' | 'viewer' | 'reviewer'
  granted_by: string
  created_at: string
  user_email?: string
  first_name?: string
  last_name?: string
}
export async function listAntragZugriff(antragId: string): Promise<AntragZugriff[]> {
  const r = await apiCall<{ data?: AntragZugriff[] } | AntragZugriff[]>(
    API.FUND24, `/api/antraege/${antragId}/zugriff`, undefined, token()
  )
  return Array.isArray(r) ? r : (r.data ?? [])
}
export async function grantAntragZugriff(antragId: string, body: { user_id?: string; berater_id?: string; rolle: 'editor' | 'viewer' | 'reviewer' }) {
  return apiCall<{ id: string }>(
    API.FUND24, `/api/antraege/${antragId}/zugriff`,
    { method: 'POST', body: JSON.stringify(body) }, token()
  )
}
export async function revokeAntragZugriff(antragId: string, zugriffId: string) {
  return apiCall(API.FUND24, `/api/antraege/${antragId}/zugriff/${zugriffId}`, { method: 'DELETE' }, token())
}

// ---------- Berater Kunden-Aggregation ----------
export interface BeraterKunde {
  unternehmen_id: string
  firmenname: string | null
  branche: string | null
  antraege_count: number
  letzte_aktivitaet: string | null
}
export async function listBeraterKunden(): Promise<BeraterKunde[]> {
  return apiCall<BeraterKunde[]>(API.FUND24, '/api/berater/me/kunden', undefined, token())
}

// ---------- Dokumente Soft-Delete ----------
export async function deleteDokument(id: string) {
  return apiCall(API.FUND24, `/api/dokumente/${id}`, { method: 'DELETE' }, token())
}

// ---------- Admin: Cert-Approval-Queue + Audit-Logs ----------
export interface CertPending {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company: string | null
  bafa_berater_nr: string | null
  bafa_cert_status: string
  bafa_cert_uploaded_at: string | null
}
export async function listPendingCerts(): Promise<CertPending[]> {
  return apiCall<CertPending[]>(API.FUND24, '/api/admin/bafa-cert/pending', undefined, token())
}
export async function approveCert(userId: string) {
  return apiCall(API.FUND24, `/api/admin/bafa-cert/${userId}/approve`, { method: 'POST' }, token())
}
export async function rejectCert(userId: string) {
  return apiCall(API.FUND24, `/api/admin/bafa-cert/${userId}/reject`, { method: 'POST' }, token())
}

export interface AuditLog {
  id: string
  user_id: string
  // Worker-Variante "action" + "resource" / DB-Variante "event_type" + "detail" — beide optional.
  action?: string | null
  event_type?: string | null
  resource?: string | null
  resource_id?: string | null
  detail?: string | null
  ip: string | null
  user_agent?: string | null
  created_at: string
}
export async function listAuditLogs(filter?: { user_id?: string; action?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams()
  if (filter?.user_id) params.set('user_id', filter.user_id)
  if (filter?.action) params.set('action', filter.action)
  if (filter?.limit) params.set('limit', String(filter.limit))
  if (filter?.offset) params.set('offset', String(filter.offset))
  const qs = params.toString()
  return apiCall<{ results: AuditLog[]; limit: number; offset: number }>(
    API.FUND24, `/api/admin/audit-logs${qs ? `?${qs}` : ''}`, undefined, token()
  )
}
