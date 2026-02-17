// ZFBF Worker - Shared Types & Bindings

// ============================================
// Cloudflare Bindings
// ============================================

export type Bindings = {
  DB: D1Database
  BAFA_CONTENT: D1Database

  SESSIONS: KVNamespace
  RATE_LIMIT: KVNamespace
  CACHE: KVNamespace
  WEBHOOK_EVENTS: KVNamespace

  REPORTS: R2Bucket

  AI: Ai

  JWT_SECRET: string
  UNLOCK_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  PAYPAL_CLIENT_ID: string
  PAYPAL_CLIENT_SECRET: string
  RESEND_API_KEY: string

  FRONTEND_URL: string
  ENVIRONMENT: string
  API_VERSION: string
}

// ============================================
// Auth Types
// ============================================

export interface JwtPayload {
  userId: string
  email: string
  role: string
  exp?: number
  iat?: number
}

export interface AuthUser {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
}

export type Variables = {
  user: AuthUser
  jwtPayload: JwtPayload
}

// ============================================
// Database Row Types
// ============================================

export interface UserRow {
  id: string
  email: string
  password_hash: string
  salt: string | null
  hash_version: number
  first_name: string
  last_name: string
  role: string
  bafa_id: string | null
  company: string | null
  ust_id: string | null
  steuernummer: string | null
  is_kleinunternehmer: number
  phone: string | null
  website: string | null
  kontingent_total: number
  kontingent_used: number
  email_verified: number
  verification_token: string | null
  reset_token: string | null
  reset_token_expires: string | null
  bafa_status: string
  onboarding_completed: number
  created_at: string
  updated_at: string
}

export interface ReportRow {
  id: string
  user_id: string
  status: string
  company_name: string | null
  company_rechtsform: string | null
  company_gruendung: string | null
  company_mitarbeiter: string | null
  company_umsatz: string | null
  company_plz: string | null
  company_ort: string | null
  branche: string | null
  unterbranche: string | null
  ausgangslage_stichpunkte: string | null
  ausgangslage_herausforderungen: string | null
  ausgangslage_text: string | null
  beratungsmodule: string | null
  massnahmen: string | null
  beratungsinhalte_text: string | null
  massnahmenplan: string | null
  handlungsempfehlungen: string | null
  umsetzungsplan: string | null
  ergebnisse_kurzfristig: string | null
  ergebnisse_mittelfristig: string | null
  ergebnisse_langfristig: string | null
  nachhaltigkeit_oekonomisch: string | null
  nachhaltigkeit_oekologisch: string | null
  nachhaltigkeit_sozial: string | null
  qa_vollstaendigkeit: number
  qa_bafa_konformitaet: number
  qa_textqualitaet: number
  qa_plausibilitaet: number
  qa_gesamt: number
  is_unlocked: number
  unlock_payment_id: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
}

// ============================================
// Constants
// ============================================

export const REPORT_PRICE_CENTS = 4900

export const PACKAGES: Record<string, { price: number; reports: number; name: string }> = {
  einzel: { price: 4900, reports: 1, name: 'Einzelbericht' },
  starter: { price: 14900, reports: 3, name: 'Starter-Paket' },
  standard: { price: 34900, reports: 10, name: 'Standard-Paket' },
  pro: { price: 74900, reports: 25, name: 'Pro-Paket' },
}

export const AUDIT_EVENTS = {
  LOGIN: 'login',
  LOGIN_FAILED: 'failed_auth',
  LOGOUT: 'logout',
  REGISTER: 'register',
  ROLE_CHANGE: 'role_change',
  PAYMENT: 'payment',
  PROMO_REDEEM: 'promo_redeem',
  REPORT_UNLOCK: 'report_unlock',
  REPORT_GENERATE: 'report_generate',
  REPORT_DOWNLOAD: 'report_download',
} as const
