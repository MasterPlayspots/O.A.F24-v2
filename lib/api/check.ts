// lib/api/check.ts — foerdermittel-check-api Worker Client
import { apiCall } from './client'
import { API } from './config'
import type {
  CheckSession, ChatNachricht, CheckErgebnis, BeraterMatch, BeraterProfil,
  BeraterExpertise, Dienstleistung, Anfrage, AnfrageStatus, Nachricht,
  TrackerVorgang, TrackerPhase, NewsArtikel, Provision, ProvisionStatus,
  DashboardUnternehmen, DashboardBerater, Nutzer, AdminDashboard
} from '../types'

// ── CHECKS ───────────────────────────────────────────────────

type CheckStartDaten = Omit<CheckSession, 'id' | 'status' | 'createdAt'>

export async function checkStarten(daten: CheckStartDaten, token: string): Promise<{ id: string }> {
  return apiCall<{ id: string }>(API.CHECK, '/api/checks', {
    method: 'POST',
    body: JSON.stringify(daten),
  }, token)
}

export async function getCheck(
  sessionId: string, token: string
): Promise<CheckSession & { nachrichten: ChatNachricht[]; ergebnisse: CheckErgebnis[] }> {
  return apiCall(API.CHECK, `/api/checks/${sessionId}`, undefined, token)
}

export async function chatNachricht(
  sessionId: string, nachricht: string, token: string
): Promise<{ nachricht: ChatNachricht; status: string }> {
  return apiCall(API.CHECK, `/api/checks/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ nachricht }),
  }, token)
}

export async function dokumenteHochladen(
  sessionId: string, formData: FormData, token: string
): Promise<{ ok: boolean }> {
  // apiCall erkennt FormData und entfernt Content-Type automatisch:
  return apiCall<{ ok: boolean }>(
    API.CHECK,
    `/api/checks/${sessionId}/docs`,
    { method: 'POST', body: formData },
    token
  )
}

export async function schwarmStarten(sessionId: string, token: string): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/checks/${sessionId}/schwarm`, { method: 'POST' }, token)
}

// ── MATCHING ─────────────────────────────────────────────────

export async function getMatching(sessionId: string, token: string): Promise<{ berater: BeraterMatch[] }> {
  return apiCall(API.CHECK, `/api/checks/${sessionId}/matching`, undefined, token)
}

// ── ANFRAGEN ─────────────────────────────────────────────────

export async function getAnfragen(token: string, rolle?: 'unternehmen' | 'berater'): Promise<{ anfragen: Anfrage[] }> {
  const qs = rolle ? `?rolle=${rolle}` : ''
  return apiCall(API.CHECK, `/api/anfragen${qs}`, undefined, token)
}

interface AnfrageDaten {
  anUserId: string
  checkId?: string
  dienstleistungId?: string
  nachricht?: string
}

export async function sendeAnfrage(daten: AnfrageDaten, token: string): Promise<{ id: string }> {
  // Sprint 16: route to bafa-creator-ai-worker /api/berater/:id/anfrage.
  // Frontend passes the berater profile id as `anUserId` (legacy field name).
  const beraterId = daten.anUserId
  const r = await apiCall<{ success: boolean; anfrage?: { id: string } }>(
    API.FUND24,
    `/api/berater/${beraterId}/anfrage`,
    {
      method: 'POST',
      body: JSON.stringify({
        typ: 'beratung',
        nachricht: daten.nachricht ?? null,
      }),
    },
    token
  )
  return { id: r.anfrage?.id ?? '' }
}

export async function updateAnfrage(id: string, status: AnfrageStatus, token: string): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/anfragen/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, token)
}

// ── DASHBOARD ────────────────────────────────────────────────

export async function getDashboard(
  rolle: 'unternehmen' | 'berater', token: string
): Promise<DashboardUnternehmen | DashboardBerater> {
  return apiCall(API.CHECK, `/api/dashboard/${rolle}`, undefined, token)
}

// ── NACHRICHTEN ──────────────────────────────────────────────

export async function getNachrichten(anfrageId: string, token: string): Promise<{ nachrichten: Nachricht[] }> {
  return apiCall(API.CHECK, `/api/netzwerk/nachrichten?anfrageId=${anfrageId}`, undefined, token)
}

export async function sendeNachricht(anfrageId: string, inhalt: string, token: string): Promise<{ nachricht: Nachricht }> {
  return apiCall(API.CHECK, '/api/netzwerk/nachrichten', {
    method: 'POST',
    body: JSON.stringify({ anfrageId, inhalt }),
  }, token)
}

// ── TRACKER ──────────────────────────────────────────────────

