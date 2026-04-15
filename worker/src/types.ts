// ZFBF Worker - Shared Types & Bindings

// ============================================
// Cloudflare Bindings
// ============================================

export type Bindings = {
  DB: D1Database;
  BAFA_DB: D1Database;
  BAFA_CONTENT: D1Database;
  FOERDER_DB: D1Database;

  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  CACHE: KVNamespace;
  WEBHOOK_EVENTS: KVNamespace;

  REPORTS: R2Bucket;

  AI: Ai;

  JWT_SECRET: string;
  UNLOCK_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  RESEND_API_KEY: string;

  FRONTEND_URL: string;
  ENVIRONMENT: string;
  API_VERSION: string;
  SENTRY_DSN: string;
};

// ============================================
// Auth Types
// ============================================

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export type Variables = {
  user: AuthUser;
  jwtPayload: JwtPayload;
};

export interface PasskeyCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string | null;
  transports: string | null;
  created_at: string;
}

// ============================================
// Database Row Types
// ============================================

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string | null;
  hash_version: number;
  first_name: string;
  last_name: string;
  role: string;
  bafa_id: string | null;
  company: string | null;
  ust_id: string | null;
  steuernummer: string | null;
  is_kleinunternehmer: number;
  phone: string | null;
  website: string | null;
  kontingent_total: number;
  kontingent_used: number;
  email_verified: number;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expires: string | null;
  bafa_status: string;
  onboarding_completed: number;
  privacy_accepted_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  user_id: string;
  status: string;
  company_name: string | null;
  company_rechtsform: string | null;
  company_gruendung: string | null;
  company_mitarbeiter: string | null;
  company_umsatz: string | null;
  company_plz: string | null;
  company_ort: string | null;
  branche: string | null;
  unterbranche: string | null;
  ausgangslage_stichpunkte: string | null;
  ausgangslage_herausforderungen: string | null;
  ausgangslage_text: string | null;
  beratungsmodule: string | null;
  massnahmen: string | null;
  beratungsinhalte_text: string | null;
  massnahmenplan: string | null;
  handlungsempfehlungen: string | null;
  umsetzungsplan: string | null;
  ergebnisse_kurzfristig: string | null;
  ergebnisse_mittelfristig: string | null;
  ergebnisse_langfristig: string | null;
  nachhaltigkeit_oekonomisch: string | null;
  nachhaltigkeit_oekologisch: string | null;
  nachhaltigkeit_sozial: string | null;
  qa_vollstaendigkeit: number;
  qa_bafa_konformitaet: number;
  qa_textqualitaet: number;
  qa_plausibilitaet: number;
  qa_gesamt: number;
  is_unlocked: number;
  unlock_payment_id: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// BAFA Antraege Row Types (bafa_antraege D1)
// ============================================

export interface AntragRow {
  id: string;
  branche_id: string | null;
  unternehmen_name: string;
  unternehmen_typ: string | null;
  unternehmen_mitarbeiter: number | null;
  unternehmen_umsatz: string | null;
  unternehmen_hauptproblem: string | null;
  beratungsthema: string;
  beratungsschwerpunkte: string | null;
  status: string;
  qualitaetsscore: number;
  wortanzahl: number;
  r2_key: string | null;
  bezahlt_am: string | null;
  erstellt_am: string | null;
  aktualisiert_am: string | null;
}

export interface AntragBausteinRow {
  id: number;
  antrag_id: string;
  baustein_typ: string;
  baustein_name: string | null;
  inhalt: string | null;
  inhalt_json: string | null;
  qualitaets_score: number | null;
  wortanzahl: number | null;
  version: number;
  erstellt_am: string | null;
}

export interface BafaDownloadTokenRow {
  id: string;
  antrag_id: string;
  token: string;
  gueltig_bis: string;
  downloads: number;
  max_downloads: number;
  erstellt_am: string | null;
}

export const AntragStatus = {
  PREVIEW: "vorschau",
  PAID: "bezahlt",
  GENERATED: "generiert",
  PENDING: "pending",
  APPROVED: "bewilligt",
  REJECTED: "abgelehnt",
  FAILED: "fehlgeschlagen",
} as const;

