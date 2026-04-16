// lib/api/unternehmen.ts — Eigenes Unternehmen-Profil (Onboarding + Edit)
// Backed by routes/unternehmen.ts in apps/worker (Sprint 13).
import { apiCall } from './client'
import { API } from './config'
import { useAuth } from '../store/authStore'

function token(): string | null {
  if (typeof window === 'undefined') return null
  return useAuth.getState().token
}

export interface Unternehmen {
  id: string
  user_id: string
  firmenname: string
  rechtsform: string | null
  handelsregister_nr: string | null
  steuernummer: string | null
  ust_id: string | null
  strasse: string | null
  plz: string | null
  ort: string | null
  bundesland: string | null
  land: string
  branche: string | null
  branche_code: string | null
  unterbranche: string | null
  gruendungsjahr: number | null
  mitarbeiter_anzahl: number | null
  jahresumsatz: number | null
  bilanzsumme: number | null
  eigenkapitalquote: number | null
  ist_kmu: boolean
  kmu_klasse: string | null
  profil_vollstaendigkeit: number
  created_at: string
  updated_at: string
}

export interface UnternehmenFormData {
  firmenname: string
  rechtsform?: string
  steuernummer?: string
  ust_id?: string
  strasse?: string
  plz?: string
  ort?: string
  bundesland?: string
  branche?: string
  unterbranche?: string
  gruendungsjahr?: number
  mitarbeiter_anzahl?: number
  jahresumsatz?: number
  ist_kmu: boolean
}

export async function updateUnternehmen(data: UnternehmenFormData): Promise<Unternehmen> {
  const r = await apiCall<{ success: boolean; unternehmen: Unternehmen }>(
    API.FUND24,
    '/api/unternehmen/profil',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token()
  )
  return r.unternehmen
}