export async function getTracker(token: string): Promise<{ vorgaenge: TrackerVorgang[] }> {
  return apiCall(API.CHECK, '/api/tracker', undefined, token)
}

export async function updateTrackerPhase(id: string, phase: TrackerPhase, token: string): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/tracker/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ phase }),
  }, token)
}

// ── FAVORITEN ────────────────────────────────────────────────

export async function getFavoriten(token: string): Promise<{ favoritenIds: number[] }> {
  return apiCall(API.CHECK, '/api/favoriten', undefined, token)
}

export async function addFavorit(programmId: number, token: string): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, '/api/favoriten', {
    method: 'POST',
    body: JSON.stringify({ programmId }),
  }, token)
}

export async function removeFavorit(programmId: number, token: string): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/favoriten/${programmId}`, { method: 'DELETE' }, token)
}

// ── NEWS ─────────────────────────────────────────────────────

export async function getNews(kategorie?: string): Promise<{ artikel: NewsArtikel[] }> {
  const qs = kategorie ? `?kategorie=${kategorie}` : ''
  return apiCall(API.CHECK, `/api/news${qs}`)
}

export async function getNewsArtikel(slug: string): Promise<NewsArtikel> {
  return apiCall(API.CHECK, `/api/news/${slug}`)
}

// ── BERATER (PUBLIC) ─────────────────────────────────────────

export async function getBeraterListe(
  filter?: { verfuegbar?: boolean; bundesland?: string }
): Promise<{ berater: BeraterProfil[] }> {
  const params = new URLSearchParams()
  if (filter?.verfuegbar !== undefined) params.set('verfuegbar', String(filter.verfuegbar))
  if (filter?.bundesland) params.set('bundesland', filter.bundesland)
  const qs = params.toString()
  return apiCall(API.FUND24, `/api/netzwerk/berater${qs ? `?${qs}` : ''}`)
}

export async function getBeraterProfil(
  id: string
): Promise<BeraterProfil & { expertise: BeraterExpertise[]; dienstleistungen: Dienstleistung[] }> {
  return apiCall(API.FUND24, `/api/netzwerk/berater/${id}`)
}

// ── BERATER PROFIL/EXPERTISE/DIENSTLEISTUNGEN ────────────────
// Moved to lib/api/berater.ts (Sprint 11) — wired against bafa-creator-ai-worker
// /api/berater/* on API.FUND24, replacing the legacy API.CHECK calls.

// ── BERATER ABWICKLUNG ───────────────────────────────────────

export async function getProvisionVertraege(token: string): Promise<{ provisionen: Provision[] }> {
  return apiCall(API.CHECK, '/api/berater/provision-vertraege', undefined, token)
}

export async function uploadAbwicklungDokument(
  provisionId: string, formData: FormData, token: string
): Promise<{ ok: boolean }> {
  // provisionId mitgeben, damit der Worker die Datei zuordnen kann:
  formData.set('provisionId', provisionId)
  return apiCall<{ ok: boolean }>(
    API.CHECK,
    `/api/berater/abwicklung/upload`,
    { method: 'POST', body: formData },
    token
  )
}

// ── ADMIN ────────────────────────────────────────────────────

export async function getAdminDashboard(token: string): Promise<AdminDashboard> {
  return apiCall(API.CHECK, '/api/admin/dashboard', undefined, token)
}

export async function getAdminUsers(token: string): Promise<{ users: Nutzer[] }> {
  return apiCall(API.CHECK, '/api/admin/users', undefined, token)
}

export async function updateAdminUser(
  id: string,
  daten: { role?: Nutzer['role']; deleted_at?: string },
  token: string
): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(daten),
  }, token)
}

export async function getAdminProvisionen(token: string): Promise<{ provisionen: Provision[] }> {
  return apiCall(API.CHECK, '/api/admin/provisionen', undefined, token)
}

export async function updateAdminProvision(
  id: string,
  daten: { status?: ProvisionStatus; bewilligteSummeEur?: number },
  token: string
): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/admin/provisionen/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(daten),
  }, token)
}

export async function getAdminNews(token: string): Promise<{ artikel: NewsArtikel[] }> {
  return apiCall(API.CHECK, '/api/admin/news', undefined, token)
}

export async function createAdminNews(
  daten: Omit<NewsArtikel, 'id' | 'veroeffentlichtAm'>, token: string
): Promise<{ id: string }> {
  return apiCall(API.CHECK, '/api/admin/news', {
    method: 'POST',
    body: JSON.stringify(daten),
  }, token)
}

export async function updateAdminNews(
  id: string, daten: Partial<NewsArtikel>, token: string
): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, `/api/admin/news/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(daten),
  }, token)
}
