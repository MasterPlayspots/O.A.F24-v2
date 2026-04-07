// lib/api/auth.ts — Auth endpoints on foerdermittel-check-api
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

export async function register(daten: RegisterData): Promise<AuthResponse> {
  const r = await apiCall<WorkerAuthResponse>(API.CHECK, '/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: daten.email,
      password: daten.password,
      first_name: daten.firstName,
      last_name: daten.lastName,
      rolle: daten.role,
      company: daten.company,
    }),
  })
  return mapAuth(r)
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const r = await apiCall<WorkerAuthResponse>(API.CHECK, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return mapAuth(r)
}

export async function getMe(token: string): Promise<Nutzer> {
  const u = await apiCall<WorkerUser>(API.CHECK, '/api/auth/me', undefined, token)
  return mapNutzer(u)
}

export async function verifyEmail(code: string, token: string) {
  return apiCall<{ ok: boolean }>(API.CHECK, '/api/auth/verify-email', {
    method: 'POST', body: JSON.stringify({ code }),
  }, token)
}
export async function resendVerification(token: string) {
  return apiCall<{ ok: boolean }>(API.CHECK, '/api/auth/resend-verification', { method: 'POST' }, token)
}
export async function forgotPassword(email: string) {
  return apiCall<{ ok: boolean }>(API.CHECK, '/api/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({ email }),
  })
}
export async function resetPassword(token: string, password: string) {
  return apiCall<{ ok: boolean }>(API.CHECK, '/api/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ token, password }),
  })
}
export async function logout(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = 'fund24-auth=; path=/; max-age=0'
  }
  return apiCall<{ ok: boolean }>(API.CHECK, '/api/auth/logout', { method: 'POST' }, token)
}
