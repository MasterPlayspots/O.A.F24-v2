// Test Utilities - DB setup, JWT generation, helpers
import { SignJWT } from "jose";

/** Run all migration SQL on zfbf-db (DB binding) */
export async function setupTestDb(db: D1Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT, hash_version INTEGER DEFAULT 1, role TEXT DEFAULT 'user', first_name TEXT NOT NULL, last_name TEXT NOT NULL, bafa_id TEXT, company TEXT, ust_id TEXT, steuernummer TEXT, is_kleinunternehmer INTEGER DEFAULT 0, phone TEXT, website TEXT, kontingent_total INTEGER DEFAULT 3, kontingent_used INTEGER DEFAULT 0, email_verified INTEGER DEFAULT 0, verification_token TEXT, email_verification_code TEXT, email_verification_expires TEXT, reset_token TEXT, reset_token_expires TEXT, bafa_status TEXT DEFAULT 'pending', onboarding_completed INTEGER DEFAULT 0, privacy_accepted_at TEXT, deleted_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT DEFAULT 'entwurf', company_name TEXT, company_rechtsform TEXT, company_gruendung TEXT, company_mitarbeiter TEXT, company_umsatz TEXT, company_plz TEXT, company_ort TEXT, branche TEXT, unterbranche TEXT, ausgangslage_stichpunkte TEXT, ausgangslage_herausforderungen TEXT, ausgangslage_text TEXT, beratungsmodule TEXT, massnahmen TEXT, beratungsinhalte_text TEXT, massnahmenplan TEXT, handlungsempfehlungen TEXT, umsetzungsplan TEXT, ergebnisse_kurzfristig TEXT, ergebnisse_mittelfristig TEXT, ergebnisse_langfristig TEXT, nachhaltigkeit_oekonomisch TEXT, nachhaltigkeit_oekologisch TEXT, nachhaltigkeit_sozial TEXT, qa_vollstaendigkeit INTEGER DEFAULT 0, qa_bafa_konformitaet INTEGER DEFAULT 0, qa_textqualitaet INTEGER DEFAULT 0, qa_plausibilitaet INTEGER DEFAULT 0, qa_gesamt INTEGER DEFAULT 0, is_unlocked INTEGER DEFAULT 0, unlock_payment_id TEXT, pdf_url TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
    `CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, report_id TEXT, package_type TEXT, amount INTEGER, currency TEXT DEFAULT 'EUR', status TEXT DEFAULT 'pending', provider TEXT, provider_payment_id TEXT, gutschein_code TEXT, gutschein_rabatt INTEGER DEFAULT 0, reports_added INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS gutscheine (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, discount_type TEXT DEFAULT 'percent', discount_value INTEGER NOT NULL, max_uses INTEGER DEFAULT 1, total_uses INTEGER DEFAULT 0, valid_from TEXT, valid_until TEXT, is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS promo_redemptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, promo_code_id TEXT NOT NULL, order_id TEXT, discount_amount INTEGER DEFAULT 0, redeemed_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, promo_code_id))`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount INTEGER NOT NULL, discount_amount INTEGER DEFAULT 0, final_amount INTEGER NOT NULL, reports_count INTEGER DEFAULT 1, status TEXT DEFAULT 'pending', promo_code_id TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, revoked INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, event_type TEXT NOT NULL, detail TEXT, ip TEXT, user_agent TEXT, created_at TEXT DEFAULT (datetime('now')))`,
  ];
  await db.batch(statements.map((sql) => db.prepare(sql)));
}

/** Run migration SQL on bafa_antraege (BAFA_DB binding) */
export async function setupBafaDb(bafaDb: D1Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS antraege (id TEXT PRIMARY KEY, branche_id TEXT, unternehmen_name TEXT NOT NULL, unternehmen_typ TEXT, unternehmen_mitarbeiter INTEGER, unternehmen_umsatz TEXT, unternehmen_hauptproblem TEXT, beratungsthema TEXT DEFAULT 'BAFA-Beratung', beratungsschwerpunkte TEXT, status TEXT DEFAULT 'vorschau' CHECK(status IN ('vorschau','bezahlt','generiert','pending','bewilligt','abgelehnt','fehlgeschlagen')), qualitaetsscore INTEGER DEFAULT 0, wortanzahl INTEGER DEFAULT 0, r2_key TEXT, bezahlt_am TEXT, erstellt_am TEXT DEFAULT (datetime('now')), aktualisiert_am TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS antrag_bausteine (id INTEGER PRIMARY KEY AUTOINCREMENT, antrag_id TEXT NOT NULL, baustein_typ TEXT NOT NULL, baustein_name TEXT, inhalt TEXT, inhalt_json TEXT, qualitaets_score REAL, wortanzahl INTEGER, version INTEGER DEFAULT 1, erstellt_am TEXT DEFAULT (datetime('now')), FOREIGN KEY (antrag_id) REFERENCES antraege(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS download_tokens (id TEXT PRIMARY KEY, antrag_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, gueltig_bis TEXT NOT NULL, downloads INTEGER DEFAULT 0, max_downloads INTEGER DEFAULT 3, erstellt_am TEXT DEFAULT (datetime('now')), FOREIGN KEY (antrag_id) REFERENCES antraege(id) ON DELETE CASCADE)`,
  ];
  await bafaDb.batch(statements.map((sql) => bafaDb.prepare(sql)));
}

