// lib/api/berater.ts — Berater onboarding endpoints on bafa-creator-ai-worker
// Backed by routes/berater.ts in apps/worker (Sprint 11).
import { apiCall } from './client'
import { API } from './config'
import { useAuth } from '../store/authStore'

function token(): string | null {
  if (typeof window === 'undefined') return null
  return useAuth.getState().token
}

// ============================================================
// Profil
// ============================================================
export interface BeraterProfil {
  id: string
  user_id: string
  display_name: string
  bio: string | null
  photo_url: string | null
  branchen: string[]
  spezialisierungen: string[]
  region: string | null
  plz: string | null
  telefon: string | null
  website: string | null
  verfuegbar: boolean
  rating_avg: number
  rating_count: number
  profil_views: number
  created_at: string
  updated_at: string
}

// Frontend form shape (registrieren/onboarding/profil)
export interface ProfilFormData {
  displayName: string
  region: string
  branchen: string[]
  spezialisierungen?: string[]
  bio?: string
  websiteUrl?: string
  verfuegbar: boolean
}

export async function getBeraterProfil(): Promise<BeraterProfil | null> {
  const r = await apiCall<{ success: boolean; profil: BeraterProfil | null }>(
    API.FUND24,
    '/api/berater/profil',
    undefined,
    token()
  )
  return r.profil
}

export async function updateBeraterProfil(data: ProfilFormData): Promise<BeraterProfil> {
  const r = await apiCall<{ success: boolean; profil: BeraterProfil }>(
    API.FUND24,
    '/api/berater/profil',
    {
      method: 'POST',
      body: JSON.stringify({
        display_name: data.displayName,
        region: data.region,
        branchen: data.branchen,
        spezialisierungen: data.spezialisierungen ?? [],
        bio: data.bio || null,
        website: data.websiteUrl || null,
        verfuegbar: data.verfuegbar,
      }),
    },
    token()
  )
  return r.profil
}

// ============================================================
// Expertise
// ============================================================
export type KompetenzLevel = 'basis' | 'fortgeschritten' | 'experte'

export interface ExpertiseEntry {
  id: string
  berater_id: string
  foerderbereich: string
  foerderart: string | null
  bundeslaender: string[]
  erfolgreiche_antraege: number
  gesamtvolumen_eur: number
  letzte_aktivitaet: string | null
  kompetenz_level: KompetenzLevel
  created_at: string
}

// Frontend form: kompetenzLevel includes 'einsteiger' which maps to 'basis'
export interface ExpertiseFormData {
  foerderbereich: string
  kompetenzLevel: 'einsteiger' | 'fortgeschritten' | 'experte'
  erfolgreicheAntraege: number
  gesamtvolumenEur: number
}

function mapKompetenz(level: ExpertiseFormData['kompetenzLevel']): KompetenzLevel {
  return level === 'einsteiger' ? 'basis' : level
}

export async function addExpertise(data: ExpertiseFormData): Promise<ExpertiseEntry> {
  const r = await apiCall<{ success: boolean; expertise: ExpertiseEntry }>(
    API.FUND24,
    '/api/berater/expertise',
    {
      method: 'POST',
      body: JSON.stringify({
        foerderbereich: data.foerderbereich,
        kompetenz_level: mapKompetenz(data.kompetenzLevel),
        erfolgreiche_antraege: data.erfolgreicheAntraege,
        gesamtvolumen_eur: data.gesamtvolumenEur,
        bundeslaender: [],
      }),
    },
    token()
  )
  return r.expertise
}

// ============================================================
// Dienstleistungen
// ============================================================
export type PreisTypBackend = 'pauschal' | 'stunde' | 'tag' | 'erfolgshonorar'
export type PreisTypForm = 'pauschal' | 'stundenbasiert' | 'erfolgsbasiert'

export interface DienstleistungEntry {
  id: string
  berater_id: string
  titel: string
  beschreibung: string | null
  kategorie: string
  foerderbereiche: string[]
  foerderarten: string[]
  preis_typ: PreisTypBackend
  preis_von: number | null
  preis_bis: number | null
  dauer_tage: number | null
  inklusiv_leistungen: string[]
  erfolgsquote: number
  abgeschlossene_projekte: number
  aktiv: boolean
  service_typ: string
  bafa_required: boolean
  brand: string
  created_at: string
  updated_at: string
}

// Frontend form (onboarding/dienstleistungen)
export interface DienstleistungFormData {
  name: string
  kategorie?: string
  preisTyp: PreisTypForm
  preisVon: number
  preisBis: number
  dauertage: number
}

function mapPreisTyp(p: PreisTypForm): PreisTypBackend {
  if (p === 'stundenbasiert') return 'stunde'
  if (p === 'erfolgsbasiert') return 'erfolgshonorar'
  return 'pauschal'
}

export async function addDienstleistung(
  data: DienstleistungFormData
): Promise<DienstleistungEntry> {
  const r = await apiCall<{ success: boolean; dienstleistung: DienstleistungEntry }>(
    API.FUND24,
    '/api/berater/dienstleistungen',
    {
      method: 'POST',
      body: JSON.stringify({
        titel: data.name,
        kategorie: data.kategorie || 'allgemein',
        preis_typ: mapPreisTyp(data.preisTyp),
        preis_von: data.preisVon,
        preis_bis: data.preisBis,
        dauer_tage: data.dauertage,
        foerderbereiche: [],
        foerderarten: [],
        inklusiv_leistungen: [],
        bafa_required: false,
      }),
    },
    token()
  )
  return r.dienstleistung
}

// ============================================================
// BAFA-Zertifikat Upload (GAP-002)
// ============================================================

export type BafaCertStatus = 'none' | 'pending' | 'approved' | 'rejected'

export interface BafaCertStatusResponse {
  status: BafaCertStatus
  uploaded_at: string | null
  bafa_berater_nr: string | null
}

export interface BafaCertUploadResponse {
  status: 'pending'
  uploaded_at: string
  bafa_berater_nr: string
}

export async function getBafaCertStatus(): Promise<BafaCertStatusResponse> {
  const r = await apiCall<{ success: boolean } & BafaCertStatusResponse>(
    API.FUND24,
    '/api/berater/bafa-cert/status',
    undefined,
    token(),
  )
  return {
    status: r.status,
    uploaded_at: r.uploaded_at,
    bafa_berater_nr: r.bafa_berater_nr,
  }
}

export async function uploadBafaCert(
  file: File,
  bafaBeraterNr: string,
): Promise<BafaCertUploadResponse> {
  const form = new FormData()
  form.append('file', file)
  form.append('bafa_berater_nr', bafaBeraterNr)
  const r = await apiCall<{ success: boolean } & BafaCertUploadResponse>(
    API.FUND24,
    '/api/berater/bafa-cert',
    { method: 'POST', body: form },
    token(),
  )
  return {
    status: r.status,
    uploaded_at: r.uploaded_at,
    bafa_berater_nr: r.bafa_berater_nr,
  }
}
