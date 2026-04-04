// lib/api/precheck.ts — Public Precheck endpoints
import { apiCall } from './client'
import { API } from './config'
import type { PrecheckProfil, PrecheckFrage, PrecheckScoring } from '../types'

export async function analysiereWebsite(url: string): Promise<{ sessionId: string; profil: PrecheckProfil }> {
  return apiCall(API.CHECK, '/api/precheck/analyse', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export async function ladeFragen(sessionId: string): Promise<{ fragen: PrecheckFrage[] }> {
  return apiCall(API.CHECK, `/api/precheck/${sessionId}/fragen`)
}

export async function sendeAntwort(
  sessionId: string, frageId: string, antwort: string
): Promise<{ ok: boolean; naechste?: PrecheckFrage }> {
  return apiCall(API.CHECK, `/api/precheck/${sessionId}/antwort`, {
    method: 'POST',
    body: JSON.stringify({ frageId, antwort }),
  })
}

export async function fuehreScoring(sessionId: string): Promise<PrecheckScoring> {
  return apiCall(API.CHECK, `/api/precheck/${sessionId}/scoring`, { method: 'POST' })
}

export async function ladeStatus(sessionId: string): Promise<{ status: string }> {
  return apiCall(API.CHECK, `/api/precheck/${sessionId}/status`)
}

export async function fordereBerichtAn(
  sessionId: string, email: string, dsgvo: boolean
): Promise<{ ok: boolean }> {
  return apiCall(API.CHECK, '/api/precheck/bericht', {
    method: 'POST',
    body: JSON.stringify({ sessionId, email, dsgvo }),
  })
}