/** Create a test user and return their ID */
export async function createTestUser(
  db: D1Database,
  opts: {
    email?: string;
    password_hash?: string;
    salt?: string;
    hash_version?: number;
    role?: string;
    verified?: boolean;
    firstName?: string;
    lastName?: string;
  } = {}
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, salt, hash_version, role, first_name, last_name, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      opts.email || `test-${id}@example.com`,
      opts.password_hash || "dummy-hash",
      opts.salt || null,
      opts.hash_version || 2,
      opts.role || "user",
      opts.firstName || "Test",
      opts.lastName || "User",
      opts.verified !== false ? 1 : 0
    )
    .run();
  return id;
}

/** Create a test antrag in BAFA_DB and ownership record in DB */
export async function createTestAntrag(
  db: D1Database,
  bafaDb: D1Database,
  userId: string,
  opts: {
    status?: string;
    companyName?: string;
    branche?: string;
    isUnlocked?: boolean;
  } = {}
): Promise<string> {
  const id = crypto.randomUUID();
  const status = opts.status || "vorschau";
  const companyName = opts.companyName || "Test GmbH";
  const branche = opts.branche || "handwerk";

  // Ownership record in zfbf-db
  await db
    .prepare(
      "INSERT INTO reports (id, user_id, status, company_name, branche, is_unlocked) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      userId,
      status === "vorschau" ? "entwurf" : status,
      companyName,
      branche,
      opts.isUnlocked ? 1 : 0
    )
    .run();

  // Antrag in bafa_antraege
  await bafaDb
    .prepare(
      "INSERT INTO antraege (id, branche_id, unternehmen_name, status, erstellt_am, aktualisiert_am) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(id, branche, companyName, status)
    .run();

  return id;
}

/** Generate a valid JWT for a test user */
export async function createTestToken(
  userId: string,
  email: string,
  role = "user",
  secret = "test-jwt-secret-key-for-testing-only"
) {
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(new TextEncoder().encode(secret));
}

/** Set up the foerderprogramme D1 database with test data */
export async function setupFoerderDb(foerderDb: D1Database) {
  await foerderDb
    .prepare(
      `CREATE TABLE IF NOT EXISTS foerderprogramme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT, titel TEXT, typ TEXT, foerderart TEXT, foerderbereich TEXT,
    foerdergebiet TEXT, foerderberechtigte TEXT, ansprechpartner_name TEXT,
    ansprechpartner_strasse TEXT, ansprechpartner_plz TEXT, ansprechpartner_ort TEXT,
    ansprechpartner_telefon TEXT, ansprechpartner_fax TEXT, ansprechpartner_email TEXT,
    ansprechpartner_website TEXT, kurztext TEXT, volltext TEXT,
    rechtliche_voraussetzungen TEXT, richtlinie_titel TEXT, richtlinie_datum TEXT,
    richtlinie_gueltig_ab TEXT, scraped_at TEXT, status TEXT DEFAULT 'aktiv'
  )`
    )
    .run();

  // Insert 3 test programs
  await foerderDb.batch([
    foerderDb.prepare(`INSERT INTO foerderprogramme (titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, volltext, rechtliche_voraussetzungen)
      VALUES ('Digitalbonus Bayern', 'Zuschuss', 'IT/Tech', 'Bayern', 'KMU', 'Digitalisierung für KMU', 'Unterstützung der Digitalisierung', 'Max 50 Mitarbeiter')`),
    foerderDb.prepare(`INSERT INTO foerderprogramme (titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, volltext, rechtliche_voraussetzungen)
      VALUES ('go-digital', 'Zuschuss', 'Dienstleistung', 'Bundesweit', 'KMU', 'BMWi Förderprogramm', 'Bundesweites Digitalisierungsprogramm', 'Max 100 Mitarbeiter')`),
    foerderDb.prepare(`INSERT INTO foerderprogramme (titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, volltext, rechtliche_voraussetzungen)
      VALUES ('KfW-Gründerkredit', 'Darlehen', 'Handel', 'Bundesweit', 'Existenzgründer', 'Kredit für Gründer', 'Darlehen bis 125.000 EUR', 'Gründung max 5 Jahre her')`),
  ]);
}

/** Set up funding platform tables in BAFA_DB */
export async function setupFundingTables(bafaDb: D1Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS foerdermittel_profile (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, company_name TEXT NOT NULL, branche TEXT, standort TEXT, rechtsform TEXT, mitarbeiter_anzahl INTEGER, jahresumsatz REAL, gruendungsjahr INTEGER, beschreibung TEXT, dokumente_analysiert TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_matches (id TEXT PRIMARY KEY, profile_id TEXT NOT NULL, programm_id INTEGER NOT NULL, match_score INTEGER DEFAULT 0, match_reasons TEXT, disqualifiers TEXT, status TEXT DEFAULT 'matched', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_cases (id TEXT PRIMARY KEY, match_id TEXT, profile_id TEXT NOT NULL, programm_id INTEGER NOT NULL, berater_id TEXT, phase TEXT DEFAULT 'eligibility_check', status TEXT DEFAULT 'active', phase_data TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_case_steps (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, phase TEXT NOT NULL, step_order INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, step_type TEXT NOT NULL, required INTEGER DEFAULT 1, status TEXT DEFAULT 'pending', result_data TEXT, completed_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_funnel_templates (id TEXT PRIMARY KEY, programm_id INTEGER NOT NULL UNIQUE, phases TEXT NOT NULL, generated_by TEXT, reviewed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_dokumente (id TEXT PRIMARY KEY, case_id TEXT NOT NULL, step_id TEXT, dokument_typ TEXT NOT NULL, dateiname TEXT NOT NULL, dateityp TEXT NOT NULL, dateigroesse INTEGER NOT NULL, r2_key TEXT NOT NULL, status TEXT DEFAULT 'uploaded', ai_extraktion TEXT, uploaded_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_conversations (id TEXT PRIMARY KEY, case_id TEXT, profile_id TEXT NOT NULL, context TEXT NOT NULL, messages TEXT NOT NULL DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS foerdermittel_benachrichtigungen (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, case_id TEXT, typ TEXT NOT NULL, titel TEXT NOT NULL, nachricht TEXT, gelesen INTEGER DEFAULT 0, email_gesendet INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`,
  ];
  await bafaDb.batch(statements.map((sql) => bafaDb.prepare(sql)));
}
