// lib/api/auth.ts — Auth endpoints on bafa-creator-ai-worker (api.fund24.io/api/*)
import { apiCall } from './client'
import { API } from './config'
import type { AuthResponse, Nutzer } from '../types'

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  company?: string
  role: Nutzer['role']
  privacyAccepted: boolean
}

// Worker liefert snake_case — wir mappen auf camelCase Nutzer
interface WorkerUser {
  id: string
  email: string
  first_name: string
  last_name: string
  company?: string
  role: Nutzer['role']
  email_verified: boolean
  kontingent_total?: number
}
interface WorkerAuthResponse {
  success: boolean
  token: string
  user: WorkerUser
}

interface WorkerRegisterResponse {
  success: boolean
  userId?: string
  requiresVerification?: boolean
  message?: string
  // Legacy: in case the worker ever returns full auth payload from /register
  token?: string
  user?: WorkerUser
}

export type RegisterResult =
  | AuthResponse
  | { requiresVerification: true; email: string; userId?: string }

function mapNutzer(u: WorkerUser): Nutzer {
  return {
    id: u.id,
    email: u.email,
    firstName: u.first_name,
    lastName: u.last_name,
    company: u.company,
    role: u.role,
    emailVerified: u.email_verified,
    kontingentTotal: u.kontingent_total,
  }
}
function mapAuth(r: WorkerAuthResponse): AuthResponse {
  return { token: r.token, user: mapNutzer(r.user) }
}

export async function register(daten: RegisterData): Promise<RegisterResult> {
  const r = await apiCall<WorkerRegisterResponse>(API.FUND24, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: daten.email,
      password: daten.password,
      firstName: daten.firstName,
      lastName: daten.lastName,
      role: daten.role,
      company: daten.company,
      privacyAccepted: daten.privacyAccepted,
    }),
  })
  if (r.token && r.user) {
    return mapAuth(r as WorkerAuthResponse)
  }
  return { requiresVerification: true, email: daten.email, userId: r.userId }
}

export async function verifyCode(email: string, code: string): Promise<AuthResponse> {
  const r = await apiCall<WorkerAuthResponse>(API.FUND24, '/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  return mapAuth(r)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const r = await apiCall<WorkerAuthResponse>(API.FUND24, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return mapAuth(r)
}

export async function getMe(token: string): Promise<Nutzer> {
  const u = await apiCall<WorkerUser>(API.FUND24, '/api/auth/me', undefined, token)
  return mapNutzer(u)
}

export async function resendVerification(email: string) {
  return apiCall<{ success: boolean; message?: string }>(API.FUND24, '/api/auth/resend-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}
export async function forgotPassword(email: string) {
  return apiCall<{ ok: boolean }>(API.FUND24, '/api/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({ email }),
  })
}
export async function resetPassword(token: string, password: string) {
  return apiCall<{ ok: boolean }>(API.FUND24, '/api/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ token, password }),
  })
}
export async function logout(token: string) {
  // Clear the HttpOnly session cookie via Next.js same-origin endpoint.
  // `document.cookie =` cannot touch HttpOnly cookies (browser ignores it),
  // so the previous no-op write to 'fund24-auth' was wrong on both axes:
  // wrong cookie name and wrong mechanism.
  if (typeof fetch !== 'undefined') {
    try {
      await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' })
    } catch {
      // Best-effort; worker logout below is the authoritative invalidation.
    }
  }
  return apiCall<{ ok: boolean }>(API.FUND24, '/api/auth/logout', { method: 'POST' }, token)
}
