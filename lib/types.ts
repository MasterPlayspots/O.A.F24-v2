// lib/types.ts — ALLE TypeScript-Interfaces (kein any)

// ── AUTH ─────────────────────────────────────────────────────
export interface Nutzer {
  id: string
  email: string
  firstName: string
  lastName: string
  company?: string
  role: 'unternehmen' | 'berater' | 'admin'
  emailVerified: boolean
  kontingentTotal?: number
}

export interface AuthResponse {
  token: string
  user: Nutzer
}

// ── FÖRDERCHECK ──────────────────────────────────────────────
export type CheckStatus = 'formular' | 'chat' | 'dokumente' | 'analyse' | 'ergebnis' | 'abgeschlossen'

export interface CheckSession {
  id: string
  status: CheckStatus
  firmenname: string
  branche: string
  bundesland: string
  vorhaben: string
  investitionsvolumen?: number
  mitarbeiterzahl?: number
  jahresumsatz?: number
  gruendungsjahr?: number
  createdAt: string
}

export interface ChatNachricht {
  id: string
  rolle: 'user' | 'agent' | 'system'
  nachricht: string
  createdAt: string
}

export interface CheckErgebnis {
  id: string
  programmId: number
  programmName: string
  relevanzScore: number
  maxFoerdersumme?: number
  bewilligungsPrognose?: number
  begruendung?: string
  kombinierbarMit: string[]
  klasse: 'A' | 'B' | 'C' | 'D'
}

// ── PROGRAMME ────────────────────────────────────────────────
export interface Foerderprogramm {
  id: number
  titel: string
  foerderart: string
  foerderbereich: string
  foerdergebiet: string
  foerderhoehe_min?: number
  foerderhoehe_max?: number
  foerdersatz_pct?: number
  kurztext: string
  antragsteller: string
  status: string
}

export interface ProgrammeResponse {
  results: Foerderprogramm[]
  total: number
  limit: number
  offset: number
}

export interface StatsResponse {
  total: number
  bundesweit: number
  bundeslaender: number
}

export interface FilterOptions {
  foerderarten: string[]
  foerderbereiche: string[]
}

// ── BERATER ──────────────────────────────────────────────────
export interface BeraterProfil {
  id: string
  displayName: string
  bio?: string
  region: string
  branchen: string[]
  spezialisierungen: string[]
  verfuegbar: boolean
  fotoUrl?: string
  websiteUrl?: string
  ratingAvg: number
  ratingCount: number
  erfolgsquote?: number
}

export interface BeraterExpertise {
  id: string
  foerderbereich: string
  kompetenzLevel: 'einsteiger' | 'fortgeschritten' | 'experte'
  erfolgreicheAntraege: number
  gesamtvolumenEur: number
}

export interface Dienstleistung {
  id: string
  name: string
  kategorie?: string
  preisTyp: 'pauschal' | 'stundenbasiert' | 'erfolgsbasiert'
  preisVon?: number
  preisBis?: number
  dauertage?: number
  leistungen?: string[]
}

export interface BeraterMatch {
  berater: BeraterProfil
  matchingScore: number
  empfohleneFoerderbereiche: string[]
}

// ── ANFRAGEN ─────────────────────────────────────────────────
export type AnfrageStatus = 'offen' | 'angenommen' | 'abgelehnt' | 'zurueckgezogen'

export interface Anfrage {
  id: string
  vonUserId: string
  anUserId: string
  vonUserName?: string
  anUserName?: string
  checkId?: string
  dienstleistungId?: string
  nachricht?: string
  status: AnfrageStatus
  createdAt: string
  updatedAt: string
}

// ── NACHRICHTEN ──────────────────────────────────────────────
export interface Nachricht {
  id: string
  anfrageId: string
  senderId: string
  senderName?: string
  inhalt: string
  gelesen: boolean
  createdAt: string
}

// ── TRACKER ──────────────────────────────────────────────────
export type TrackerPhase = 'vorbereitung' | 'antrag' | 'pruefung' | 'bewilligt' | 'abgeschlossen' | 'abgelehnt'

export interface TrackerVorgang {
  id: string
  checkId?: string
  anfrageId?: string
  programmId?: number
  programmName?: string
  phase: TrackerPhase
  notizen?: string
  frist?: string
  createdAt: string
  updatedAt: string
}

// ── NEWS ─────────────────────────────────────────────────────
export interface NewsArtikel {
  id: string
  slug: string
  titel: string
  untertitel?: string
  zusammenfassung?: string
  inhaltMd: string
  kategorie: string
  tags: string[]
  autor: string
  titelbildUrl?: string
  veroeffentlichtAm: string
}

// ── PROVISIONEN ──────────────────────────────────────────────
export type ProvisionStatus = 'ausstehend' | 'dokumente_eingereicht' | 'geprueft' | 'abgerechnet' | 'storniert'

export interface Provision {
  id: string
  beraterId: string
  unternehmenId: string
  anfrageId?: string
  programmName?: string
  bewilligteSummeEur?: number
  provisionsSatz: number
  provisionBetrag?: number
  status: ProvisionStatus
  erstelltAm: string
}

// ── DASHBOARD ────────────────────────────────────────────────
export interface DashboardUnternehmen {
  letzteChecks: CheckSession[]
  offeneAnfragen: number
  favoritenAnzahl: number
  aktiveTracks: number
}

export interface DashboardBerater {
  neueAnfragen: Anfrage[]
  aktiveProjekte: TrackerVorgang[]
  letztNachrichtAm?: string
  offeneProvisionen: number
}

// ── ADMIN ─────────────────────────────────────────────────────
export interface AdminDashboard {
  userAnzahl: number
  checksHeute: number
  offeneAnfragen: number
  pendingProvisionen: number
}

// ── PRECHECK ─────────────────────────────────────────────────
export interface PrecheckProfil {
  firmenname: string
  branche: string
  bundesland: string
  kurzprofil: string
  technologieindikator: boolean
  datenqualitaet: number
}

export type PrecheckAntwortTyp = 'ja_nein' | 'auswahl' | 'text' | 'zahl'

export interface PrecheckFrage {
  id: string
  frage: string
  kontext?: string
  antwortTyp: PrecheckAntwortTyp
  optionen?: string[]
  pflicht: boolean
}

export interface FoerderTreffer {
  programmId: string
  name: string
  foerderart: string
  traeger: string
  bundesweit: boolean
  maxBetrag?: number
  bewilligungswahrscheinlichkeit: number
  klasse: 'A' | 'B' | 'C' | 'D'
  dienstleisterKompatibel: boolean
  beschreibungKurz: string
}

export interface PrecheckScoring {
  top3: FoerderTreffer[]
  gesamtMin: number
  gesamtMax: number
}

// ── PRECHECK PHASE ───────────────────────────────────────────
export type PrecheckPhase =
  | 'url_eingabe'
  | 'analyse_laeuft'
  | 'profil_ready'
  | 'chat'
  | 'scoring_laeuft'
  | 'ergebnis'
  | 'email_formular'
  | 'bericht_versandt'
  | 'fehler'