export interface GutscheinRow {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number;
  total_uses: number;
  is_active: number;
  valid_from: string | null;
  valid_until: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: number;
  created_at: string;
}

// ============================================
// Constants
// ============================================

export const REPORT_PRICE_CENTS = 4900;

export const ReportStatus = {
  DRAFT: "entwurf",
  GENERATING: "generating",
  GENERATED: "generiert",
  FINALIZED: "finalisiert",
  ERROR: "error",
} as const;

export const OrderStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  REFUNDED: "refunded",
} as const;

export const PACKAGES: Record<string, { price: number; reports: number; name: string }> = {
  einzel: { price: 4900, reports: 1, name: "Einzelbericht" },
  starter: { price: 14900, reports: 3, name: "Starter-Paket" },
  standard: { price: 34900, reports: 10, name: "Standard-Paket" },
  pro: { price: 74900, reports: 25, name: "Pro-Paket" },
};

export const AUDIT_EVENTS = {
  LOGIN: "login",
  LOGIN_FAILED: "failed_auth",
  LOGOUT: "logout",
  REGISTER: "register",
  ROLE_CHANGE: "role_change",
  PAYMENT: "payment",
  PROMO_REDEEM: "promo_redeem",
  REPORT_UNLOCK: "report_unlock",
  REPORT_GENERATE: "report_generate",
  REPORT_DOWNLOAD: "report_download",
  USER_DELETE: "user_delete",
} as const;

// ============================================
// Förderprogramme Row Types (foerderprogramme D1)
// ============================================

export interface FoerderprogrammRow {
  id: number;
  url: string | null;
  titel: string | null;
  typ: string | null;
  foerderart: string | null;
  foerderbereich: string | null;
  foerdergebiet: string | null;
  foerderberechtigte: string | null;
  ansprechpartner_name: string | null;
  ansprechpartner_strasse: string | null;
  ansprechpartner_plz: string | null;
  ansprechpartner_ort: string | null;
  ansprechpartner_telefon: string | null;
  ansprechpartner_fax: string | null;
  ansprechpartner_email: string | null;
  ansprechpartner_website: string | null;
  kurztext: string | null;
  volltext: string | null;
  rechtliche_voraussetzungen: string | null;
  richtlinie_titel: string | null;
  richtlinie_datum: string | null;
  richtlinie_gueltig_ab: string | null;
  scraped_at: string | null;
}

// ============================================
// Funding Platform Row Types
// ============================================

export interface FoerdermittelProfileRow {
  id: string;
  user_id: string;
  company_name: string;
  branche: string | null;
  standort: string | null;
  rechtsform: string | null;
  mitarbeiter_anzahl: number | null;
  jahresumsatz: number | null;
  gruendungsjahr: number | null;
  beschreibung: string | null;
  dokumente_analysiert: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoerdermittelMatchRow {
  id: string;
  profile_id: string;
  programm_id: number;
  match_score: number;
  match_reasons: string | null;
  disqualifiers: string | null;
  status: string;
  created_at: string;
}

export interface FoerdermittelCaseRow {
  id: string;
  match_id: string | null;
  profile_id: string;
  programm_id: number;
  berater_id: string | null;
  phase: string;
  status: string;
  phase_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoerdermittelCaseStepRow {
  id: string;
  case_id: string;
  phase: string;
  step_order: number;
  title: string;
  description: string | null;
  step_type: string;
  required: number;
  status: string;
  result_data: string | null;
  completed_at: string | null;
}

export interface FoerdermittelFunnelTemplateRow {
  id: string;
  programm_id: number;
  phases: string;
  generated_by: string | null;
  reviewed: number;
  created_at: string;
  updated_at: string;
}

export interface FoerdermittelDokumentRow {
  id: string;
  case_id: string;
  step_id: string | null;
  dokument_typ: string;
  dateiname: string;
  dateityp: string;
  dateigroesse: number;
  r2_key: string;
  status: string;
  ai_extraktion: string | null;
  uploaded_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  program_id: number;
  created_at: string;
}

export interface FoerdermittelConversationRow {
  id: string;
  case_id: string | null;
  profile_id: string;
  context: string;
  messages: string;
  created_at: string;
  updated_at: string;
}
