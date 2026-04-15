// ============================================================
// Fördermittel-Check API with Berater Matching – Cloudflare Worker
// Combined: Fördermittel-Check + ZFBF.info Matching Algorithm
// Hybrid AI: Workers AI (Llama 3.1) + External (GPT-4o/Claude)
// Database: foerdermittel-checks (CHECK_DB), foerderprogramme (FOERDER_DB), bafa_antraege (PLATFORM_DB)
// ============================================================

// --- CORS & Helpers ---

// Erlaubte Origins für CORS (Produktion + Entwicklung)
const ALLOWED_ORIGINS = [
  "https://fund24.io",
  "https://www.fund24.io",
  "https://fund24.vercel.app",
  "https://zfbf.info",
  "https://www.zfbf.info",
  "https://zfbf-frontend.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "*";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin === "null";
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// Fallback CORS für Funktionen ohne Request-Zugriff
const CORS = {
  "Access-Control-Allow-Origin": "https://zfbf.info",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function err(message, status = 400) {
  return json({ error: message, success: false }, status);
}

// --- JWT Auth (optional – checks if present) ---

function b64urlToB64(s) {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return b;
}

async function verifyJWT(token, secret) {
  try {
    const [headerB64, payloadB64, sigB64] = token.split(".");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sig = Uint8Array.from(atob(b64urlToB64(sigB64)), (c) => c.charCodeAt(0));
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);
    if (!valid) return null;
    const payload = JSON.parse(atob(b64urlToB64(payloadB64)));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch (e) {
    console.error("JWT verify error:", e.message);
    return null;
  }
}

async function optionalAuth(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyJWT(auth.slice(7), env.JWT_SECRET);
}

// ============================================================
// AUTH SYSTEM – Register, Login, Verify, Profile
// ============================================================

async function signJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 7 * 24 * 60 * 60 };
  const headerEncoded = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadEncoded = btoa(JSON.stringify(tokenPayload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const message = `${headerEncoded}.${payloadEncoded}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${message}.${signatureEncoded}`;
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateVerificationCode() {
  const a = new Uint8Array(3);
  crypto.getRandomValues(a);
  return String(((a[0] << 16) | (a[1] << 8) | a[2]) % 1000000).padStart(6, '0');
}

function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function registerUser(request, env) {
  try {
    const { email, password, first_name, last_name, rolle, company, phone } = await request.json();
    if (!email || !password || !first_name || !last_name || !rolle) return err('Pflichtfelder fehlen: email, password, first_name, last_name, rolle', 400);
    if (!isValidEmail(email)) return err('Ungültiges E-Mail-Format', 400);
    if (password.length < 8) return err('Passwort muss mindestens 8 Zeichen haben', 400);
    if (!['berater', 'unternehmen'].includes(rolle)) return err('Rolle muss "berater" oder "unternehmen" sein', 400);
    const existing = await env.PLATFORM_DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first();
    if (existing) return err('E-Mail bereits registriert', 409);
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const userId = crypto.randomUUID().replace(/-/g, '');
    const name = `${first_name} ${last_name}`;
    const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(
      `INSERT INTO users (id, email, password_hash, password_salt, first_name, last_name, name, company, phone, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, email, passwordHash, salt, first_name, last_name, name, company || null, phone || null, rolle, now).run();
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await env.PLATFORM_DB.prepare(
      `INSERT INTO email_verification_codes (id, user_id, email, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, 'registration', ?, ?)`
    ).bind(crypto.randomUUID().replace(/-/g, ''), userId, email, code, expiresAt, now).run();
    if (rolle === 'berater') {
      await env.PLATFORM_DB.prepare(
        `INSERT INTO berater_profiles (id, user_id, display_name, region, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?)`
      ).bind(crypto.randomUUID().replace(/-/g, ''), userId, name, now, now).run();
    }
    const token = await signJWT({ userId, email, role: rolle, name }, env.JWT_SECRET);

    // === AUTOMATISIERUNG: Admin-Alert bei neuer Registrierung ===
    await createAdminAlert(env, 'neue_registrierung', rolle === 'berater' ? 'hoch' : 'normal',
      `Neue Registrierung: ${name} (${rolle})`,
      `Email: ${email} | Firma: ${company || '-'} | Rolle: ${rolle}`,
      'user', userId);

    return json({ success: true, token, user: { id: userId, email, first_name, last_name, name, role: rolle, company: company || null, email_verified: false }, verification_code: code }, 201);
  } catch (e) { console.error('Register error:', e); return err('Registrierung fehlgeschlagen', 500); }
}

async function loginUser(request, env) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return err('E-Mail und Passwort erforderlich', 400);
    const user = await env.PLATFORM_DB.prepare(
      `SELECT id, email, password_hash, password_salt, first_name, last_name, name, role, email_verified, company, phone FROM users WHERE email = ? AND deleted_at IS NULL`
    ).bind(email).first();
    if (!user) return err('Ungültige Anmeldedaten', 401);
    const passwordHash = await hashPassword(password, user.password_salt);
    if (passwordHash !== user.password_hash) return err('Ungültige Anmeldedaten', 401);
    await env.PLATFORM_DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run();
    const token = await signJWT({ userId: user.id, email: user.email, role: user.role, name: user.name }, env.JWT_SECRET);
    return json({ success: true, token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, name: user.name, role: user.role, email_verified: user.email_verified === 1, company: user.company } });
  } catch (e) { console.error('Login error:', e); return err('Anmeldung fehlgeschlagen', 500); }
}

async function verifyEmailCode(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const { code } = await request.json();
    if (!code) return err('Verifizierungscode erforderlich', 400);
    const rec = await env.PLATFORM_DB.prepare(
      `SELECT id FROM email_verification_codes WHERE user_id = ? AND code = ? AND type = 'registration' AND expires_at > datetime('now') AND used_at IS NULL`
    ).bind(auth.userId, code).first();
    if (!rec) return err('Ungültiger oder abgelaufener Code', 400);
    await env.PLATFORM_DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(auth.userId).run();
    await env.PLATFORM_DB.prepare('UPDATE email_verification_codes SET used_at = ? WHERE id = ?').bind(new Date().toISOString(), rec.id).run();
    return json({ success: true, message: 'E-Mail erfolgreich verifiziert' });
  } catch (e) { console.error('Verify error:', e); return err('Verifizierung fehlgeschlagen', 500); }
}

async function getMe(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare(
      `SELECT id, email, first_name, last_name, name, role, company, phone, website, ust_id, email_verified, kontingent_total, kontingent_used, onboarding_done, created_at, last_login_at FROM users WHERE id = ? AND deleted_at IS NULL`
    ).bind(auth.userId).first();
    if (!user) return err('Benutzer nicht gefunden', 404);
    let berater_profil = null;
    if (user.role === 'berater') {
      berater_profil = await env.PLATFORM_DB.prepare('SELECT * FROM berater_profiles WHERE user_id = ?').bind(auth.userId).first();
    }
    return json({ success: true, ...user, email_verified: user.email_verified === 1, onboarding_done: user.onboarding_done === 1, berater_profil });
  } catch (e) { console.error('GetMe error:', e); return err('Profil konnte nicht geladen werden', 500); }
}

async function updateMe(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const body = await request.json();
    const allowed = ['first_name', 'last_name', 'name', 'company', 'phone', 'website', 'ust_id'];
    const updates = []; const vals = [];
    for (const f of allowed) { if (f in body) { updates.push(`${f} = ?`); vals.push(body[f]); } }
    if (!updates.length) return err('Keine gültigen Felder zum Aktualisieren', 400);
    vals.push(auth.userId);
    await env.PLATFORM_DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true, message: 'Profil aktualisiert' });
  } catch (e) { console.error('UpdateMe error:', e); return err('Aktualisierung fehlgeschlagen', 500); }
}

async function requestPasswordReset(request, env) {
  try {
    const { email } = await request.json();
    if (!email) return err('E-Mail erforderlich', 400);
    const user = await env.PLATFORM_DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first();
    if (user) {
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await env.PLATFORM_DB.prepare(
        `INSERT INTO email_verification_codes (id, user_id, email, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, 'password_reset', ?, ?)`
      ).bind(crypto.randomUUID().replace(/-/g, ''), user.id, email, code, expiresAt, new Date().toISOString()).run();
      return json({ success: true, message: 'Reset-Code gesendet', reset_code: code });
    }
    return json({ success: true, message: 'Reset-Code gesendet' });
  } catch (e) { console.error('Password reset error:', e); return err('Passwort-Reset fehlgeschlagen', 500); }
}

async function resetPassword(request, env) {
  try {
    const { email, code, new_password } = await request.json();
    if (!email || !code || !new_password) return err('Pflichtfelder fehlen', 400);
    if (new_password.length < 8) return err('Passwort muss mindestens 8 Zeichen haben', 400);
    const user = await env.PLATFORM_DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first();
    if (!user) return err('Ungültige Angaben', 400);
    const rec = await env.PLATFORM_DB.prepare(
      `SELECT id FROM email_verification_codes WHERE user_id = ? AND code = ? AND type = 'password_reset' AND expires_at > datetime('now') AND used_at IS NULL`
    ).bind(user.id, code).first();
    if (!rec) return err('Ungültiger oder abgelaufener Code', 400);
    const salt = generateSalt();
    const passwordHash = await hashPassword(new_password, salt);
    await env.PLATFORM_DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(passwordHash, salt, user.id).run();
    await env.PLATFORM_DB.prepare('UPDATE email_verification_codes SET used_at = ? WHERE id = ?').bind(new Date().toISOString(), rec.id).run();
    return json({ success: true, message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (e) { console.error('Reset password error:', e); return err('Passwort-Reset fehlgeschlagen', 500); }
}

// --- Rate Limiting (simple in-memory per request with lazy cleanup) ---

const RATE_LIMITS = new Map();
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL = 60000; // 60 seconds
const RATE_WINDOW = 60000; // 60 second window for rate limiting
const MAX_ENTRIES = 10000; // Cap to prevent unbounded growth

function cleanupRateLimits() {
  const now = Date.now();

  // Remove entries with all timestamps older than the rate window
  for (const [key, timestamps] of RATE_LIMITS.entries()) {
    const recentTimestamps = timestamps.filter((t) => now - t < RATE_WINDOW);
    if (recentTimestamps.length === 0) {
      RATE_LIMITS.delete(key);
    } else {
      RATE_LIMITS.set(key, recentTimestamps);
    }
  }

  // If still over capacity, remove oldest half of entries
  if (RATE_LIMITS.size > MAX_ENTRIES) {
    const entriesToDelete = Math.ceil(RATE_LIMITS.size / 2);
    let deleted = 0;
    for (const key of RATE_LIMITS.keys()) {
      if (deleted >= entriesToDelete) break;
      RATE_LIMITS.delete(key);
      deleted++;
    }
  }

  lastCleanupTime = now;
}

function checkRate(key, maxPerMin = 20) {
  const now = Date.now();

  // Lazy cleanup: only if last cleanup was >60 seconds ago
  if (now - lastCleanupTime > CLEANUP_INTERVAL) {
    cleanupRateLimits();
  }

  const window = RATE_LIMITS.get(key) || [];
  const recent = window.filter((t) => now - t < RATE_WINDOW);
  if (recent.length >= maxPerMin) return false;
  recent.push(now);
  RATE_LIMITS.set(key, recent);
  return true;
}

// --- Vorhaben → Förderbereiche Mapping (Fördermittel-Check) ---

const VORHABEN_MAP_FOERDER = {
  digitalisierung: ["Digitalisierung", "Innovation & Technologie", "Unternehmensfinanzierung"],
  energie: ["Energieeffizienz & Erneuerbare Energien", "Umwelt- & Naturschutz", "Infrastruktur"],
  gruendung: ["Existenzgründung & -festigung", "Unternehmensfinanzierung", "Beratung"],
  innovation: ["Innovation & Technologie", "Forschung & Entwicklung (FuE)", "Digitalisierung"],
  export: ["Außenwirtschaft", "Unternehmensfinanzierung", "Messeförderung"],
  personal: ["Aus- & Weiterbildung", "Arbeit", "Fachkräfte"],
  umwelt: ["Umwelt- & Naturschutz", "Energieeffizienz & Erneuerbare Energien", "Infrastruktur"],
  investition: ["Unternehmensfinanzierung", "Gewerbliche Wirtschaft", "Regionalförderung"],
  forschung: ["Forschung & Entwicklung (FuE)", "Innovation & Technologie", "Hochschule & Forschung"],
  beratung: ["Beratung", "Existenzgründung & -festigung", "Unternehmensfinanzierung"],
};

// ============================================================
// MATCHING ALGORITHM – Berater-Matching (from matching.js)
// ============================================================

/**
 * Map of German Bundesländer to neighboring states for partial region matching
 */
const NEIGHBORING_BUNDESLAENDER = {
  'Baden-Württemberg': ['Bavaria', 'Hesse', 'Rhineland-Palatinate'],
  'Bayern': ['Baden-Württemberg', 'Hesse', 'Thuringia', 'Saxony', 'Czech Republic'],
  'Berlin': ['Brandenburg'],
  'Brandenburg': ['Berlin', 'Mecklenburg-Vorpommern', 'Saxony', 'Saxony-Anhalt'],
  'Bremen': ['Lower Saxony'],
  'Hamburg': ['Lower Saxony', 'Schleswig-Holstein'],
  'Hesse': ['Baden-Württemberg', 'Bavaria', 'Lower Saxony', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Thuringia'],
  'Mecklenburg-Vorpommern': ['Brandenburg', 'Schleswig-Holstein'],
  'Lower Saxony': ['Bremen', 'Hamburg', 'Hesse', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Schleswig-Holstein'],
  'North Rhine-Westphalia': ['Hesse', 'Lower Saxony', 'Rhineland-Palatinate'],
  'Rhineland-Palatinate': ['Baden-Württemberg', 'Bavaria', 'Hesse', 'North Rhine-Westphalia', 'Saarland'],
  'Saarland': ['Rhineland-Palatinate'],
  'Saxony': ['Bavaria', 'Brandenburg', 'Saxony-Anhalt', 'Thuringia'],
  'Saxony-Anhalt': ['Brandenburg', 'Hesse', 'Lower Saxony', 'North Rhine-Westphalia', 'Saxony', 'Thuringia'],
  'Schleswig-Holstein': ['Hamburg', 'Lower Saxony', 'Mecklenburg-Vorpommern'],
  'Thuringia': ['Bavaria', 'Brandenburg', 'Hesse', 'Saxony', 'Saxony-Anhalt'],
};

/**
 * Map of related industries for partial industry matching
 */
const BRANCHEN_MAP = {
  'IT / Software': ['Digitalisierung', 'Technologie', 'Digital', 'Software', 'E-Commerce', 'Tech-Startups'],
  'Handwerk': ['Handwerksbetriebe', 'Bau', 'Fertigung', 'Produktion', 'Mittelstand'],
  'Einzelhandel': ['Retail', 'Verkauf', 'E-Commerce', 'Online-Shop', 'Vertrieb'],
  'Gastronomie': ['Hotels', 'Tourismus', 'Beherbergung', 'Freizeitwirtschaft'],
  'Manufaktur': ['Handwerk', 'Fertigung', 'Produktion', 'Kleine und mittlere Unternehmen'],
  'Logistik': ['Transport', 'Supply Chain', 'Lagerwirtschaft', 'Verkehrswirtschaft'],
  'Green Energy': ['Erneuerbare Energien', 'Klimaschutz', 'Nachhaltigkeit', 'Umweltschutz'],
  'Consulting': ['Beratung', 'Management', 'Interim Management', 'Business Development'],
  'Bildung': ['EdTech', 'E-Learning', 'Schulung', 'Training'],
  'Medtech / Pharma': ['Gesundheit', 'Medizin', 'Biotechnologie', 'Pharmazie'],
  'Finance': ['Fintech', 'Versicherung', 'Banking', 'Finanzen'],
  'Industrie 4.0': ['Smart Manufacturing', 'Automation', 'Digitale Fertigung', 'IoT'],
};

/**
 * Map of Vorhaben (user intents) to relevant Spezialisierung keywords
 */
const VORHABEN_MAP = {
  'Digitalisierung': ['Digitalisierung', 'Digital', 'IT', 'Software', 'E-Commerce', 'Automation', 'Cloud'],
  'Expansion': ['Expansion', 'Wachstum', 'Markterschließung', 'Internationalisierung', 'Vertrieb'],
  'Gründung': ['Gründung', 'Startup', 'Businessplan', 'Finanzierung', 'MVP'],
  'Ressourceneffizienz': ['Ressourceneffizienz', 'Nachhaltigkeit', 'Green', 'Umweltschutz', 'KVP'],
  'Prozessoptimierung': ['Prozessoptimierung', 'Lean', 'Effizienz', 'KVP', 'Automation', 'Six Sigma'],
  'Personal- / Fachkräfteentwicklung': ['Personal', 'Fachkräfte', 'Training', 'Schulung', 'Entwicklung', 'HR'],
  'Finanzierung': ['Finanzierung', 'Fördermittel', 'Grants', 'Eigenkapital', 'Kredite'],
  'Geschäftsmodellinnovation': ['Business Model', 'Innovation', 'Transformation', 'Geschäftsmodell'],
  'Industrie 4.0': ['Industrie 4.0', 'Smart Manufacturing', 'IoT', 'Automation', 'Digitale Fertigung'],
  'Export': ['Export', 'Internationalisierung', 'Markteintritt', 'Handelsmarken'],
};

/**
 * Points system configuration
 */
const SCORING_CONFIG = {
  region: {
    exact: 25,
    neighboring: 15,
    bundesweit: 20,
    default: 0,
  },
  branche: {
    exact: 25,
    related: 15,
    default: 0,
  },
  spezialisierung: {
    max: 25,
  },
  bewertung: {
    max: 15,
  },
  verifizierung: {
    verified: 10,
    unverified: 0,
  },
};

/**
 * Validate and sanitize input parameters
 */
function validateInput(params) {
  const { bundesland, branche, vorhaben, budget_range, keywords } = params;

  if (!bundesland || typeof bundesland !== 'string') {
    throw new Error('Bundesland is required and must be a string');
  }

  if (!branche || typeof branche !== 'string') {
    throw new Error('Branche is required and must be a string');
  }

  if (!vorhaben || typeof vorhaben !== 'string') {
    throw new Error('Vorhaben is required and must be a string');
  }

  if (budget_range && typeof budget_range !== 'string') {
    throw new Error('Budget_range must be a string if provided');
  }

  if (keywords && !Array.isArray(keywords)) {
    throw new Error('Keywords must be an array if provided');
  }

  if (keywords && keywords.some(k => typeof k !== 'string')) {
    throw new Error('All keywords must be strings');
  }

  // Normalize inputs
  return {
    bundesland: bundesland.trim(),
    branche: branche.trim(),
    vorhaben: vorhaben.trim(),
    budget_range: budget_range ? budget_range.trim() : null,
    keywords: keywords ? keywords.map(k => k.trim().toLowerCase()) : [],
  };
}

/**
 * Calculate region matching score
 */
function scoreRegion(consulantRegion, companyBundesland) {
  if (!consulantRegion) {
    return { score: 0, reason: 'no_region_data' };
  }

  const regions = consulantRegion.split(',').map(r => r.trim().toLowerCase());
  const searchBundesland = companyBundesland.toLowerCase();

  // Exact match
  if (regions.some(r => r === searchBundesland || r === 'bundesweit')) {
    return {
      score: regions.includes('bundesweit')
        ? SCORING_CONFIG.region.bundesweit
        : SCORING_CONFIG.region.exact,
      reason: 'exact_match',
    };
  }

  // Check if consultant operates nationwide
  if (regions.includes('bundesweit')) {
    return { score: SCORING_CONFIG.region.bundesweit, reason: 'bundesweit' };
  }

  // Check neighboring Bundesländer
  const neighbors = NEIGHBORING_BUNDESLAENDER[companyBundesland] || [];
  if (neighbors.some(n => regions.some(r => r === n.toLowerCase()))) {
    return { score: SCORING_CONFIG.region.neighboring, reason: 'neighboring' };
  }

  return { score: SCORING_CONFIG.region.default, reason: 'no_match' };
}

/**
 * Calculate industry matching score
 */
function scoreBranche(consulantBranches, companyBranche) {
  if (!consulantBranches) {
    return { score: 0, reason: 'no_industry_data' };
  }

  const branches = consulantBranches.split(',').map(b => b.trim().toLowerCase());
  const searchBranche = companyBranche.toLowerCase();

  // Exact match
  if (branches.some(b => b === searchBranche)) {
    return { score: SCORING_CONFIG.branche.exact, reason: 'exact_match' };
  }

  // Check for related industries
  const relatedBranches = BRANCHEN_MAP[companyBranche] || [];
  if (relatedBranches.some(rb =>
    branches.some(b => b === rb.toLowerCase() || b.includes(rb.toLowerCase()))
  )) {
    return { score: SCORING_CONFIG.branche.related, reason: 'related_industry' };
  }

  return { score: SCORING_CONFIG.branche.default, reason: 'no_match' };
}

/**
 * Calculate specialization matching score
 */
function scoreSpezialisierung(spezialisierung, vorhaben, keywords = []) {
  if (!spezialisierung) {
    return { score: 0, reason: 'no_specialization_data' };
  }

  const specs = spezialisierung.split(',').map(s => s.trim().toLowerCase());
  const vorhabenLower = vorhaben.toLowerCase();
  const searchTerms = [vorhabenLower, ...keywords].map(k => k.toLowerCase());

  let matchScore = 0;
  const matchedSpecs = [];

  // Direct specialization matches
  searchTerms.forEach(term => {
    specs.forEach(spec => {
      if (spec.includes(term) || term.includes(spec)) {
        matchScore = Math.min(matchScore + 5, SCORING_CONFIG.spezialisierung.max);
        if (!matchedSpecs.includes(spec)) {
          matchedSpecs.push(spec);
        }
      }
    });
  });

  // Vorhaben keyword expansion
  const expandedTerms = VORHABEN_MAP[vorhaben] || [];
  expandedTerms.forEach(expandedTerm => {
    specs.forEach(spec => {
      if (spec.includes(expandedTerm.toLowerCase())) {
        matchScore = Math.min(matchScore + 3, SCORING_CONFIG.spezialisierung.max);
        if (!matchedSpecs.includes(spec)) {
          matchedSpecs.push(spec);
        }
      }
    });
  });

  return {
    score: matchScore,
    reason: matchScore > 0 ? 'matched' : 'no_match',
    matched_specs: matchedSpecs,
  };
}

/**
 * Calculate rating/review score
 */
function scoreBewertung(avgBewertung, anzahlBewertungen) {
  if (!avgBewertung || anzahlBewertungen === 0) {
    return { score: 0, reason: 'no_ratings' };
  }

  // Only count if at least 2 reviews
  if (anzahlBewertungen < 2) {
    return { score: 0, reason: 'insufficient_ratings' };
  }

  const score = (avgBewertung / 5) * SCORING_CONFIG.bewertung.max;
  return {
    score: Math.round(score * 10) / 10,
    reason: 'calculated',
  };
}

/**
 * Calculate verification score
 */
function scoreVerifizierung(verifiziert) {
  return verifiziert ? SCORING_CONFIG.verifizierung.verified : SCORING_CONFIG.verifizierung.unverified;
}

/**
 * Calculate total matching score for a single consultant
 */
function calculateScore(berater, filters) {
  const regionScore = scoreRegion(berater.regionen, filters.bundesland);
  const brancheScore = scoreBranche(berater.branchen, filters.branche);
  const spezScore = scoreSpezialisierung(berater.spezialisierung, filters.vorhaben, filters.keywords);
  const bewertungScore = scoreBewertung(berater.avg_bewertung, berater.anzahl_bewertungen);
  const verifScore = scoreVerifizierung(berater.verifiziert);

  const totalScore =
    regionScore.score +
    brancheScore.score +
    spezScore.score +
    bewertungScore.score +
    verifScore;

  return {
    total: Math.round(totalScore * 10) / 10,
    breakdown: {
      region: regionScore.score,
      branche: brancheScore.score,
      spezialisierung: spezScore.score,
      bewertung: bewertungScore.score,
      verifizierung: verifScore,
    },
    details: {
      region_reason: regionScore.reason,
      branche_reason: brancheScore.reason,
      spezialisierung_reason: spezScore.reason,
      bewertung_reason: bewertungScore.reason,
    },
  };
}

/**
 * Fetch consultant profiles with ratings from PLATFORM_DB
 */
async function fetchBeraterProfiles(db) {
  try {
    const query = `
      SELECT
        bp.id,
        bp.user_id,
        u.name,
        u.email,
        bp.display_name as unternehmen,
        bp.spezialisierungen as spezialisierung,
        bp.region as regionen,
        bp.branchen,
        bp.bio,
        bp.photo_url as profilbild_url,
        bp.verfuegbar as verifiziert,
        bp.created_at,
        COALESCE(ROUND(AVG(bb.sterne), 2), 0) as avg_bewertung,
        COALESCE(COUNT(bb.id), 0) as anzahl_bewertungen
      FROM berater_profiles bp
      LEFT JOIN berater_bewertungen bb ON bp.id = bb.berater_profile_id
      LEFT JOIN users u ON bp.user_id = u.id
      GROUP BY bp.id, bp.user_id, u.name, u.email, bp.display_name,
               bp.spezialisierungen, bp.region, bp.branchen, bp.bio,
               bp.photo_url, bp.verfuegbar, bp.created_at
      ORDER BY anzahl_bewertungen DESC, avg_bewertung DESC
    `;

    const result = await db.prepare(query).all();
    return result.results || [];
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Failed to fetch consultant profiles: ${error.message}`);
  }
}

/**
 * Fetch a single berater profile by ID
 */
async function fetchBeraterById(db, id) {
  try {
    const query = `
      SELECT
        bp.id,
        bp.user_id,
        u.name,
        u.email,
        bp.display_name as unternehmen,
        bp.spezialisierungen as spezialisierung,
        bp.region as regionen,
        bp.branchen,
        bp.bio,
        bp.photo_url as profilbild_url,
        bp.verfuegbar as verifiziert,
        bp.created_at,
        COALESCE(ROUND(AVG(bb.sterne), 2), 0) as avg_bewertung,
        COALESCE(COUNT(bb.id), 0) as anzahl_bewertungen
      FROM berater_profiles bp
      LEFT JOIN berater_bewertungen bb ON bp.id = bb.berater_profile_id
      LEFT JOIN users u ON bp.user_id = u.id
      WHERE bp.id = ?
      GROUP BY bp.id, bp.user_id, u.name, u.email, bp.display_name,
               bp.spezialisierungen, bp.region, bp.branchen, bp.bio,
               bp.photo_url, bp.verfuegbar, bp.created_at
    `;

    return await db.prepare(query).bind(id).first();
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Failed to fetch consultant: ${error.message}`);
  }
}

// ============================================================
// MATCHING ROUTES
// ============================================================

/**
 * GET /api/matching/berater?vorhaben=...&bundesland=...&branche=...
 * Search and score matching consultants
 */
async function searchMatchingBerater(request, env) {
  try {
    const url = new URL(request.url);
    const vorhaben = url.searchParams.get('vorhaben');
    const bundesland = url.searchParams.get('bundesland');
    const branche = url.searchParams.get('branche');

    // Validate input parameters
    if (!vorhaben || !bundesland || !branche) {
      return err('Missing required parameters: vorhaben, bundesland, branche', 400);
    }

    // Prepare filters
    const filters = validateInput({
      vorhaben,
      bundesland,
      branche,
      keywords: [],
    });

    // Get database instance
    const db = env.PLATFORM_DB;
    if (!db) {
      throw new Error('PLATFORM_DB binding not configured');
    }

    // Fetch all consultant profiles
    const berater = await fetchBeraterProfiles(db);

    if (!berater || berater.length === 0) {
      return json({
        matches: [],
        total: 0,
        filters_applied: filters,
        message: 'No consultants found in database',
      });
    }

    // Score each consultant
    const scoredBerater = berater.map(b => {
      const scoreResult = calculateScore(b, filters);
      return {
        berater_id: b.id,
        user_id: b.user_id,
        name: b.name || 'Unknown',
        email: b.email || null,
        unternehmen: b.unternehmen || null,
        score: scoreResult.total,
        score_breakdown: scoreResult.breakdown,
        score_details: scoreResult.details,
        spezialisierung: b.spezialisierung ? b.spezialisierung.split(',').map(s => s.trim()) : [],
        regionen: b.regionen ? b.regionen.split(',').map(r => r.trim()) : [],
        branchen: b.branchen ? b.branchen.split(',').map(br => br.trim()) : [],
        bio: b.bio || null,
        avg_bewertung: parseFloat(b.avg_bewertung) || 0,
        anzahl_bewertungen: parseInt(b.anzahl_bewertungen, 10) || 0,
        bafa_verifiziert: Boolean(b.verifiziert),
        bafa_id: b.bafa_id || null,
        profilbild_url: b.profilbild_url || null,
        created_at: b.created_at || null,
      };
    });

    // Sort by score and return only matches with score > 0
    const sortedMatches = scoredBerater
      .sort((a, b) => b.score - a.score)
      .filter(match => match.score > 0);

    return json({
      matches: sortedMatches,
      total: sortedMatches.length,
      filters_applied: filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Matching search error:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    return err(error.message || 'Internal server error', statusCode);
  }
}

/**
 * GET /api/matching/berater/:id
 * Get single consultant with score (if matching context provided)
 */
async function getBeraterDetail(request, env, beraterId) {
  try {
    const url = new URL(request.url);
    const vorhaben = url.searchParams.get('vorhaben');
    const bundesland = url.searchParams.get('bundesland');
    const branche = url.searchParams.get('branche');

    const db = env.PLATFORM_DB;
    if (!db) {
      throw new Error('PLATFORM_DB binding not configured');
    }

    // Fetch consultant by ID
    const berater = await fetchBeraterById(db, beraterId);

    if (!berater) {
      return err('Consultant not found', 404);
    }

    // Format response
    const response = {
      berater_id: berater.id,
      user_id: berater.user_id,
      name: berater.name || 'Unknown',
      email: berater.email || null,
      unternehmen: berater.unternehmen || null,
      spezialisierung: berater.spezialisierung ? berater.spezialisierung.split(',').map(s => s.trim()) : [],
      regionen: berater.regionen ? berater.regionen.split(',').map(r => r.trim()) : [],
      branchen: berater.branchen ? berater.branchen.split(',').map(br => br.trim()) : [],
      bio: berater.bio || null,
      avg_bewertung: parseFloat(berater.avg_bewertung) || 0,
      anzahl_bewertungen: parseInt(berater.anzahl_bewertungen, 10) || 0,
      bafa_verifiziert: Boolean(berater.verifiziert),
      bafa_id: berater.bafa_id || null,
      profilbild_url: berater.profilbild_url || null,
      created_at: berater.created_at || null,
    };

    // Calculate score if matching parameters provided
    if (vorhaben && bundesland && branche) {
      const filters = validateInput({
        vorhaben,
        bundesland,
        branche,
        keywords: [],
      });

      const scoreResult = calculateScore(berater, filters);
      response.matching_score = scoreResult.total;
      response.score_breakdown = scoreResult.breakdown;
      response.score_details = scoreResult.details;
    }

    return json({
      success: true,
      berater: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Berater detail error:', error);
    const statusCode = error.message.includes('required') ? 400 : 500;
    return err(error.message || 'Internal server error', statusCode);
  }
}

// --- Workers AI Wrapper ---

async function askWorkersAI(env, systemPrompt, userPrompt, maxTokens = 1024) {
  try {
    const resp = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.6,
    });
    return resp?.response || null;
  } catch (e) {
    console.error("[Workers AI Error]", e.message);
    return null;
  }
}

// --- External AI (GPT-4o / Claude) ---

async function askExternalAI(env, systemPrompt, userPrompt, maxTokens = 4096) {
  const provider = env.EXTERNAL_AI_PROVIDER || "openai";
  const apiKey = env.EXTERNAL_AI_KEY;

  if (!apiKey) {
    // Fallback to Workers AI if no external key configured
    return askWorkersAI(env, systemPrompt, userPrompt, Math.min(maxTokens, 2048));
  }

  try {
    if (provider === "anthropic") {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await resp.json();
      return data.content?.[0]?.text || null;
    } else {
      // OpenAI-compatible (OpenRouter, OpenAI, etc.)
      const baseUrl = env.EXTERNAL_AI_BASE_URL || "https://openrouter.ai/api";
      const model = env.EXTERNAL_AI_MODEL || "anthropic/claude-sonnet-4";
      const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://zfbf.info",
          "X-Title": "ZFBF Foerdermittel-Check",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (e) {
    console.error("[External AI Error]", e.message);
    // Fallback
    return askWorkersAI(env, systemPrompt, userPrompt, Math.min(maxTokens, 2048));
  }
}

// --- Helpers ---

function uuid() {
  return crypto.randomUUID().replace(/-/g, "");
}

function tryParseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

// ============================================================
// ROUTE HANDLERS – FÖRDERMITTEL-CHECK
// ============================================================

// --- POST /api/checks – Neuen Check starten ---

async function createCheck(request, env) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return err("Ungültige Anfrage");

    const required = ["firmenname", "branche", "bundesland", "vorhaben"];
    for (const field of required) {
      if (!body[field]?.trim()) return err(`Feld '${field}' ist erforderlich`);
    }

    const user = await optionalAuth(request, env);
    const sessionId = uuid();

    // Insert session
    await env.CHECK_DB.prepare(`
      INSERT INTO check_sessions (id, user_id, email, firmenname, rechtsform, branche, unterbranche,
        bundesland, plz, mitarbeiter, jahresumsatz, gruendungsjahr, vorhaben, vorhaben_details,
        investitionsvolumen, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'chat')
    `).bind(
      sessionId,
      user?.userId || null,
      body.email || user?.email || null,
      body.firmenname.trim(),
      body.rechtsform || null,
      body.branche.trim(),
      body.unterbranche || null,
      body.bundesland.trim(),
      body.plz || null,
      body.mitarbeiter || null,
      body.jahresumsatz || null,
      body.gruendungsjahr || null,
      body.vorhaben.trim(),
      body.vorhaben_details || null,
      body.investitionsvolumen || null
    ).run();

    // SQL-Vorfilterung der Förderprogramme
    const bereiche = VORHABEN_MAP_FOERDER[body.vorhaben.toLowerCase()] || ["Unternehmensfinanzierung"];
    const bereichFilter = bereiche.map(() => "foerderbereich LIKE ?").join(" OR ");
    const bereichParams = bereiche.map((b) => `%${b}%`);

    const vorfilter = await env.FOERDER_DB.prepare(`
      SELECT COUNT(*) as count FROM foerderprogramme
      WHERE (foerdergebiet = ? OR foerdergebiet = 'bundesweit' OR foerdergebiet LIKE '%' || ? || '%')
        AND (${bereichFilter})
    `).bind(body.bundesland.trim(), body.bundesland.trim(), ...bereichParams).first();

    // Workers AI: Gezielte Rückfragen generieren
    const systemPrompt = `Du bist ein erfahrener deutscher Fördermittel-Berater. Deine Aufgabe ist es, gezielte Fragen zu stellen, um die Förderfähigkeit eines Unternehmens einzuschätzen. Antworte ausschließlich auf Deutsch. Sei freundlich, professionell und präzise. Gib genau 4 Fragen zurück als JSON-Array: ["Frage 1", "Frage 2", "Frage 3", "Frage 4"]`;

    const userPrompt = `Ein Unternehmen möchte einen Fördermittel-Check durchführen. Hier die bisherigen Angaben:
- Firma: ${body.firmenname}
- Branche: ${body.branche}${body.unterbranche ? ` (${body.unterbranche})` : ""}
- Bundesland: ${body.bundesland}
- Mitarbeiter: ${body.mitarbeiter || "nicht angegeben"}
- Jahresumsatz: ${body.jahresumsatz ? body.jahresumsatz + " EUR" : "nicht angegeben"}
- Gründungsjahr: ${body.gruendungsjahr || "nicht angegeben"}
- Vorhaben: ${body.vorhaben}
- Details: ${body.vorhaben_details || "nicht angegeben"}
- Investitionsvolumen: ${body.investitionsvolumen ? body.investitionsvolumen + " EUR" : "nicht angegeben"}

Es kommen ca. ${vorfilter?.count || 0} Förderprogramme in Frage. Erstelle 4 gezielte Rückfragen, die helfen, die Auswahl einzugrenzen. Fokussiere auf: De-minimis-Status, bestehende Förderungen, Zeitrahmen, spezifische Anforderungen des Vorhabens.

Antworte NUR mit dem JSON-Array.`;

    const aiResp = await askWorkersAI(env, systemPrompt, userPrompt, 512);
    let fragen = ["Haben Sie in den letzten 3 Jahren bereits Fördermittel erhalten? Wenn ja, welche und in welcher Höhe?",
      "Wann planen Sie mit der Umsetzung des Vorhabens zu beginnen?",
      "Befindet sich Ihr Unternehmen aktuell in wirtschaftlichen Schwierigkeiten (z.B. Insolvenzverfahren, Überschuldung)?",
      "Planen Sie im Rahmen des Vorhabens neue Arbeitsplätze zu schaffen?"];

    if (aiResp) {
      const parsed = tryParseJSON(aiResp);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        fragen = parsed.slice(0, 5);
      }
    }

    // Store initial agent message
    const begruessung = `Willkommen zum Fördermittel-Check für **${body.firmenname}**! Basierend auf Ihren Angaben kommen ca. **${vorfilter?.count || 0} Förderprogramme** aus den Bereichen ${bereiche.join(", ")} in Frage. Um die passenden Programme zu finden, habe ich ein paar Fragen:`;

    await env.CHECK_DB.prepare(`
      INSERT INTO check_chat (id, session_id, rolle, nachricht, metadata)
      VALUES (?, ?, 'agent', ?, ?)
    `).bind(uuid(), sessionId, begruessung, JSON.stringify({ fragen, vorfilter_count: vorfilter?.count || 0 })).run();

    return json({
      success: true,
      session_id: sessionId,
      status: "chat",
      vorfilter_treffer: vorfilter?.count || 0,
      bereiche,
      begruessung,
      fragen,
    });
  } catch (error) {
    console.error('[createCheck] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- POST /api/checks/:id/chat – Chat-Nachricht ---

async function chatMessage(request, env, sessionId) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.nachricht?.trim()) return err("Nachricht ist erforderlich");

    // Load session
    const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);
    if (!["chat", "dokumente"].includes(session.status)) return err("Chat nicht verfügbar in diesem Status");

    // Rate limit
    if (!checkRate(`chat:${sessionId}`, 30)) return err("Zu viele Nachrichten. Bitte warten.", 429);

    // Save user message
    await env.CHECK_DB.prepare(`
      INSERT INTO check_chat (id, session_id, rolle, nachricht) VALUES (?, ?, 'user', ?)
    `).bind(uuid(), sessionId, body.nachricht.trim()).run();

    // Load chat history
    const history = await env.CHECK_DB.prepare(`
      SELECT rolle, nachricht FROM check_chat WHERE session_id = ? ORDER BY created_at ASC
    `).bind(sessionId).all();

    const chatContext = history.results.map((m) => `${m.rolle === "user" ? "Nutzer" : "Berater"}: ${m.nachricht}`).join("\n\n");
    const messageCount = history.results.filter((m) => m.rolle === "user").length;

    // Build AI prompt
    const systemPrompt = `Du bist ein erfahrener Fördermittel-Berater für deutsche Unternehmen. Du führst gerade einen Fördermittel-Check für das Unternehmen "${session.firmenname}" durch.

Dein Ziel: Durch gezielte Fragen alle Informationen sammeln, die nötig sind, um passende Förderprogramme zu identifizieren.

Wichtige Themen, die du abdecken solltest:
- De-minimis-Beihilfen (max. 300.000€ in 3 Jahren)
- EU-Beihilferecht und AGVO
- KMU-Status (< 250 MA, < 50 Mio € Umsatz, < 43 Mio € Bilanzsumme)
- Bestehende Förderungen und Doppelförderungsverbot
- Zeitrahmen und Projektstart (oft: Antrag VOR Projektbeginn!)
- Investitionsdetails und Kostenplan
- Besondere Kriterien (Energieeffizienz, Innovation, Nachhaltigkeit)

Regeln:
- Stelle 1-2 Fragen pro Antwort
- Sei freundlich und professionell
- Erkläre kurz, warum du die Frage stellst
- Extrahiere aus jeder Nutzer-Antwort strukturierte Daten

${messageCount >= 6 ? "WICHTIG: Du hast bereits genug Informationen. Fasse die bisherigen Erkenntnisse zusammen und empfehle dem Nutzer, jetzt Dokumente hochzuladen für die detaillierte Analyse. Setze am Ende deiner Nachricht: [STATUS:DOKUMENTE]" : ""}

Antworte IMMER im folgenden Format:
1. Deine Antwort/Frage an den Nutzer
2. Am Ende: ---DATEN--- gefolgt von einem JSON-Objekt mit extrahierten Daten aus der Nutzer-Antwort (z.B. {"de_minimis_erhalten": false, "projektstart": "Q3 2026"})`;

    const userPrompt = `Unternehmensprofil:
- Firma: ${session.firmenname} (${session.rechtsform || "k.A."})
- Branche: ${session.branche}
- Bundesland: ${session.bundesland}
- Mitarbeiter: ${session.mitarbeiter || "k.A."}
- Umsatz: ${session.jahresumsatz ? session.jahresumsatz + "€" : "k.A."}
- Gründung: ${session.gruendungsjahr || "k.A."}
- Vorhaben: ${session.vorhaben} – ${session.vorhaben_details || ""}
- Investitionsvolumen: ${session.investitionsvolumen ? session.investitionsvolumen + "€" : "k.A."}

Bereits gesammelte Zusatzdaten: ${session.erweiterte_daten}

Bisheriger Chatverlauf:
${chatContext}`;

    const aiResp = await askWorkersAI(env, systemPrompt, userPrompt, 1024);
    if (!aiResp) return err("KI-Antwort konnte nicht generiert werden", 500);

    // Parse response: split text and extracted data
    let agentText = aiResp;
    let extractedData = {};
    let newStatus = session.status;

    if (aiResp.includes("---DATEN---")) {
      const parts = aiResp.split("---DATEN---");
      agentText = parts[0].trim();
      extractedData = tryParseJSON(parts[1]) || {};
    }

    // Check for status change signal
    if (aiResp.includes("[STATUS:DOKUMENTE]")) {
      agentText = agentText.replace("[STATUS:DOKUMENTE]", "").trim();
      newStatus = "dokumente";
    }

    // Merge extracted data
    const existingData = JSON.parse(session.erweiterte_daten || "{}");
    const mergedData = { ...existingData, ...extractedData };

    // Update session
    await env.CHECK_DB.prepare(`
      UPDATE check_sessions SET erweiterte_daten = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify(mergedData), newStatus, sessionId).run();

    // Save agent response
    await env.CHECK_DB.prepare(`
      INSERT INTO check_chat (id, session_id, rolle, nachricht, metadata) VALUES (?, ?, 'agent', ?, ?)
    `).bind(uuid(), sessionId, agentText, JSON.stringify({ extracted: extractedData })).run();

    return json({
      success: true,
      nachricht: agentText,
      status: newStatus,
      extracted_data: extractedData,
      nachricht_nr: messageCount + 1,
    });
  } catch (error) {
    console.error('[chatMessage] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- POST /api/checks/:id/docs – Dokument hochladen ---

async function uploadDocument(request, env, sessionId) {
  try {
    const session = await env.CHECK_DB.prepare("SELECT id, status FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    const formData = await request.formData().catch(() => null);
    if (!formData) return err("FormData erforderlich");

    const file = formData.get("datei");
    const typ = formData.get("typ") || "sonstiges";

    if (!file || !file.size) return err("Keine Datei hochgeladen");
    if (file.size > 10 * 1024 * 1024) return err("Datei zu groß (max. 10 MB)");

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) return err("Nur PDF, PNG und JPG erlaubt");

    // Upload to R2
    const docId = uuid();
    const r2Key = `checks/${sessionId}/${docId}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    await env.DOCS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: { sessionId, docId, typ },
    });

    // Save document record
    await env.CHECK_DB.prepare(`
      INSERT INTO check_dokumente (id, session_id, name, typ, datei_key, datei_groesse, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(docId, sessionId, file.name, typ, r2Key, file.size, file.type).run();

    // AI-Analyse des Dokuments (async – we'll do a quick analysis)
    let kiExtrakt = {};
    if (file.type === "application/pdf" || file.type.startsWith("image/")) {
      // For now, we use Workers AI to analyze document content
      // In production, you'd extract text from PDF first
      const analysisPrompt = `Analysiere das hochgeladene Dokument vom Typ "${typ}" für das Unternehmen.
Dokument-Name: ${file.name}
Dokument-Typ: ${typ}

Da ich den Dokumenteninhalt nicht direkt lesen kann, erstelle basierend auf dem Dokumenttyp eine Liste der typischerweise enthaltenen relevanten Daten:

${typ === "handelsregister" ? "Extrahiere: Rechtsform, Gründungsdatum, Sitz, Stammkapital, Geschäftsführer, Unternehmensgegenstand" : ""}
${typ === "jahresabschluss" ? "Extrahiere: Umsatzerlöse, Bilanzsumme, Eigenkapital, Mitarbeiteranzahl, Gewinn/Verlust, Verschuldungsgrad" : ""}
${typ === "businessplan" ? "Extrahiere: Geschäftsmodell, Zielmarkt, Investitionsplan, Umsatzprognose, Break-Even-Zeitpunkt" : ""}
${typ === "steuerbescheid" ? "Extrahiere: Steuerpflichtiges Einkommen, Steuerlast, Steuerart, Veranlagungszeitraum" : ""}

Antworte NUR mit einem JSON-Objekt der extrahierten/erwarteten Felder.`;

      const resp = await askWorkersAI(env, "Du bist ein Dokumentenanalyst für Fördermittelanträge. Antworte nur mit JSON.", analysisPrompt, 512);
      if (resp) {
        kiExtrakt = tryParseJSON(resp) || { hinweis: "Dokument hochgeladen, manuelle Prüfung empfohlen" };
      }
    }

    // Update document with analysis
    await env.CHECK_DB.prepare(`
      UPDATE check_dokumente SET ki_extrakt = ?, status = 'analysiert' WHERE id = ?
    `).bind(JSON.stringify(kiExtrakt), docId).run();

    // Update session status
    if (session.status === "chat") {
      await env.CHECK_DB.prepare(`UPDATE check_sessions SET status = 'dokumente', updated_at = datetime('now') WHERE id = ?`).bind(sessionId).run();
    }

    return json({
      success: true,
      dokument_id: docId,
      name: file.name,
      typ,
      ki_extrakt: kiExtrakt,
      status: "analysiert",
    });
  } catch (error) {
    console.error('[uploadDocument] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- POST /api/checks/:id/analyze – Hauptanalyse starten ---

async function analyzeCheck(request, env, sessionId) {
  try {
    const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    // Update status
    await env.CHECK_DB.prepare(`UPDATE check_sessions SET status = 'analyse', updated_at = datetime('now') WHERE id = ?`).bind(sessionId).run();

    // Load all data
    const docs = await env.CHECK_DB.prepare("SELECT * FROM check_dokumente WHERE session_id = ?").bind(sessionId).all();
    const chatSummary = await env.CHECK_DB.prepare(`
      SELECT rolle, nachricht FROM check_chat WHERE session_id = ? ORDER BY created_at ASC
    `).bind(sessionId).all();

    // Build company profile
    const profile = {
    firmenname: session.firmenname,
    rechtsform: session.rechtsform,
    branche: session.branche,
    unterbranche: session.unterbranche,
    bundesland: session.bundesland,
    plz: session.plz,
    mitarbeiter: session.mitarbeiter,
    jahresumsatz: session.jahresumsatz,
    gruendungsjahr: session.gruendungsjahr,
    vorhaben: session.vorhaben,
    vorhaben_details: session.vorhaben_details,
    investitionsvolumen: session.investitionsvolumen,
    erweiterte_daten: JSON.parse(session.erweiterte_daten || "{}"),
    dokumente: docs.results.map((d) => ({ typ: d.typ, name: d.name, extrakt: JSON.parse(d.ki_extrakt || "{}") })),
  };

  // STEP 1: SQL-Vorfilterung
  const bereiche = VORHABEN_MAP_FOERDER[session.vorhaben?.toLowerCase()] || ["Unternehmensfinanzierung"];
  const bereichFilter = bereiche.map(() => "foerderbereich LIKE ?").join(" OR ");
  const bereichParams = bereiche.map((b) => `%${b}%`);

  const candidates = await env.FOERDER_DB.prepare(`
    SELECT id, titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte,
           kurztext, volltext, rechtliche_voraussetzungen, url
    FROM foerderprogramme
    WHERE (foerdergebiet = ? OR foerdergebiet = 'bundesweit' OR foerdergebiet LIKE '%' || ? || '%')
      AND (${bereichFilter})
    LIMIT 80
  `).bind(session.bundesland, session.bundesland, ...bereichParams).all();

  if (!candidates.results.length) {
    await env.CHECK_DB.prepare(`UPDATE check_sessions SET status = 'ergebnis', updated_at = datetime('now') WHERE id = ?`).bind(sessionId).run();
    return json({ success: true, ergebnisse: [], hinweis: "Leider wurden keine passenden Programme gefunden." });
  }

  // STEP 2: Batch-Relevanzprüfung mit externem KI-Modell
  const programmeList = candidates.results.map((p) =>
    `[ID:${p.id}] ${p.titel} | Art: ${p.foerderart} | Bereich: ${p.foerderbereich} | Gebiet: ${p.foerdergebiet} | Berechtigte: ${p.foerderberechtigte} | Kurztext: ${p.kurztext?.substring(0, 200)}`
  ).join("\n");

  const relevanzSystemPrompt = `Du bist ein Experte für deutsche Fördermittel und EU-Beihilferecht. Deine Aufgabe ist es, Förderprogramme auf ihre Relevanz für ein bestimmtes Unternehmen zu prüfen.

Bewerte jedes Programm mit einem relevanz_score von 0-100:
- 90-100: Perfekte Passung, alle Kriterien erfüllt
- 70-89: Gute Passung, die meisten Kriterien erfüllt
- 50-69: Mögliche Passung, weitere Prüfung nötig
- 0-49: Wahrscheinlich nicht passend

Antworte NUR mit einem JSON-Array: [{"id": <nummer>, "score": <0-100>, "grund": "<kurze Begründung>"}]
Wähle nur Programme mit score >= 50. Maximum 15 Programme.`;

  const relevanzPrompt = `Unternehmensprofil:
${JSON.stringify(profile, null, 2)}

Zu prüfende Förderprogramme:
${programmeList}

Bewerte die Relevanz jedes Programms für dieses Unternehmen.`;

  const relevanzResp = await askExternalAI(env, relevanzSystemPrompt, relevanzPrompt, 3000);
  let relevante = tryParseJSON(relevanzResp);
  if (!Array.isArray(relevante)) relevante = [];

  // Sort by score
  relevante.sort((a, b) => b.score - a.score);
  const topProgramme = relevante.slice(0, 15);

  if (!topProgramme.length) {
    await env.CHECK_DB.prepare(`UPDATE check_sessions SET status = 'ergebnis', updated_at = datetime('now') WHERE id = ?`).bind(sessionId).run();
    return json({ success: true, ergebnisse: [], hinweis: "Die KI konnte keine passenden Programme identifizieren." });
  }

  // STEP 3: Detaillierte juristische Prüfung der Top-Programme
  const topIds = topProgramme.map((p) => p.id);
  const topDetails = candidates.results.filter((c) => topIds.includes(c.id));

  const detailPromises = topDetails.map(async (programm) => {
    const scoreEntry = topProgramme.find((p) => p.id === programm.id);

    const juristischPrompt = `Führe eine juristische Prüfung durch, ob das Unternehmen die Voraussetzungen für dieses Förderprogramm erfüllt.

FÖRDERPROGRAMM:
Titel: ${programm.titel}
Art: ${programm.foerderart}
Bereich: ${programm.foerderbereich}
Berechtigte: ${programm.foerderberechtigte}

Rechtliche Voraussetzungen:
${programm.rechtliche_voraussetzungen || "Keine spezifischen Angaben"}

Volltext:
${programm.volltext?.substring(0, 1500) || "Nicht verfügbar"}

UNTERNEHMEN:
${JSON.stringify(profile, null, 2)}

Antworte mit einem JSON-Objekt:
{
  "voraussetzungen": {"<kriterium>": {"erfuellt": true/false, "begruendung": "..."}},
  "risiken": ["Risiko 1", "Risiko 2"],
  "max_foerdersumme_schaetzung": <number oder null>,
  "empfehlung": "...",
  "benoetigte_dokumente": [{"typ": "...", "name": "...", "hinweis": "..."}],
  "fristen": "..."
}`;

    const juristResp = await askExternalAI(
      env,
      "Du bist ein Fachanwalt für Beihilferecht und Fördermittel in Deutschland. Prüfe Förderfähigkeit juristisch. Antworte NUR mit validem JSON.",
      juristischPrompt,
      2048
    );

    const parsed = tryParseJSON(juristResp) || {};
    const ergebnisId = uuid();

    await env.CHECK_DB.prepare(`
      INSERT INTO check_ergebnisse (id, session_id, programm_id, relevanz_score, begruendung, rechtliche_pruefung, voraussetzungen_erfuellt, risiken, max_foerdersumme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      ergebnisId,
      sessionId,
      programm.id,
      scoreEntry?.score || 0,
      scoreEntry?.grund || "",
      parsed.empfehlung || "",
      JSON.stringify(parsed.voraussetzungen || {}),
      JSON.stringify(parsed.risiken || []),
      parsed.max_foerdersumme_schaetzung || null
    ).run();

    // Generate action plan items
    const dokumente = parsed.benoetigte_dokumente || [];
    for (let i = 0; i < dokumente.length; i++) {
      const dok = dokumente[i];
      await env.CHECK_DB.prepare(`
        INSERT INTO check_aktionsplan (id, session_id, ergebnis_id, schritt, aktion, beschreibung, dokument_typ, frist, link)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(uuid(), sessionId, ergebnisId, i + 1, dok.name || dok.typ, dok.hinweis || "", dok.typ || "", parsed.fristen || null, programm.url || null).run();
    }

    return {
      ergebnis_id: ergebnisId,
      programm: { id: programm.id, titel: programm.titel, foerderart: programm.foerderart, foerdergebiet: programm.foerdergebiet, url: programm.url },
      relevanz_score: scoreEntry?.score || 0,
      begruendung: scoreEntry?.grund || "",
      rechtliche_pruefung: parsed,
    };
  });

  const ergebnisse = await Promise.all(detailPromises);

  // STEP 4: Kombinierbarkeits-Check
  const topTitles = ergebnisse.filter((e) => e.relevanz_score >= 60).map((e) => `[ID:${e.programm.id}] ${e.programm.titel} (${e.programm.foerderart})`).join("\n");

  let kombinationen = [];
  if (ergebnisse.filter((e) => e.relevanz_score >= 60).length >= 2) {
    const kombiResp = await askExternalAI(
      env,
      "Du bist Experte für deutsches Fördermittelrecht. Prüfe die Kombinierbarkeit von Förderprogrammen unter Berücksichtigung der De-minimis-Verordnung (300.000€/3 Jahre), AGVO, Kumulierungsverboten und Doppelförderungsverbot. Antworte NUR mit JSON.",
      `Prüfe die Kombinierbarkeit dieser Förderprogramme für ein Unternehmen:

Programme:
${topTitles}

Unternehmensprofil:
${JSON.stringify(profile, null, 2)}

Antworte mit JSON:
{
  "kombinationen": [
    {"programme_ids": [1, 2], "titel": ["Prog A", "Prog B"], "kombinierbar": true, "begruendung": "...", "gesamt_foerdersumme_max": 100000, "hinweise": "..."}
  ],
  "de_minimis_relevant": true/false,
  "de_minimis_hinweis": "...",
  "allgemeine_hinweise": "..."
}`,
      2048
    );

    kombinationen = tryParseJSON(kombiResp) || {};
  }

  // Update combinability in results
  for (const erg of ergebnisse) {
    const kombiIds = (kombinationen.kombinationen || [])
      .filter((k) => k.kombinierbar && k.programme_ids?.includes(erg.programm.id))
      .flatMap((k) => k.programme_ids.filter((id) => id !== erg.programm.id));

    if (kombiIds.length) {
      await env.CHECK_DB.prepare(`
        UPDATE check_ergebnisse SET kombinierbar_mit = ? WHERE id = ?
      `).bind(JSON.stringify(kombiIds), erg.ergebnis_id).run();
    }
  }

  // Generate chat summary
  const zusammenfassung = `Für ${session.firmenname} wurden ${ergebnisse.length} relevante Förderprogramme identifiziert. Davon haben ${ergebnisse.filter((e) => e.relevanz_score >= 70).length} eine hohe Passung (Score ≥ 70). Die geschätzte maximale Gesamtfördersumme liegt bei ca. ${ergebnisse.reduce((sum, e) => sum + (e.rechtliche_pruefung?.max_foerdersumme_schaetzung || 0), 0).toLocaleString("de-DE")} EUR.`;

    await env.CHECK_DB.prepare(`
      UPDATE check_sessions SET status = 'ergebnis', chat_zusammenfassung = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(zusammenfassung, sessionId).run();

    return json({
      success: true,
      zusammenfassung,
      ergebnisse: ergebnisse.sort((a, b) => b.relevanz_score - a.relevanz_score),
      kombinationen,
      gesamt_programme: ergebnisse.length,
      hohe_passung: ergebnisse.filter((e) => e.relevanz_score >= 70).length,
    });
  } catch (error) {
    console.error('[analyzeCheck] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- GET /api/checks/:id – Ergebnis abrufen ---

async function getCheck(request, env, sessionId) {
  try {
    const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    const ergebnisseRaw = await env.CHECK_DB.prepare(`
      SELECT * FROM check_ergebnisse WHERE session_id = ? ORDER BY relevanz_score DESC
    `).bind(sessionId).all();

    // Fetch program details for each result
    const results = [];
    for (const erg of ergebnisseRaw.results) {
      const prog = await env.FOERDER_DB.prepare(`
        SELECT id, titel, foerderart, foerderbereich, foerdergebiet, url, kurztext FROM foerderprogramme WHERE id = ?
      `).bind(erg.programm_id).first();

      results.push({
        ...erg,
        voraussetzungen_erfuellt: JSON.parse(erg.voraussetzungen_erfuellt || "{}"),
        kombinierbar_mit: JSON.parse(erg.kombinierbar_mit || "[]"),
        risiken: JSON.parse(erg.risiken || "[]"),
        programm: prog || { id: erg.programm_id },
      });
    }

    const dokumente = await env.CHECK_DB.prepare(`
      SELECT * FROM check_dokumente WHERE session_id = ?
    `).bind(sessionId).all();

    const chat = await env.CHECK_DB.prepare(`
      SELECT rolle, nachricht, created_at FROM check_chat WHERE session_id = ? ORDER BY created_at ASC
    `).bind(sessionId).all();

    return json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        firmenname: session.firmenname,
        branche: session.branche,
        bundesland: session.bundesland,
        vorhaben: session.vorhaben,
        zusammenfassung: session.chat_zusammenfassung,
        created_at: session.created_at,
      },
      ergebnisse: results,
      dokumente: dokumente.results.map((d) => ({
        ...d,
        ki_extrakt: JSON.parse(d.ki_extrakt || "{}"),
      })),
      chat: chat.results,
    });
  } catch (error) {
    console.error('[getCheck] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- GET /api/checks/:id/plan – Aktionsplan ---

async function getActionPlan(request, env, sessionId) {
  try {
    const session = await env.CHECK_DB.prepare("SELECT id, firmenname, status FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    const ergebnisse = await env.CHECK_DB.prepare(`
      SELECT * FROM check_ergebnisse WHERE session_id = ? ORDER BY relevanz_score DESC
    `).bind(sessionId).all();

    const plan = [];
    for (const erg of ergebnisse.results) {
      const prog = await env.FOERDER_DB.prepare(`
        SELECT id, titel, foerderart, url FROM foerderprogramme WHERE id = ?
      `).bind(erg.programm_id).first();

      const schritte = await env.CHECK_DB.prepare(`
        SELECT * FROM check_aktionsplan WHERE ergebnis_id = ? ORDER BY schritt ASC
      `).bind(erg.id).all();

      // Check which documents are already uploaded
      const existingDocs = await env.CHECK_DB.prepare(`
        SELECT typ FROM check_dokumente WHERE session_id = ? AND status = 'analysiert'
      `).bind(sessionId).all();
      const uploadedTypes = existingDocs.results.map((d) => d.typ);

      plan.push({
        programm: prog || { id: erg.programm_id },
        relevanz_score: erg.relevanz_score,
        max_foerdersumme: erg.max_foerdersumme,
        schritte: schritte.results.map((s) => ({
          ...s,
          bereits_hochgeladen: uploadedTypes.includes(s.dokument_typ),
        })),
      });
    }

    return json({
      success: true,
      firmenname: session.firmenname,
      aktionsplan: plan,
      gesamt_schritte: plan.reduce((sum, p) => sum + p.schritte.length, 0),
      offene_schritte: plan.reduce((sum, p) => sum + p.schritte.filter((s) => s.status === "offen" && !s.bereits_hochgeladen).length, 0),
    });
  } catch (error) {
    console.error('[getActionPlan] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// --- PATCH /api/checks/:id/plan/:schritt_id – Schritt aktualisieren ---

async function updatePlanStep(request, env, sessionId, schrittId) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.status) return err("Status ist erforderlich");
    if (!["offen", "erledigt", "nicht_noetig"].includes(body.status)) return err("Ungültiger Status");

    await env.CHECK_DB.prepare(`
      UPDATE check_aktionsplan SET status = ? WHERE id = ? AND session_id = ?
    `).bind(body.status, schrittId, sessionId).run();

    return json({ success: true, status: body.status });
  } catch (error) {
    console.error('[updatePlanStep] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// ============================================================
// INTELLIGENTE FÖRDER-AGENTS
// 3-Agent-System für maximale Fördersumme & optimalen Finanzierungsweg
//
// Agent 1: KUMULIERUNGS-PRÜFER
//   → Prüft welche Programme rechtlich kombinierbar sind
//   → De-minimis (300.000€/3J), AGVO, Doppelförderungsverbot
//
// Agent 2: KOMBINATIONS-OPTIMIERER
//   → Berechnet alle validen 2er/3er-Kombinationen
//   → Maximiert Gesamtfördersumme unter Beachtung der Kumulierungsregeln
//
// Agent 3: FINANZIERUNGSARCHITEKT
//   → Baut die optimale Finanzierungsstruktur
//   → Zuschuss + Darlehen + Bürgschaft + Eigenkapital
//   → Reihenfolge der Beantragung (kritischer Pfad)
// ============================================================

// --- Deutsche Beihilfe-Rechtsgrundlagen ---
const BEIHILFE_REGELN = {
  de_minimis: {
    max_summe: 300000,
    zeitraum_jahre: 3,
    beschreibung: "De-minimis-Verordnung (EU) 2023/2831: Max. 300.000€ Gesamtbeihilfe in 3 Steuerjahren",
    ausnahmen: ["Landwirtschaft (20.000€)", "Fischerei (30.000€)", "DAWI (750.000€)"],
  },
  agvo: {
    artikel: {
      "Art. 17": { name: "Investitionsbeihilfen für KMU", max_intensitaet: { klein: 0.20, mittel: 0.10 } },
      "Art. 18": { name: "Beratungsbeihilfen für KMU", max_intensitaet: { klein: 0.50, mittel: 0.50 } },
      "Art. 25": { name: "Forschung & Entwicklung", max_intensitaet: { grundlagenforschung: 1.0, industrieforschung: 0.50, experimentelle_entwicklung: 0.25 } },
      "Art. 28": { name: "Innovationsbeihilfen für KMU", max_intensitaet: { klein: 0.50, mittel: 0.50 } },
      "Art. 31": { name: "Ausbildungsbeihilfen", max_intensitaet: { klein: 0.70, mittel: 0.60 } },
      "Art. 36": { name: "Umweltschutzinvestitionen", max_intensitaet: { klein: 0.60, mittel: 0.50 } },
      "Art. 38": { name: "Energieeffizienzmaßnahmen", max_intensitaet: { klein: 0.50, mittel: 0.40 } },
      "Art. 41": { name: "Erneuerbare Energien", max_intensitaet: { klein: 0.65, mittel: 0.55 } },
    },
    kumulierung: "Bei Kumulierung mehrerer AGVO-Beihilfen für dieselben beihilfefähigen Kosten darf die höchste einschlägige Beihilfeintensität nicht überschritten werden.",
  },
  kumulierungsverbote: [
    "Zuschüsse aus verschiedenen EU-Strukturfonds für dieselben Ausgaben",
    "BAFA-Förderung + gleiche Landesförderung für identische Beratungsleistung",
    "KfW-Kredit + Landesförderbank-Kredit für identischen Verwendungszweck (prüfungspflichtig)",
  ],
  kombinierbar_grundsaetzlich: [
    "Bundeszuschuss + Landeszuschuss (wenn verschiedene Kostenblöcke)",
    "BAFA-Beratungszuschuss + KfW-Investitionskredit",
    "De-minimis-Zuschuss + AGVO-Investitionsbeihilfe (verschiedene Rechtsgrundlagen)",
    "Zuschuss + zinsgünstiges Darlehen (verschiedene Förderarten)",
    "Innovationszuschuss + Bürgschaft für Betriebsmittelkredit",
  ],
};

// --- Lade Referenzdaten aus DB für Agenten ---
async function ladeRechtsrahmen(env) {
  try {
    const regeln = await env.PLATFORM_DB.prepare(
      "SELECT kategorie, titel, rechtsgrundlage, max_betrag, max_intensitaet, zeitraum_jahre, bedingungen, ausnahmen, zusammenfassung FROM rechtsrahmen WHERE aktiv = 1 ORDER BY kategorie"
    ).all();
    const kombRegeln = await env.PLATFORM_DB.prepare(
      "SELECT regel_typ, foerderart_a, foerderart_b, rechtsgrundlage, max_kumulierte_intensitaet, bedingung, erklaerung, beispiel FROM kombinationsregeln WHERE aktiv = 1 ORDER BY prioritaet DESC"
    ).all();
    const anforderungen = await env.PLATFORM_DB.prepare(
      "SELECT programm_kategorie, anforderung_typ, kriterium, beschreibung, schwellenwert, rechtsgrundlage FROM unternehmens_anforderungen ORDER BY programm_kategorie"
    ).all();
    return {
      rechtsrahmen: regeln.results || [],
      kombinationsregeln: kombRegeln.results || [],
      anforderungen: anforderungen.results || [],
    };
  } catch (e) {
    console.error("Fehler beim Laden der Referenzdaten:", e.message);
    return { rechtsrahmen: [], kombinationsregeln: [], anforderungen: [] };
  }
}

// --- Agent 1: Kumulierungs-Prüfer ---
async function agentKumulierungsPruefer(env, programme, unternehmensProfil, referenzDaten) {
  const programmDetails = programme.map(p =>
    `[ID:${p.id}] "${p.titel}" | Art: ${p.foerderart} | Bereich: ${p.foerderbereich} | Gebiet: ${p.foerdergebiet} | Berechtigte: ${p.foerderberechtigte} | Voraussetzungen: ${(p.rechtliche_voraussetzungen || '').substring(0, 300)}`
  ).join("\n\n");

  // Referenzdaten für den Prompt aufbereiten
  const ref = referenzDaten || { rechtsrahmen: [], kombinationsregeln: [] };
  const rechtsrahmenText = ref.rechtsrahmen.filter(r => ['de_minimis', 'agvo', 'kumulierung', 'doppelfoerderung'].includes(r.kategorie))
    .map(r => `[${r.kategorie.toUpperCase()}] ${r.titel}: ${r.zusammenfassung}${r.max_betrag ? ' | Max: ' + r.max_betrag + '€' : ''}${r.max_intensitaet ? ' | Max Intensität: ' + (r.max_intensitaet * 100) + '%' : ''}`)
    .join("\n");
  const kombRegelnText = ref.kombinationsregeln
    .map(r => `[${r.regel_typ.toUpperCase()}] ${r.foerderart_a} + ${r.foerderart_b}: ${r.erklaerung}${r.bedingung ? ' | Bedingung: ' + r.bedingung : ''}${r.beispiel ? ' | Bsp: ' + r.beispiel : ''}`)
    .join("\n");

  const systemPrompt = `Du bist ein deutscher Fachanwalt für EU-Beihilferecht mit 20 Jahren Erfahrung in Fördermittelkumulierung.

DEINE AUFGABE: Prüfe für JEDES Programmpaar, ob eine Kumulierung (gleichzeitige Inanspruchnahme) rechtlich zulässig ist.

=== RECHTSRAHMEN AUS UNSERER DATENBANK ===
${rechtsrahmenText || 'Keine Referenzdaten verfügbar — verwende dein Fachwissen.'}

=== BEWÄHRTE KOMBINATIONSREGELN ===
${kombRegelnText || 'Keine Kombinationsregeln verfügbar — verwende dein Fachwissen.'}

=== ZUSÄTZLICHE RECHTSGRUNDLAGEN ===
1. DE-MINIMIS-VERORDNUNG (EU) 2023/2831:
   - Max. 300.000€ Gesamtbeihilfe in 3 Steuerjahren (rollierend)
   - Alle De-minimis-Beihilfen werden zusammengerechnet, unabhängig vom Förderzweck
   - Sonderregelungen: Landwirtschaft 20.000€, Fischerei 30.000€, DAWI 750.000€

2. AGVO (Allgemeine Gruppenfreistellungsverordnung):
   - Bei Kumulierung mehrerer AGVO-Beihilfen für DIESELBEN beihilfefähigen Kosten: höchste Beihilfeintensität darf nicht überschritten werden
   - AGVO + De-minimis: De-minimis wird nicht auf AGVO-Intensität angerechnet, WENN für verschiedene Kosten
   - Anmeldeschwellen beachten

3. DOPPELFÖRDERUNGSVERBOT:
   - Dieselbe Maßnahme darf nicht doppelt gefördert werden
   - ABER: Verschiedene Kostenblöcke desselben Projekts können separat gefördert werden

4. KUMULIERUNGSFREUNDLICHE Kombinationen:
   - Bundesmittel + Landesmittel (oft kombinierbar, wenn verschiedene Kostenblöcke)
   - Zuschuss + Darlehen (grundsätzlich kombinierbar)
   - Investitionsförderung + Beratungsförderung (verschiedene Förderzwecke)

Antworte NUR mit JSON:
{
  "paare": [
    {
      "programm_a_id": <id>,
      "programm_b_id": <id>,
      "kombinierbar": true/false,
      "risiko": "niedrig"/"mittel"/"hoch",
      "rechtsgrundlage": "De-minimis/AGVO Art. X/Landesrecht/...",
      "max_kumulierte_intensitaet": <0.0-1.0 oder null>,
      "bedingungen": ["Bedingung 1", "..."],
      "begruendung": "Kurze juristische Begründung"
    }
  ],
  "de_minimis_relevant": true/false,
  "de_minimis_summe_geschaetzt": <EUR>,
  "agvo_relevant": true/false,
  "allgemeine_hinweise": ["Hinweis 1", "..."]
}`;

  const userPrompt = `UNTERNEHMENSPROFIL:
- Firma: ${unternehmensProfil.firmenname}
- Rechtsform: ${unternehmensProfil.rechtsform || 'k.A.'}
- Branche: ${unternehmensProfil.branche}
- Bundesland: ${unternehmensProfil.bundesland}
- Mitarbeiter: ${unternehmensProfil.mitarbeiter || 'k.A.'}
- Jahresumsatz: ${unternehmensProfil.jahresumsatz ? unternehmensProfil.jahresumsatz + '€' : 'k.A.'}
- Vorhaben: ${unternehmensProfil.vorhaben}
- Investitionsvolumen: ${unternehmensProfil.investitionsvolumen ? unternehmensProfil.investitionsvolumen + '€' : 'k.A.'}
- Bisherige Förderungen (laut Chat): ${JSON.stringify(unternehmensProfil.erweiterte_daten || {})}

ZU PRÜFENDE FÖRDERPROGRAMME (${programme.length} Stück):
${programmDetails}

Prüfe ALLE möglichen Paarungen auf Kumulierbarkeit. Bei ${programme.length} Programmen sind das ${programme.length * (programme.length - 1) / 2} Paare.`;

  const result = await askExternalAI(env, systemPrompt, userPrompt, 4096);
  return tryParseJSON(result) || { paare: [], error: "KI-Antwort konnte nicht geparst werden" };
}

// --- Agent 2: Kombinations-Optimierer ---
async function agentKombinationsOptimierer(env, programme, kumulierungsPruefung, unternehmensProfil) {
  const kombinierbarepaare = (kumulierungsPruefung.paare || []).filter(p => p.kombinierbar);

  const systemPrompt = `Du bist ein mathematischer Optimierer für Fördermittel-Kombinationen. Dein Ziel: Die MAXIMALE Gesamtfördersumme für das Unternehmen finden.

AUFGABE: Finde die optimale Kombination von Förderprogrammen.

REGELN:
1. Nur Programme kombinieren, die der Kumulierungs-Prüfer als kombinierbar eingestuft hat
2. De-minimis-Deckelung beachten (300.000€ Summe aller De-minimis-Beihilfen)
3. AGVO-Beihilfeintensität nicht überschreiten (bei gleichen förderfähigen Kosten)
4. Verschiedene Kostenblöcke identifizieren (z.B. Beratungskosten vs. Investitionskosten vs. Personalkosten)
5. Zeitliche Reihenfolge beachten (manche Programme erfordern Antrag VOR Projektbeginn)

OPTIMIERUNGSZIEL: Maximiere die Gesamtfördersumme unter Einhaltung aller Kumulierungsregeln.

Antworte NUR mit JSON:
{
  "optimale_kombination": {
    "programme": [
      {
        "id": <id>,
        "titel": "...",
        "foerderart": "...",
        "geschaetzte_foerdersumme": <EUR>,
        "kostenblock": "beratung/investition/personal/energie/innovation",
        "rechtsgrundlage": "De-minimis/AGVO Art. X",
        "antrag_reihenfolge": 1
      }
    ],
    "gesamt_foerdersumme": <EUR>,
    "gesamt_investitionsvolumen": <EUR>,
    "effektive_foerderquote": <0.0-1.0>,
    "de_minimis_ausschoepfung": <EUR von 300000>,
    "verbleibender_eigenanteil": <EUR>
  },
  "alternative_kombinationen": [
    {
      "programme_ids": [1, 2],
      "gesamt_foerdersumme": <EUR>,
      "vorteil": "...",
      "nachteil": "..."
    }
  ],
  "nicht_kombinierbare_programme": [
    {"id": <id>, "titel": "...", "grund": "..."}
  ],
  "optimierungs_hinweise": ["Hinweis 1", "..."]
}`;

  const userPrompt = `UNTERNEHMENSPROFIL:
${JSON.stringify(unternehmensProfil, null, 2)}

VERFÜGBARE PROGRAMME (${programme.length}):
${programme.map(p => `[ID:${p.id}] "${p.titel}" | Art: ${p.foerderart} | Bereich: ${p.foerderbereich}`).join("\n")}

KUMULIERUNGS-ERGEBNIS (${kombinierbarepaare.length} kombinierbare Paare):
${JSON.stringify(kombinierbarepaare, null, 2)}

De-minimis relevant: ${kumulierungsPruefung.de_minimis_relevant ? 'Ja' : 'Nein'}
Geschätzte De-minimis-Summe bisherig: ${kumulierungsPruefung.de_minimis_summe_geschaetzt || 0}€

INVESTITIONSVOLUMEN: ${unternehmensProfil.investitionsvolumen || 'nicht angegeben'}€

Finde die Kombination mit der HÖCHSTEN Gesamtfördersumme.`;

  const result = await askExternalAI(env, systemPrompt, userPrompt, 4096);
  return tryParseJSON(result) || { optimale_kombination: { programme: [], gesamt_foerdersumme: 0 }, error: "KI-Antwort konnte nicht geparst werden" };
}

// --- Agent 3: Finanzierungsarchitekt ---
async function agentFinanzierungsarchitekt(env, optimaleKombination, unternehmensProfil) {
  const systemPrompt = `Du bist ein erfahrener Finanzierungsberater und Förderexperte für den deutschen Mittelstand. Du denkst wie ein CFO und gleichzeitig wie ein Fördermittel-Spezialist.

DEINE AUFGABE: Erstelle den OPTIMALEN Finanzierungsweg für das Unternehmen.

Du musst einen kompletten Finanzierungsplan erstellen, der:
1. Die maximale Fördersumme ausschöpft
2. Die günstigsten Darlehen priorisiert (KfW vor Hausbank)
3. Bürgschaften strategisch einsetzt (wo Sicherheiten fehlen)
4. Den Eigenkapitalanteil minimiert
5. Die zeitliche Reihenfolge der Beantragung optimiert
6. Den KRITISCHEN PFAD identifiziert (welcher Antrag zuerst, weil andere darauf aufbauen)
7. Cash-Flow-Auswirkungen berücksichtigt

FINANZIERUNGSBAUSTEINE (Priorität):
1. Nicht-rückzahlbare Zuschüsse (= geschenktes Geld) → IMMER ZUERST
2. Zinsverbilligte Darlehen (KfW, Landesförderbanken) → 0,01-2% statt 5-8%
3. Bürgschaften (wenn Sicherheiten fehlen) → Ermöglicht Kreditaufnahme
4. Beteiligungen (wenn Eigenkapital fehlt) → Stille Beteiligungen, MBG
5. Eigenmittel → Der verbleibende Rest

Antworte NUR mit JSON:
{
  "finanzierungsplan": {
    "gesamtbedarf": <EUR>,
    "bausteine": [
      {
        "reihenfolge": 1,
        "typ": "zuschuss/darlehen/buergschaft/beteiligung/eigenmittel",
        "programm_id": <id oder null>,
        "programm_titel": "...",
        "betrag": <EUR>,
        "konditionen": "...",
        "beantragung_bei": "...",
        "bearbeitungsdauer_wochen": <number>,
        "abhaengig_von": [<reihenfolge-nummern>],
        "dokumente_benoetigt": ["...", "..."],
        "tipp": "..."
      }
    ],
    "zusammenfassung": {
      "zuschuss_summe": <EUR>,
      "zuschuss_anteil": <0.0-1.0>,
      "darlehen_summe": <EUR>,
      "darlehen_effektiv_zins": <percent>,
      "buergschaft_summe": <EUR>,
      "eigenanteil": <EUR>,
      "eigenanteil_prozent": <0.0-1.0>,
      "jaehrliche_tilgung": <EUR>,
      "break_even_monate": <number>
    }
  },
  "kritischer_pfad": {
    "schritt_1": {"aktion": "...", "dauer": "...", "warum_zuerst": "..."},
    "schritt_2": {"aktion": "...", "dauer": "...", "voraussetzung": "..."}
  },
  "risiken": [
    {"risiko": "...", "wahrscheinlichkeit": "niedrig/mittel/hoch", "mitigation": "..."}
  ],
  "spar_potenzial": {
    "ohne_optimierung_kosten": <EUR>,
    "mit_optimierung_kosten": <EUR>,
    "ersparnis": <EUR>,
    "ersparnis_prozent": <percent>
  },
  "empfehlung": "2-3 Sätze Gesamtempfehlung"
}`;

  const userPrompt = `UNTERNEHMENSPROFIL:
${JSON.stringify(unternehmensProfil, null, 2)}

OPTIMALE FÖRDERKOMBINATION (vom Kombinations-Optimierer):
${JSON.stringify(optimaleKombination, null, 2)}

Erstelle den optimalen Finanzierungsplan. Berechne konkrete Beträge basierend auf dem Investitionsvolumen von ${unternehmensProfil.investitionsvolumen || 'unbekannt'}€.`;

  const result = await askExternalAI(env, systemPrompt, userPrompt, 4096);
  return tryParseJSON(result) || { finanzierungsplan: { bausteine: [] }, error: "KI-Antwort konnte nicht geparst werden" };
}

// --- Orchestrierung: POST /api/checks/:id/optimize ---
async function optimizeCheck(request, env, sessionId) {
  const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return err("Session nicht gefunden", 404);

  // Ergebnisse der vorherigen Analyse laden
  const ergebnisse = await env.CHECK_DB.prepare(
    "SELECT * FROM check_ergebnisse WHERE session_id = ? AND relevanz_score >= 50 ORDER BY relevanz_score DESC"
  ).bind(sessionId).all();

  if (!ergebnisse.results.length) {
    return err("Bitte zuerst die Analyse durchführen (POST /api/checks/:id/analyze)", 400);
  }

  // Programm-Details laden
  const programme = [];
  for (const erg of ergebnisse.results) {
    const p = await env.FOERDER_DB.prepare(
      "SELECT * FROM foerderprogramme WHERE id = ?"
    ).bind(erg.programm_id).first();
    if (p) programme.push({ ...p, relevanz_score: erg.relevanz_score });
  }

  const unternehmensProfil = {
    firmenname: session.firmenname,
    rechtsform: session.rechtsform,
    branche: session.branche,
    unterbranche: session.unterbranche,
    bundesland: session.bundesland,
    plz: session.plz,
    mitarbeiter: session.mitarbeiter,
    jahresumsatz: session.jahresumsatz,
    gruendungsjahr: session.gruendungsjahr,
    vorhaben: session.vorhaben,
    vorhaben_details: session.vorhaben_details,
    investitionsvolumen: session.investitionsvolumen,
    erweiterte_daten: JSON.parse(session.erweiterte_daten || "{}"),
  };

  // ===== Referenzdaten laden =====
  const referenzDaten = await ladeRechtsrahmen(env);

  // ===== AGENT 1: Kumulierungs-Prüfer =====
  const kumulierung = await agentKumulierungsPruefer(env, programme, unternehmensProfil, referenzDaten);

  // ===== AGENT 2: Kombinations-Optimierer =====
  const optimierung = await agentKombinationsOptimierer(env, programme, kumulierung, unternehmensProfil);

  // ===== AGENT 3: Finanzierungsarchitekt =====
  const finanzierung = await agentFinanzierungsarchitekt(env, optimierung.optimale_kombination || {}, unternehmensProfil);

  // Ergebnis in DB speichern
  const optimierungId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO foerder_kombinationen (id, session_id, programme_ids, programme_titel, kombinierbar, kumulierungs_typ, de_minimis_relevant, de_minimis_summe, gesamt_foerdersumme_max, begruendung, hinweise, geprueft_durch)
    VALUES (?, ?, ?, ?, 1, 'optimiert', ?, ?, ?, ?, ?, 'ki-multi-agent')
  `).bind(
    optimierungId,
    sessionId,
    JSON.stringify((optimierung.optimale_kombination?.programme || []).map(p => p.id)),
    JSON.stringify((optimierung.optimale_kombination?.programme || []).map(p => p.titel)),
    kumulierung.de_minimis_relevant ? 1 : 0,
    kumulierung.de_minimis_summe_geschaetzt || 0,
    optimierung.optimale_kombination?.gesamt_foerdersumme || 0,
    JSON.stringify(optimierung),
    JSON.stringify(finanzierung),
  ).run();

  // Status aktualisieren
  await env.CHECK_DB.prepare(
    "UPDATE check_sessions SET status = 'optimiert', updated_at = datetime('now') WHERE id = ?"
  ).bind(sessionId).run();

  return json({
    success: true,
    session_id: sessionId,
    unternehmen: {
      firmenname: session.firmenname,
      bundesland: session.bundesland,
      branche: session.branche,
      vorhaben: session.vorhaben,
      investitionsvolumen: session.investitionsvolumen,
    },
    agents: {
      kumulierungs_pruefer: {
        geprueft: (kumulierung.paare || []).length,
        kombinierbar: (kumulierung.paare || []).filter(p => p.kombinierbar).length,
        de_minimis_relevant: kumulierung.de_minimis_relevant,
        de_minimis_summe: kumulierung.de_minimis_summe_geschaetzt,
        agvo_relevant: kumulierung.agvo_relevant,
        hinweise: kumulierung.allgemeine_hinweise,
        details: kumulierung.paare,
      },
      kombinations_optimierer: {
        optimale_kombination: optimierung.optimale_kombination,
        alternativen: optimierung.alternative_kombinationen,
        nicht_kombinierbar: optimierung.nicht_kombinierbare_programme,
        hinweise: optimierung.optimierungs_hinweise,
      },
      finanzierungsarchitekt: {
        finanzierungsplan: finanzierung.finanzierungsplan,
        kritischer_pfad: finanzierung.kritischer_pfad,
        risiken: finanzierung.risiken,
        spar_potenzial: finanzierung.spar_potenzial,
        empfehlung: finanzierung.empfehlung,
      },
    },
    beihilfe_regeln: BEIHILFE_REGELN,
  });
}

// ============================================================
// SCHWARM-INTELLIGENZ: 6 Spezial-Agenten
// ============================================================

const SCHWARM_AGENTEN = {
  BEDARFS_ANALYST: {
    name: "Bedarfs-Analyst",
    rolle: "Analysiert Unternehmensbedarf und identifiziert alle relevanten Förderbereiche",
  },
  PROGRAMM_SCANNER: {
    name: "Programm-Scanner",
    rolle: "Durchsucht 2.467 Programme nach optimalen Matches pro Förderbereich",
  },
  REGIONAL_EXPERTE: {
    name: "Regional-Experte",
    rolle: "Kennt alle Landesförderungen, kommunale Programme und regionale Besonderheiten",
  },
  KUMULIERUNGS_JURIST: {
    name: "Kumulierungs-Jurist",
    rolle: "Prüft EU-Beihilferecht, De-minimis, AGVO, Doppelförderungsverbot",
  },
  KOMBINATIONS_STRATEGE: {
    name: "Kombinations-Stratege",
    rolle: "Findet die maximale Fördersumme durch intelligente Stapelstrategien",
  },
  FINANZ_ARCHITEKT: {
    name: "Finanz-Architekt",
    rolle: "Baut den optimalen Finanzierungsplan mit Zeitachse und Cashflow",
  },
};

// Schwarm-Agent: Bedarfs-Analyst
async function schwarmBedarfsAnalyst(env, unternehmensProfil, referenzDaten) {
  // Relevante Anforderungen aus DB laden
  const ref = referenzDaten || { anforderungen: [] };
  const anforderungenText = ref.anforderungen
    .map(a => `[${a.anforderung_typ.toUpperCase()}] ${a.programm_kategorie} — ${a.kriterium}: ${a.beschreibung}${a.schwellenwert ? ' (Schwelle: ' + a.schwellenwert + ')' : ''}`)
    .join("\n");

  const prompt = `Du bist ein erfahrener Fördermittelberater. Analysiere dieses Unternehmen und identifiziere ALLE möglichen Förderbereiche.

UNTERNEHMEN:
- Firma: ${unternehmensProfil.firmenname}
- Branche: ${unternehmensProfil.branche} / ${unternehmensProfil.unterbranche || '-'}
- Bundesland: ${unternehmensProfil.bundesland}
- Mitarbeiter: ${unternehmensProfil.mitarbeiter}
- Umsatz: ${unternehmensProfil.jahresumsatz}€
- Gründung: ${unternehmensProfil.gruendungsjahr}
- Vorhaben: ${unternehmensProfil.vorhaben}
- Details: ${unternehmensProfil.vorhaben_details || '-'}
- Investition: ${unternehmensProfil.investitionsvolumen}€

=== ANFORDERUNGSKATALOG AUS UNSERER DATENBANK ===
Prüfe das Unternehmen gegen diese bekannten Anforderungen und berücksichtige sie in deiner Analyse:
${anforderungenText || 'Keine Anforderungsdaten verfügbar.'}

Antworte als JSON:
{
  "kmu_kategorie": "mikro|klein|mittel|groß",
  "primaere_bereiche": ["Hauptförderbereiche die direkt passen"],
  "sekundaere_bereiche": ["Weitere Bereiche die indirekt passen könnten"],
  "besondere_merkmale": ["z.B. Gründer, Innovativ, Nachhaltig, Digital, Export"],
  "foerder_potential": "niedrig|mittel|hoch|sehr_hoch",
  "empfohlene_foerderarten": ["Zuschuss", "Darlehen", "Bürgschaft", etc.],
  "max_de_minimis_relevant": true/false,
  "geschaetztes_foerdervolumen_min": number,
  "geschaetztes_foerdervolumen_max": number,
  "sofort_massnahmen": ["Was sofort beantragt werden kann"]
}`;

  const result = await askExternalAI(env, "Du bist ein KI-Agent im Schwarm-Intelligenz-System für Fördermittelberatung.", prompt, 2048);
  return tryParseJSON(result) || { primaere_bereiche: [], sekundaere_bereiche: [], foerder_potential: "mittel" };
}

// Schwarm-Agent: Programm-Scanner (DB-Suche + KI-Bewertung)
async function schwarmProgrammScanner(env, bedarfsAnalyse, unternehmensProfil) {
  const alleBereiche = [...(bedarfsAnalyse.primaere_bereiche || []), ...(bedarfsAnalyse.sekundaere_bereiche || [])];

  // Breite DB-Suche über alle identifizierten Bereiche
  let alleProgramme = [];
  for (const bereich of alleBereiche) {
    const results = await env.FOERDER_DB.prepare(`
      SELECT id, titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte,
             kurztext, rechtliche_voraussetzungen, url
      FROM foerderprogramme
      WHERE (foerderbereich LIKE ? OR kurztext LIKE ? OR titel LIKE ?)
        AND (foerdergebiet LIKE ? OR foerdergebiet = 'bundesweit' OR foerdergebiet = '')
      LIMIT 30
    `).bind(`%${bereich}%`, `%${bereich}%`, `%${bereich}%`, `%${unternehmensProfil.bundesland || ''}%`).all();
    alleProgramme.push(...(results.results || []));
  }

  // Zusätzlich nach Vorhaben-Typ suchen
  if (unternehmensProfil.vorhaben) {
    const vorhabenResults = await env.FOERDER_DB.prepare(`
      SELECT id, titel, foerderart, foerderbereich, foerdergebiet, foerderberechtigte,
             kurztext, rechtliche_voraussetzungen, url
      FROM foerderprogramme
      WHERE (kurztext LIKE ? OR titel LIKE ? OR volltext LIKE ?)
      LIMIT 30
    `).bind(`%${unternehmensProfil.vorhaben}%`, `%${unternehmensProfil.vorhaben}%`, `%${unternehmensProfil.vorhaben}%`).all();
    alleProgramme.push(...(vorhabenResults.results || []));
  }

  // Deduplizieren
  const seen = new Set();
  alleProgramme = alleProgramme.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // KI bewertet Relevanz
  if (alleProgramme.length === 0) return { programme: [], gesamt_gefunden: 0 };

  const programmListe = alleProgramme.slice(0, 40).map(p =>
    `[${p.id}] "${p.titel}" | ${p.foerderart} | ${p.foerderbereich} | ${p.foerdergebiet} | Berechtigte: ${(p.foerderberechtigte || '').substring(0, 150)} | ${(p.kurztext || '').substring(0, 200)}`
  ).join("\n");

  const bewertungsPrompt = `Bewerte die Relevanz dieser ${alleProgramme.length} Förderprogramme für:
Firma: ${unternehmensProfil.firmenname} | Branche: ${unternehmensProfil.branche} | Vorhaben: ${unternehmensProfil.vorhaben} | ${unternehmensProfil.bundesland} | ${unternehmensProfil.mitarbeiter} MA | ${unternehmensProfil.jahresumsatz}€ Umsatz

PROGRAMME:
${programmListe}

Antworte als JSON-Array, sortiert nach Relevanz (höchste zuerst):
[{ "id": number, "relevanz": 0-100, "grund": "kurzer Grund", "geschaetzte_foerdersumme": number, "prioritaet": "sofort|kurzfristig|mittelfristig" }]
Nur Programme mit relevanz >= 30 zurückgeben.`;

  const result = await askExternalAI(env, "Du bist der Programm-Scanner im Schwarm-Intelligenz-System.", bewertungsPrompt, 4096);
  const bewertungen = tryParseJSON(result) || [];

  // Programm-Details mit Bewertungen zusammenführen
  const bewerteteProgramme = (Array.isArray(bewertungen) ? bewertungen : []).map(b => {
    const prog = alleProgramme.find(p => p.id === b.id);
    return prog ? { ...prog, ...b } : null;
  }).filter(Boolean);

  return { programme: bewerteteProgramme, gesamt_gefunden: alleProgramme.length, bewertet: bewerteteProgramme.length };
}

// Schwarm-Agent: Regional-Experte
async function schwarmRegionalExperte(env, unternehmensProfil, programmListe) {
  const bundesland = unternehmensProfil.bundesland || '';

  // Regionale Programme speziell suchen
  const regionale = await env.FOERDER_DB.prepare(`
    SELECT id, titel, foerderart, foerderbereich, foerdergebiet, kurztext, url
    FROM foerderprogramme
    WHERE foerdergebiet LIKE ?
    ORDER BY titel
    LIMIT 50
  `).bind(`%${bundesland}%`).all();

  const bereitsGefunden = new Set((programmListe || []).map(p => p.id));
  const zusaetzliche = (regionale.results || []).filter(p => !bereitsGefunden.has(p.id));

  if (zusaetzliche.length === 0) return { zusaetzliche_programme: [], regionale_hinweise: [] };

  const prompt = `Du bist Experte für Förderprogramme in ${bundesland}.
Unternehmen: ${unternehmensProfil.firmenname} | ${unternehmensProfil.branche} | ${unternehmensProfil.vorhaben}

Diese ${zusaetzliche.length} REGIONALEN Programme wurden noch nicht berücksichtigt:
${zusaetzliche.slice(0, 25).map(p => `[${p.id}] "${p.titel}" | ${p.foerderart} | ${(p.kurztext || '').substring(0, 150)}`).join("\n")}

Antworte als JSON:
{
  "relevante_zusaetzliche": [{ "id": number, "relevanz": 0-100, "grund": "string" }],
  "regionale_hinweise": ["Besondere Tipps für ${bundesland}"],
  "kommunale_optionen": ["Mögliche kommunale Förderungen die nicht in der DB sind"]
}
Nur Programme mit relevanz >= 40.`;

  const result = await askExternalAI(env, "Du bist der Regional-Experte im Schwarm-Intelligenz-System.", prompt, 2048);
  const parsed = tryParseJSON(result) || { relevante_zusaetzliche: [], regionale_hinweise: [] };

  // Zusätzliche Programme mit Details anreichern
  const relevanteIds = new Set((parsed.relevante_zusaetzliche || []).map(p => p.id));
  parsed.programme_details = zusaetzliche.filter(p => relevanteIds.has(p.id));

  return parsed;
}

// Schwarm-Orchestrierung: POST /api/checks/:id/schwarm
async function schwarmOptimierung(request, env, sessionId) {
  const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
  if (!session) return err("Session nicht gefunden", 404);

  const ergebnisse = await env.CHECK_DB.prepare(
    "SELECT * FROM check_ergebnisse WHERE session_id = ? ORDER BY relevanz_score DESC"
  ).bind(sessionId).all();

  const unternehmensProfil = {
    firmenname: session.firmenname,
    rechtsform: session.rechtsform,
    branche: session.branche,
    unterbranche: session.unterbranche,
    bundesland: session.bundesland,
    plz: session.plz,
    mitarbeiter: session.mitarbeiter,
    jahresumsatz: session.jahresumsatz,
    gruendungsjahr: session.gruendungsjahr,
    vorhaben: session.vorhaben,
    vorhaben_details: session.vorhaben_details,
    investitionsvolumen: session.investitionsvolumen,
    erweiterte_daten: JSON.parse(session.erweiterte_daten || "{}"),
  };

  const startTime = Date.now();

  // ===== Referenzdaten laden (einmalig für alle Agenten) =====
  const referenzDaten = await ladeRechtsrahmen(env);

  // ===== PHASE 1: Bedarfs-Analyse =====
  const bedarfsAnalyse = await schwarmBedarfsAnalyst(env, unternehmensProfil, referenzDaten);

  // ===== PHASE 2: Programm-Scanning (parallel mit Regional-Suche) =====
  const programmScan = await schwarmProgrammScanner(env, bedarfsAnalyse, unternehmensProfil);

  // ===== PHASE 3: Regional-Expertise =====
  const regionalAnalyse = await schwarmRegionalExperte(env, unternehmensProfil, programmScan.programme);

  // Alle Programme zusammenführen
  const alleProgramme = [
    ...programmScan.programme,
    ...(regionalAnalyse.programme_details || []).map(p => {
      const match = (regionalAnalyse.relevante_zusaetzliche || []).find(r => r.id === p.id);
      return { ...p, relevanz: match?.relevanz || 50, grund: match?.grund || "Regional-Empfehlung" };
    }),
  ];

  // ===== PHASE 4: Kumulierungs-Prüfung (bestehende Agenten) =====
  const topProgramme = alleProgramme.filter(p => p.relevanz >= 50).slice(0, 15);
  let kumulierung = { paare: [], de_minimis_relevant: false };
  let optimierung = { optimale_kombination: {} };
  let finanzierung = { finanzierungsplan: {} };

  if (topProgramme.length >= 2) {
    // Programm-Details für Agenten laden
    const detaillierteProgramme = [];
    for (const p of topProgramme) {
      const detail = await env.FOERDER_DB.prepare("SELECT * FROM foerderprogramme WHERE id = ?").bind(p.id).first();
      if (detail) detaillierteProgramme.push({ ...detail, relevanz: p.relevanz });
    }

    kumulierung = await agentKumulierungsPruefer(env, detaillierteProgramme, unternehmensProfil, referenzDaten);
    optimierung = await agentKombinationsOptimierer(env, detaillierteProgramme, kumulierung, unternehmensProfil);
    finanzierung = await agentFinanzierungsarchitekt(env, optimierung.optimale_kombination || {}, unternehmensProfil);
  }

  const dauer = Date.now() - startTime;

  // Ergebnis speichern
  await env.CHECK_DB.prepare(
    "UPDATE check_sessions SET status = 'schwarm_optimiert', updated_at = datetime('now') WHERE id = ?"
  ).bind(sessionId).run();

  // === AUTOMATISIERUNG: Auto-Matching + Alert ===
  const beraterMatches = await autoMatchBerater(env, session);
  await createAdminAlert(env, 'schwarm_abgeschlossen', 'normal',
    `Schwarm-Analyse fertig: ${session.firmenname} (${session.bundesland})`,
    `${alleProgramme.length} Programme gefunden | ${beraterMatches.length} Berater gematcht | Dauer: ${dauer}ms`,
    'check_session', sessionId);

  return json({
    success: true,
    session_id: sessionId,
    schwarm_version: "1.0",
    dauer_ms: dauer,
    agenten_eingesetzt: 6,

    unternehmen: {
      firmenname: session.firmenname,
      bundesland: session.bundesland,
      branche: session.branche,
      vorhaben: session.vorhaben,
      investitionsvolumen: session.investitionsvolumen,
    },

    phase_1_bedarfsanalyse: {
      agent: SCHWARM_AGENTEN.BEDARFS_ANALYST.name,
      kmu_kategorie: bedarfsAnalyse.kmu_kategorie,
      foerder_potential: bedarfsAnalyse.foerder_potential,
      primaere_bereiche: bedarfsAnalyse.primaere_bereiche,
      sekundaere_bereiche: bedarfsAnalyse.sekundaere_bereiche,
      besondere_merkmale: bedarfsAnalyse.besondere_merkmale,
      geschaetztes_volumen: {
        min: bedarfsAnalyse.geschaetztes_foerdervolumen_min,
        max: bedarfsAnalyse.geschaetztes_foerdervolumen_max,
      },
      sofort_massnahmen: bedarfsAnalyse.sofort_massnahmen,
    },

    phase_2_programm_scan: {
      agent: SCHWARM_AGENTEN.PROGRAMM_SCANNER.name,
      gesamt_durchsucht: programmScan.gesamt_gefunden,
      relevant_bewertet: programmScan.bewertet,
      top_programme: programmScan.programme.slice(0, 10).map(p => ({
        id: p.id,
        titel: p.titel,
        foerderart: p.foerderart,
        foerderbereich: p.foerderbereich,
        relevanz: p.relevanz,
        grund: p.grund,
        geschaetzte_foerdersumme: p.geschaetzte_foerdersumme,
        prioritaet: p.prioritaet,
        url: p.url,
      })),
    },

    phase_3_regional: {
      agent: SCHWARM_AGENTEN.REGIONAL_EXPERTE.name,
      bundesland: session.bundesland,
      zusaetzliche_programme: (regionalAnalyse.relevante_zusaetzliche || []).length,
      regionale_hinweise: regionalAnalyse.regionale_hinweise,
      kommunale_optionen: regionalAnalyse.kommunale_optionen,
    },

    phase_4_kumulierung: {
      agent: SCHWARM_AGENTEN.KUMULIERUNGS_JURIST.name,
      geprueft: (kumulierung.paare || []).length,
      kombinierbar: (kumulierung.paare || []).filter(p => p.kombinierbar).length,
      de_minimis_relevant: kumulierung.de_minimis_relevant,
      de_minimis_summe: kumulierung.de_minimis_summe_geschaetzt,
    },

    phase_5_optimierung: {
      agent: SCHWARM_AGENTEN.KOMBINATIONS_STRATEGE.name,
      optimale_kombination: optimierung.optimale_kombination,
      alternativen: (optimierung.alternative_kombinationen || []).length,
    },

    phase_6_finanzierung: {
      agent: SCHWARM_AGENTEN.FINANZ_ARCHITEKT.name,
      finanzierungsplan: finanzierung.finanzierungsplan,
      kritischer_pfad: finanzierung.kritischer_pfad,
      spar_potenzial: finanzierung.spar_potenzial,
      empfehlung: finanzierung.empfehlung,
    },

    gesamt_empfehlung: {
      programme_gesamt: alleProgramme.length,
      programme_top: topProgramme.length,
      geschaetzte_max_foerderung: optimierung.optimale_kombination?.gesamt_foerdersumme || bedarfsAnalyse.geschaetztes_foerdervolumen_max || 0,
    },

    // Auto-Matching: Passende Berater
    empfohlene_berater: beraterMatches.map(m => ({
      berater_profile_id: m.berater_profile_id,
      name: m.display_name,
      matching_score: m.score,
      gruende: m.gruende,
    })),
  });
}

// ============================================================
// FÖRDERPROGRAMME – Browse, Search, Stats, Detail
// ============================================================

async function browseFoerderprogramme(request, env) {
  try {
    const url = new URL(request.url);
    const bundesland = url.searchParams.get("bundesland") || "";
    const bereich = url.searchParams.get("bereich") || "";
    const art = url.searchParams.get("art") || "";
    const suche = url.searchParams.get("q") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const sortBy = url.searchParams.get("sort") || "titel";
    const sortDir = url.searchParams.get("dir") === "desc" ? "DESC" : "ASC";

    const validSorts = ["titel", "foerdergebiet", "foerderbereich", "foerderart", "scraped_at"];
    const sortColumn = validSorts.includes(sortBy) ? sortBy : "titel";

    let conditions = [];
    let params = [];

    if (bundesland) {
      conditions.push("(foerdergebiet = ? OR foerdergebiet = 'bundesweit' OR foerdergebiet LIKE '%' || ? || '%')");
      params.push(bundesland, bundesland);
    }
    if (bereich) {
      conditions.push("foerderbereich LIKE ?");
      params.push(`%${bereich}%`);
    }
    if (art) {
      conditions.push("foerderart LIKE ?");
      params.push(`%${art}%`);
    }
    if (suche) {
      conditions.push("(titel LIKE ? OR kurztext LIKE ? OR foerderbereich LIKE ?)");
      params.push(`%${suche}%`, `%${suche}%`, `%${suche}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countResult = await env.FOERDER_DB.prepare(
      `SELECT COUNT(*) as total FROM foerderprogramme ${whereClause}`
    ).bind(...params).first();

    // Fetch page
    const results = await env.FOERDER_DB.prepare(
      `SELECT id, titel, typ, foerderart, foerderbereich, foerdergebiet, foerderberechtigte, kurztext, url
       FROM foerderprogramme ${whereClause}
       ORDER BY ${sortColumn} ${sortDir}
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return json({
      success: true,
      programme: results.results,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        pages: Math.ceil((countResult?.total || 0) / limit),
      },
      filter: { bundesland, bereich, art, suche },
    });
  } catch (error) {
    console.error('[browseFoerderprogramme] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function getFoerderprogrammeStats(request, env) {
  // Read from stats cache
  const statsRows = await env.FOERDER_DB.prepare(
    "SELECT key, value, updated_at FROM foerderprogramme_stats"
  ).all();

  const stats = {};
  for (const row of statsRows.results) {
    try {
      stats[row.key] = JSON.parse(row.value);
    } catch {
      stats[row.key] = row.value;
    }
  }

  // Add live count
  const liveCount = await env.FOERDER_DB.prepare("SELECT COUNT(*) as c FROM foerderprogramme").first();
  stats.total_live = liveCount?.c || 0;

  return json({ success: true, stats });
}

async function getFoerderprogrammDetail(request, env, id) {
  try {
    const programm = await env.FOERDER_DB.prepare(
      `SELECT * FROM foerderprogramme WHERE id = ?`
    ).bind(id).first();

    if (!programm) return err("Förderprogramm nicht gefunden", 404);

    // Find related programs (same Förderbereich + Gebiet)
    const related = await env.FOERDER_DB.prepare(`
      SELECT id, titel, foerderart, foerdergebiet FROM foerderprogramme
      WHERE foerderbereich = ? AND id != ? LIMIT 5
    `).bind(programm.foerderbereich, id).all();

    return json({
      success: true,
      programm,
      verwandte_programme: related.results,
    });
  } catch (error) {
    console.error('[getFoerderprogrammDetail] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// ============================================================
// INTELLIGENTE BERATER-ZUWEISUNG
// Findet den perfekten Berater + Dienstleistung basierend auf
// den gefundenen Förderprogrammen einer Check-Session
// ============================================================

// Gewichtung der Matching-Faktoren (Gesamt = 100)
const ZUWEISUNG_GEWICHTE = {
  foerder_expertise: 35,   // Hat der Berater Erfahrung mit diesen Förderbereichen?
  region: 20,              // Arbeitet der Berater im Bundesland des Unternehmens?
  branche: 15,             // Kennt der Berater die Branche?
  erfolgsquote: 15,        // Wie hoch ist die Erfolgsquote des Beraters?
  dienstleistung_match: 15 // Passt eine konkrete Dienstleistung zur Anfrage?
};

async function findBestBerater(request, env, sessionId) {
  try {
    // 1. Session + Ergebnisse laden
    const session = await env.CHECK_DB.prepare(
      "SELECT * FROM check_sessions WHERE id = ?"
    ).bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    const ergebnisse = await env.CHECK_DB.prepare(
      "SELECT * FROM check_ergebnisse WHERE session_id = ? AND relevanz_score >= 50 ORDER BY relevanz_score DESC"
    ).bind(sessionId).all();

    if (!ergebnisse.results.length) {
      return err("Bitte zuerst die Analyse durchführen (POST /api/checks/:id/analyze)", 400);
    }

    // 2. Relevante Förderbereiche + Förderarten aus den Ergebnissen extrahieren
    const programmIds = ergebnisse.results.map(e => e.programm_id);
  // Batch query: get all programmes at once instead of N+1 queries
  const placeholders = programmIds.map(() => "?").join(",");
  const programmeBatch = await env.FOERDER_DB.prepare(
    `SELECT id, foerderbereich, foerderart, foerdergebiet FROM foerderprogramme WHERE id IN (${placeholders})`
  ).bind(...programmIds).all();
  const programme = programmeBatch.results || [];

  const relevanteBereiche = [...new Set(programme.map(p => p.foerderbereich).filter(Boolean))];
  const relevanteArten = [...new Set(programme.map(p => p.foerderart).filter(Boolean))];
  const bundesland = session.bundesland;
  const branche = session.branche;

  // 3. Alle verfügbaren Berater laden
  const berater = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_profiles WHERE verfuegbar = 1"
  ).all();

  // Batch load expertise for all beraters at once (avoid N+1)
  const beraterIds = berater.results.map(b => b.id);
  const placeholdersBeratery = beraterIds.map(() => "?").join(",");
  const allExpertiseBatch = await env.PLATFORM_DB.prepare(
    `SELECT * FROM berater_foerder_expertise WHERE berater_id IN (${placeholdersBeratery})`
  ).bind(...beraterIds).all();
  // Create a map: berater_id -> array of expertise records
  const expertiseByBerater = new Map();
  (allExpertiseBatch.results || []).forEach(exp => {
    if (!expertiseByBerater.has(exp.berater_id)) {
      expertiseByBerater.set(exp.berater_id, []);
    }
    expertiseByBerater.get(exp.berater_id).push(exp);
  });

  // Batch load dienstleistungen for all beraters at once (avoid N+1)
  const placeholdersDl = beraterIds.map(() => "?").join(",");
  const allDienstleistungenBatch = await env.PLATFORM_DB.prepare(
    `SELECT * FROM berater_dienstleistungen WHERE berater_id IN (${placeholdersDl}) AND aktiv = 1`
  ).bind(...beraterIds).all();
  // Create a map: berater_id -> array of dienstleistung records
  const dienstleistungenByBerater = new Map();
  (allDienstleistungenBatch.results || []).forEach(dl => {
    if (!dienstleistungenByBerater.has(dl.berater_id)) {
      dienstleistungenByBerater.set(dl.berater_id, []);
    }
    dienstleistungenByBerater.get(dl.berater_id).push(dl);
  });

  // 4. Für jeden Berater: Score berechnen
  const beraterScores = [];

  for (const b of berater.results) {
    let score = 0;
    const faktoren = {};

    // --- Faktor 1: Förder-Expertise (35 Punkte) ---
    const expertiseList = expertiseByBerater.get(b.id) || [];
    const expertise = { results: expertiseList };

    let expertiseScore = 0;
    let matchedBereiche = [];
    for (const exp of expertise.results) {
      for (const bereich of relevanteBereiche) {
        if (bereich.includes(exp.foerderbereich) || exp.foerderbereich.includes(bereich)) {
          const levelMultiplier = exp.kompetenz_level === 'experte' ? 1.0 :
                                  exp.kompetenz_level === 'fortgeschritten' ? 0.7 : 0.4;
          const volumenBonus = Math.min(exp.erfolgreiche_antraege / 50, 1) * 0.3;
          expertiseScore += (levelMultiplier + volumenBonus);
          matchedBereiche.push({
            bereich: exp.foerderbereich,
            level: exp.kompetenz_level,
            antraege: exp.erfolgreiche_antraege,
            volumen: exp.gesamtvolumen_eur
          });
        }
      }
    }
    // Normalisieren auf 0-35
    faktoren.foerder_expertise = Math.min(expertiseScore / relevanteBereiche.length * ZUWEISUNG_GEWICHTE.foerder_expertise, ZUWEISUNG_GEWICHTE.foerder_expertise);
    faktoren.matched_bereiche = matchedBereiche;
    score += faktoren.foerder_expertise;

    // --- Faktor 2: Region (20 Punkte) ---
    const beraterRegion = b.region || '';
    if (beraterRegion === bundesland) {
      faktoren.region = ZUWEISUNG_GEWICHTE.region;
    } else {
      // Nachbarländer-Bonus (aus matching.js NACHBAR_MAP)
      const nachbarn = getNachbarn(bundesland);
      if (nachbarn.includes(beraterRegion)) {
        faktoren.region = ZUWEISUNG_GEWICHTE.region * 0.6;
      } else {
        // Prüfe ob Berater bundesweit in Expertise arbeitet
        const hatBundesweit = expertise.results.some(e => {
          try {
            const bl = JSON.parse(e.bundeslaender || '[]');
            return bl.includes('bundesweit') || bl.includes(bundesland);
          } catch { return false; }
        });
        faktoren.region = hatBundesweit ? ZUWEISUNG_GEWICHTE.region * 0.5 : 0;
      }
    }
    score += faktoren.region;

    // --- Faktor 3: Branche (15 Punkte) ---
    let beraterBranchen = [];
    try { beraterBranchen = JSON.parse(b.branchen || '[]'); } catch {}
    const brancheMatch = beraterBranchen.some(bb =>
      bb.toLowerCase().includes(branche?.toLowerCase() || '') ||
      (branche || '').toLowerCase().includes(bb.toLowerCase()) ||
      bb === 'Branchenübergreifend'
    );
    faktoren.branche = brancheMatch ? ZUWEISUNG_GEWICHTE.branche : 0;
    score += faktoren.branche;

    // --- Faktor 4: Erfolgsquote (15 Punkte) ---
    const dienstleistungenList = dienstleistungenByBerater.get(b.id) || [];
    const dienstleistungen = { results: dienstleistungenList };

    const avgErfolg = dienstleistungen.results.length > 0
      ? dienstleistungen.results.reduce((s, d) => s + (d.erfolgsquote || 0), 0) / dienstleistungen.results.length
      : (b.rating_avg || 0) * 20; // Fallback: rating * 20 = max 100

    faktoren.erfolgsquote = (avgErfolg / 100) * ZUWEISUNG_GEWICHTE.erfolgsquote;
    score += faktoren.erfolgsquote;

    // --- Faktor 5: Passende Dienstleistung (15 Punkte) ---
    let besteDienstleistung = null;
    let besteDlScore = 0;

    for (const dl of dienstleistungen.results) {
      let dlScore = 0;
      let dlBereiche = [];
      try { dlBereiche = JSON.parse(dl.foerderbereiche || '[]'); } catch {}

      // Prüfe ob die Förderbereiche der Dienstleistung zu den gefundenen Programmen passen
      const bereichOverlap = dlBereiche.filter(dlb =>
        relevanteBereiche.some(rb => rb.includes(dlb) || dlb.includes(rb))
      ).length;

      dlScore = bereichOverlap > 0 ? (bereichOverlap / Math.max(dlBereiche.length, 1)) : 0;

      // Bonus für Erfolgsquote und Projektanzahl
      dlScore += (dl.erfolgsquote || 0) / 100 * 0.3;
      dlScore += Math.min((dl.abgeschlossene_projekte || 0) / 50, 1) * 0.2;

      if (dlScore > besteDlScore) {
        besteDlScore = dlScore;
        besteDienstleistung = dl;
      }
    }

    faktoren.dienstleistung_match = Math.min(besteDlScore * ZUWEISUNG_GEWICHTE.dienstleistung_match, ZUWEISUNG_GEWICHTE.dienstleistung_match);
    score += faktoren.dienstleistung_match;

    // Ergebnis
    beraterScores.push({
      berater: {
        id: b.id,
        display_name: b.display_name,
        region: b.region,
        branchen: beraterBranchen,
        rating_avg: b.rating_avg,
        photo_url: b.photo_url
      },
      score: Math.round(score * 10) / 10,
      max_score: 100,
      faktoren: {
        foerder_expertise: Math.round(faktoren.foerder_expertise * 10) / 10,
        region: Math.round(faktoren.region * 10) / 10,
        branche: Math.round(faktoren.branche * 10) / 10,
        erfolgsquote: Math.round(faktoren.erfolgsquote * 10) / 10,
        dienstleistung_match: Math.round(faktoren.dienstleistung_match * 10) / 10
      },
      matched_bereiche: matchedBereiche,
      empfohlene_dienstleistung: besteDienstleistung ? {
        id: besteDienstleistung.id,
        titel: besteDienstleistung.titel,
        beschreibung: besteDienstleistung.beschreibung,
        kategorie: besteDienstleistung.kategorie,
        preis_typ: besteDienstleistung.preis_typ,
        preis_von: besteDienstleistung.preis_von,
        preis_bis: besteDienstleistung.preis_bis,
        dauer_tage: besteDienstleistung.dauer_tage,
        inklusiv_leistungen: JSON.parse(besteDienstleistung.inklusiv_leistungen || '[]'),
        erfolgsquote: besteDienstleistung.erfolgsquote,
        abgeschlossene_projekte: besteDienstleistung.abgeschlossene_projekte
      } : null,
      alle_dienstleistungen: dienstleistungen.results.map(dl => ({
        id: dl.id,
        titel: dl.titel,
        kategorie: dl.kategorie,
        preis_typ: dl.preis_typ,
        preis_von: dl.preis_von,
        preis_bis: dl.preis_bis
      }))
    });
  }

  // 5. Sortieren nach Score
  beraterScores.sort((a, b) => b.score - a.score);

  // 6. Zuweisung in DB speichern (Top-Berater)
  if (beraterScores.length > 0) {
    const top = beraterScores[0];
    await env.PLATFORM_DB.prepare(`
      INSERT OR REPLACE INTO berater_zuweisungen
        (id, session_id, berater_id, dienstleistung_id, matching_score, matching_faktoren, programme_ids, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'vorgeschlagen')
    `).bind(
      uuid(),
      sessionId,
      top.berater.id,
      top.empfohlene_dienstleistung?.id || null,
      top.score,
      JSON.stringify(top.faktoren),
      JSON.stringify(programmIds),
    ).run();
  }

  // 7. KI-Zusammenfassung generieren
  const topBerater = beraterScores.slice(0, 3);
  const zusammenfassung = topBerater.length > 0
    ? `Für ${session.firmenname} in ${session.bundesland} (${session.branche}) empfehlen wir **${topBerater[0].berater.display_name}** (Score: ${topBerater[0].score}/100) mit der Dienstleistung "${topBerater[0].empfohlene_dienstleistung?.titel || 'Individuelle Beratung'}". ${topBerater[0].matched_bereiche.length > 0 ? `Dieser Berater hat ${topBerater[0].matched_bereiche.reduce((s, m) => s + m.antraege, 0)} erfolgreiche Anträge in den relevanten Förderbereichen.` : ''}`
    : 'Leider konnte kein passender Berater gefunden werden.';

    return json({
      success: true,
      session_id: sessionId,
      unternehmen: {
        firmenname: session.firmenname,
        branche: session.branche,
        bundesland: session.bundesland,
        vorhaben: session.vorhaben
      },
      relevante_foerderbereiche: relevanteBereiche,
      relevante_foerderarten: relevanteArten,
      anzahl_programme: programmIds.length,
      zusammenfassung,
      berater_empfehlungen: beraterScores,
      gewichtung: ZUWEISUNG_GEWICHTE
    });
  } catch (error) {
    console.error('[findBestBerater] Fehler:', error);
    return new Response(JSON.stringify({ error: 'Interner Serverfehler', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Nachbarländer-Map für Regions-Matching
function getNachbarn(bundesland) {
  const NACHBAR = {
    'Baden-Württemberg': ['Bayern', 'Hessen', 'Rheinland-Pfalz'],
    'Bayern': ['Baden-Württemberg', 'Hessen', 'Thüringen', 'Sachsen'],
    'Berlin': ['Brandenburg'],
    'Brandenburg': ['Berlin', 'Sachsen', 'Sachsen-Anhalt', 'Mecklenburg-Vorpommern', 'Niedersachsen'],
    'Bremen': ['Niedersachsen'],
    'Hamburg': ['Schleswig-Holstein', 'Niedersachsen'],
    'Hessen': ['Bayern', 'Baden-Württemberg', 'Rheinland-Pfalz', 'Nordrhein-Westfalen', 'Thüringen', 'Niedersachsen'],
    'Mecklenburg-Vorpommern': ['Brandenburg', 'Niedersachsen', 'Schleswig-Holstein'],
    'Niedersachsen': ['Bremen', 'Hamburg', 'Schleswig-Holstein', 'Mecklenburg-Vorpommern', 'Brandenburg', 'Sachsen-Anhalt', 'Thüringen', 'Hessen', 'Nordrhein-Westfalen'],
    'Nordrhein-Westfalen': ['Niedersachsen', 'Hessen', 'Rheinland-Pfalz'],
    'Rheinland-Pfalz': ['Nordrhein-Westfalen', 'Hessen', 'Baden-Württemberg', 'Saarland'],
    'Saarland': ['Rheinland-Pfalz'],
    'Sachsen': ['Bayern', 'Thüringen', 'Sachsen-Anhalt', 'Brandenburg'],
    'Sachsen-Anhalt': ['Niedersachsen', 'Brandenburg', 'Sachsen', 'Thüringen'],
    'Schleswig-Holstein': ['Hamburg', 'Niedersachsen', 'Mecklenburg-Vorpommern'],
    'Thüringen': ['Hessen', 'Bayern', 'Sachsen', 'Sachsen-Anhalt', 'Niedersachsen']
  };
  return NACHBAR[bundesland] || [];
}

// ============================================================
// BERATER-ANFRAGE-WORKFLOW
// Unternehmen → Anfrage → Berater annehmen/ablehnen → Buchung
// ============================================================

// POST /api/anfragen – Unternehmen sendet Anfrage an Berater
async function createAnfrage(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  const body = await request.json().catch(() => null);
  if (!body?.berater_id) return err("berater_id ist erforderlich");

  // Berater prüfen
  const berater = await env.PLATFORM_DB.prepare(
    "SELECT id, display_name, verfuegbar FROM berater_profiles WHERE id = ?"
  ).bind(body.berater_id).first();
  if (!berater) return err("Berater nicht gefunden", 404);
  if (!berater.verfuegbar) return err("Berater ist derzeit nicht verfügbar");

  const anfrageId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO berater_zuweisungen (id, session_id, berater_id, dienstleistung_id, matching_score, programme_ids, status, anfrage_text)
    VALUES (?, ?, ?, ?, ?, ?, 'angefragt', ?)
  `).bind(
    anfrageId,
    body.session_id || null,
    body.berater_id,
    body.dienstleistung_id || null,
    body.matching_score || 0,
    JSON.stringify(body.programme_ids || []),
    body.nachricht || null
  ).run();

  // Netzwerk-Anfrage erstellen (für Messaging)
  await env.PLATFORM_DB.prepare(`
    INSERT INTO netzwerk_anfragen (id, von_user_id, an_user_id, typ, nachricht, status)
    VALUES (?, ?, ?, 'beratung', ?, 'offen')
  `).bind(uuid(), user.userId, berater.id, body.nachricht || `Anfrage für Fördermittelberatung`).run();

  return json({
    success: true,
    anfrage_id: anfrageId,
    berater: berater.display_name,
    status: "angefragt"
  });
}

// PATCH /api/anfragen/:id – Berater nimmt an/lehnt ab
async function updateAnfrage(request, env, anfrageId) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  const body = await request.json().catch(() => null);
  if (!body?.status) return err("status ist erforderlich");
  if (!["angenommen", "abgelehnt"].includes(body.status)) return err("Ungültiger Status");

  const anfrage = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_zuweisungen WHERE id = ?"
  ).bind(anfrageId).first();
  if (!anfrage) return err("Anfrage nicht gefunden", 404);

  const updateField = body.status === "angenommen" ? "angenommen_am" : "abgelehnt_am";
  await env.PLATFORM_DB.prepare(`
    UPDATE berater_zuweisungen SET status = ?, ${updateField} = datetime('now'), updated_at = datetime('now') WHERE id = ?
  `).bind(body.status, anfrageId).run();

  // Bei Annahme: Tracker-Vorgang erstellen
  if (body.status === "angenommen" && anfrage.session_id) {
    await env.PLATFORM_DB.prepare(`
      INSERT INTO tracker_vorgaenge (id, user_id, titel, beschreibung, typ, status, frist)
      VALUES (?, ?, ?, ?, 'beratung', 'aktiv', datetime('now', '+30 days'))
    `).bind(uuid(), user.userId, `Beratung: ${anfrage.session_id}`, body.antwort || "Beratung angenommen").run();
  }

  return json({ success: true, status: body.status, anfrage_id: anfrageId });
}

// GET /api/anfragen – Eigene Anfragen (Unternehmen oder Berater)
async function listAnfragen(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const url = new URL(request.url);
  const rolle = url.searchParams.get("rolle") || "unternehmen";
  const status = url.searchParams.get("status") || "";

  let query, params;
  if (rolle === "berater") {
    // Berater sieht eingehende Anfragen
    const profil = await env.PLATFORM_DB.prepare(
      "SELECT id FROM berater_profiles WHERE user_id = ?"
    ).bind(user.userId).first();
    if (!profil) return err("Kein Berater-Profil gefunden", 404);

    query = `SELECT z.*, bp.display_name as berater_name, dl.titel as dienstleistung_titel
      FROM berater_zuweisungen z
      LEFT JOIN berater_profiles bp ON z.berater_id = bp.id
      LEFT JOIN berater_dienstleistungen dl ON z.dienstleistung_id = dl.id
      WHERE z.berater_id = ? ${status ? "AND z.status = ?" : ""}
      ORDER BY z.created_at DESC LIMIT 50`;
    params = status ? [profil.id, status] : [profil.id];
  } else {
    // Unternehmen sieht eigene Anfragen (über session_id)
    const sessions = await env.CHECK_DB.prepare(
      "SELECT id FROM check_sessions WHERE user_id = ?"
    ).bind(user.userId).all();
    const sessionIds = sessions.results.map(s => s.id);
    if (!sessionIds.length) return json({ success: true, anfragen: [] });

    const placeholders = sessionIds.map(() => "?").join(",");
    query = `SELECT z.*, bp.display_name as berater_name, dl.titel as dienstleistung_titel
      FROM berater_zuweisungen z
      LEFT JOIN berater_profiles bp ON z.berater_id = bp.id
      LEFT JOIN berater_dienstleistungen dl ON z.dienstleistung_id = dl.id
      WHERE z.session_id IN (${placeholders})
      ORDER BY z.created_at DESC LIMIT 50`;
    params = sessionIds;
  }

  const anfragen = await env.PLATFORM_DB.prepare(query).bind(...params).all();
  return json({
    success: true,
    anfragen: anfragen.results.map(a => ({
      ...a,
      programme_ids: JSON.parse(a.programme_ids || "[]"),
      matching_faktoren: JSON.parse(a.matching_faktoren || "{}"),
    }))
  });
}

// ============================================================
// BERATER-PROFIL CRUD
// ============================================================

// GET /api/berater/profil – Eigenes Profil
async function getBeraterProfil(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  const profil = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_profiles WHERE user_id = ?"
  ).bind(user.userId).first();
  if (!profil) return err("Kein Berater-Profil gefunden", 404);

  const expertise = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_foerder_expertise WHERE berater_id = ?"
  ).bind(profil.id).all();

  const dienstleistungen = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_dienstleistungen WHERE berater_id = ?"
  ).bind(profil.id).all();

  const bewertungen = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_bewertungen WHERE berater_profile_id = ? ORDER BY created_at DESC LIMIT 20"
  ).bind(profil.id).all();

  return json({
    success: true,
    profil: { ...profil, branchen: JSON.parse(profil.branchen || "[]"), spezialisierungen: JSON.parse(profil.spezialisierungen || "[]") },
    expertise: expertise.results.map(e => ({ ...e, bundeslaender: JSON.parse(e.bundeslaender || "[]") })),
    dienstleistungen: dienstleistungen.results.map(d => ({
      ...d,
      foerderbereiche: JSON.parse(d.foerderbereiche || "[]"),
      foerderarten: JSON.parse(d.foerderarten || "[]"),
      inklusiv_leistungen: JSON.parse(d.inklusiv_leistungen || "[]"),
    })),
    bewertungen: bewertungen.results,
  });
}

// PUT /api/berater/profil – Profil aktualisieren
async function updateBeraterProfil(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body) return err("Ungültige Anfrage");

  let profil = await env.PLATFORM_DB.prepare(
    "SELECT id FROM berater_profiles WHERE user_id = ?"
  ).bind(user.userId).first();

  if (!profil) {
    // Berater-Profil erstellen (Onboarding)
    const profilId = uuid();
    await env.PLATFORM_DB.prepare(`
      INSERT INTO berater_profiles (id, user_id, display_name, bio, branchen, spezialisierungen, region, plz, telefon, website, verfuegbar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      profilId, user.userId,
      body.display_name || user.name || "Neuer Berater",
      body.bio || null,
      JSON.stringify(body.branchen || []),
      JSON.stringify(body.spezialisierungen || []),
      body.region || null, body.plz || null, body.telefon || null, body.website || null
    ).run();

    // Rolle auf "berater" setzen
    await env.PLATFORM_DB.prepare("UPDATE users SET role = 'berater' WHERE id = ?").bind(user.userId).run();
    return json({ success: true, profil_id: profilId, created: true });
  }

  // Profil aktualisieren
  await env.PLATFORM_DB.prepare(`
    UPDATE berater_profiles SET
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      branchen = COALESCE(?, branchen),
      spezialisierungen = COALESCE(?, spezialisierungen),
      region = COALESCE(?, region),
      plz = COALESCE(?, plz),
      telefon = COALESCE(?, telefon),
      website = COALESCE(?, website),
      verfuegbar = COALESCE(?, verfuegbar),
      updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.display_name || null, body.bio || null,
    body.branchen ? JSON.stringify(body.branchen) : null,
    body.spezialisierungen ? JSON.stringify(body.spezialisierungen) : null,
    body.region || null, body.plz || null, body.telefon || null, body.website || null,
    body.verfuegbar !== undefined ? (body.verfuegbar ? 1 : 0) : null,
    profil.id
  ).run();

  return json({ success: true, profil_id: profil.id, updated: true });
}

// POST /api/berater/dienstleistungen – Neue Dienstleistung anlegen
async function createDienstleistung(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body?.titel || !body?.kategorie) return err("titel und kategorie sind erforderlich");

  const profil = await env.PLATFORM_DB.prepare(
    "SELECT id FROM berater_profiles WHERE user_id = ?"
  ).bind(user.userId).first();
  if (!profil) return err("Kein Berater-Profil gefunden", 404);

  const dlId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO berater_dienstleistungen (id, berater_id, titel, beschreibung, kategorie, foerderbereiche, foerderarten, preis_typ, preis_von, preis_bis, dauer_tage, inklusiv_leistungen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    dlId, profil.id, body.titel, body.beschreibung || null, body.kategorie,
    JSON.stringify(body.foerderbereiche || []),
    JSON.stringify(body.foerderarten || []),
    body.preis_typ || "pauschal", body.preis_von || null, body.preis_bis || null,
    body.dauer_tage || null,
    JSON.stringify(body.inklusiv_leistungen || [])
  ).run();

  return json({ success: true, dienstleistung_id: dlId });
}

// PUT /api/berater/dienstleistungen/:id – Dienstleistung aktualisieren
async function updateDienstleistung(request, env, dlId) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);

  const profil = await env.PLATFORM_DB.prepare("SELECT id FROM berater_profiles WHERE user_id = ?").bind(user.userId).first();
  if (!profil) return err("Kein Berater-Profil", 404);

  // Prüfe Eigentümerschaft
  const dl = await env.PLATFORM_DB.prepare("SELECT id FROM berater_dienstleistungen WHERE id = ? AND berater_id = ?").bind(dlId, profil.id).first();
  if (!dl) return err("Dienstleistung nicht gefunden oder nicht berechtigt", 404);

  await env.PLATFORM_DB.prepare(`
    UPDATE berater_dienstleistungen SET
      titel = COALESCE(?, titel), beschreibung = COALESCE(?, beschreibung),
      kategorie = COALESCE(?, kategorie), foerderbereiche = COALESCE(?, foerderbereiche),
      foerderarten = COALESCE(?, foerderarten), preis_typ = COALESCE(?, preis_typ),
      preis_von = COALESCE(?, preis_von), preis_bis = COALESCE(?, preis_bis),
      dauer_tage = COALESCE(?, dauer_tage), inklusiv_leistungen = COALESCE(?, inklusiv_leistungen),
      aktiv = COALESCE(?, aktiv), updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    body.titel || null, body.beschreibung || null, body.kategorie || null,
    body.foerderbereiche ? JSON.stringify(body.foerderbereiche) : null,
    body.foerderarten ? JSON.stringify(body.foerderarten) : null,
    body.preis_typ || null, body.preis_von || null, body.preis_bis || null,
    body.dauer_tage || null,
    body.inklusiv_leistungen ? JSON.stringify(body.inklusiv_leistungen) : null,
    body.aktiv !== undefined ? (body.aktiv ? 1 : 0) : null,
    dlId
  ).run();

  return json({ success: true, updated: true });
}

// POST /api/berater/expertise – Förder-Expertise hinzufügen
async function addExpertise(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body?.foerderbereich) return err("foerderbereich ist erforderlich");

  const profil = await env.PLATFORM_DB.prepare("SELECT id FROM berater_profiles WHERE user_id = ?").bind(user.userId).first();
  if (!profil) return err("Kein Berater-Profil", 404);

  const expId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO berater_foerder_expertise (id, berater_id, foerderbereich, foerderart, bundeslaender, erfolgreiche_antraege, gesamtvolumen_eur, kompetenz_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    expId, profil.id, body.foerderbereich, body.foerderart || null,
    JSON.stringify(body.bundeslaender || []),
    body.erfolgreiche_antraege || 0, body.gesamtvolumen_eur || 0,
    body.kompetenz_level || "basis"
  ).run();

  return json({ success: true, expertise_id: expId });
}

// ============================================================
// UNTERNEHMEN-DASHBOARD
// ============================================================

async function getUnternehmenDashboard(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  // Meine Checks
  const checks = await env.CHECK_DB.prepare(`
    SELECT id, firmenname, branche, bundesland, vorhaben, status, created_at, updated_at
    FROM check_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).bind(user.userId).all();

  // Für jeden Check: Ergebnis-Count + Optimierung
  const checkDetails = [];
  for (const c of checks.results) {
    const ergCount = await env.CHECK_DB.prepare("SELECT COUNT(*) as c FROM check_ergebnisse WHERE session_id = ?").bind(c.id).first();
    const kombi = await env.PLATFORM_DB.prepare(
      "SELECT gesamt_foerdersumme_max FROM foerder_kombinationen WHERE session_id = ? ORDER BY geprueft_am DESC LIMIT 1"
    ).bind(c.id).first();
    checkDetails.push({
      ...c,
      ergebnisse_count: ergCount?.c || 0,
      optimierte_foerdersumme: kombi?.gesamt_foerdersumme_max || null,
    });
  }

  // Meine Anfragen an Berater
  const sessionIds = checks.results.map(c => c.id);
  let anfragen = [];
  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => "?").join(",");
    const anf = await env.PLATFORM_DB.prepare(`
      SELECT z.*, bp.display_name as berater_name, dl.titel as dienstleistung_titel
      FROM berater_zuweisungen z
      LEFT JOIN berater_profiles bp ON z.berater_id = bp.id
      LEFT JOIN berater_dienstleistungen dl ON z.dienstleistung_id = dl.id
      WHERE z.session_id IN (${placeholders})
      ORDER BY z.created_at DESC LIMIT 20
    `).bind(...sessionIds).all();
    anfragen = anf.results;
  }

  // Meine Favoriten
  const favoriten = await env.PLATFORM_DB.prepare(
    "SELECT * FROM foerdermittel_favoriten WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
  ).bind(user.userId).all();

  // Stats
  const totalChecks = checks.results.length;
  const aktiveAnfragen = anfragen.filter(a => a.status === "angefragt" || a.status === "angenommen").length;
  const maxFoerdersumme = checkDetails.reduce((max, c) => Math.max(max, c.optimierte_foerdersumme || 0), 0);

  return json({
    success: true,
    stats: {
      total_checks: totalChecks,
      aktive_anfragen: aktiveAnfragen,
      max_foerdersumme: maxFoerdersumme,
      favoriten_count: favoriten.results.length,
    },
    checks: checkDetails,
    anfragen,
    favoriten: favoriten.results,
  });
}

// ============================================================
// BERATER-DASHBOARD
// ============================================================

async function getBeraterDashboard(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  const profil = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_profiles WHERE user_id = ?"
  ).bind(user.userId).first();
  if (!profil) return err("Kein Berater-Profil gefunden", 404);

  // Eingehende Anfragen
  const anfragen = await env.PLATFORM_DB.prepare(`
    SELECT z.*, cs.firmenname, cs.branche, cs.bundesland, cs.vorhaben
    FROM berater_zuweisungen z
    LEFT JOIN check_sessions cs ON z.session_id = cs.id
    WHERE z.berater_id = ?
    ORDER BY z.created_at DESC LIMIT 50
  `).bind(profil.id).all();

  // Workaround: check_sessions ist in CHECK_DB, nicht PLATFORM_DB
  // Also laden wir die Session-Daten separat
  const anfrageDetails = [];
  for (const a of anfragen.results) {
    let sessionInfo = null;
    if (a.session_id) {
      sessionInfo = await env.CHECK_DB.prepare(
        "SELECT firmenname, branche, bundesland, vorhaben FROM check_sessions WHERE id = ?"
      ).bind(a.session_id).first();
    }
    anfrageDetails.push({
      ...a,
      programme_ids: JSON.parse(a.programme_ids || "[]"),
      matching_faktoren: JSON.parse(a.matching_faktoren || "{}"),
      unternehmen: sessionInfo,
    });
  }

  // Bewertungen
  const bewertungen = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_bewertungen WHERE berater_profile_id = ? ORDER BY created_at DESC LIMIT 10"
  ).bind(profil.id).all();

  // Dienstleistungen
  const dienstleistungen = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_dienstleistungen WHERE berater_id = ?"
  ).bind(profil.id).all();

  // Stats
  const offeneAnfragen = anfrageDetails.filter(a => a.status === "angefragt").length;
  const angenommene = anfrageDetails.filter(a => a.status === "angenommen").length;
  const abgeschlossene = anfrageDetails.filter(a => a.status === "abgeschlossen").length;

  return json({
    success: true,
    profil: { ...profil, branchen: JSON.parse(profil.branchen || "[]"), spezialisierungen: JSON.parse(profil.spezialisierungen || "[]") },
    stats: {
      offene_anfragen: offeneAnfragen,
      aktive_projekte: angenommene,
      abgeschlossene_projekte: abgeschlossene,
      gesamt_anfragen: anfrageDetails.length,
      rating: profil.rating_avg,
      bewertungen_count: profil.rating_count,
      profil_views: profil.profil_views,
      dienstleistungen_count: dienstleistungen.results.length,
    },
    anfragen: anfrageDetails,
    bewertungen: bewertungen.results,
    dienstleistungen: dienstleistungen.results.map(d => ({
      ...d,
      foerderbereiche: JSON.parse(d.foerderbereiche || "[]"),
      foerderarten: JSON.parse(d.foerderarten || "[]"),
      inklusiv_leistungen: JSON.parse(d.inklusiv_leistungen || "[]"),
    })),
  });
}

// ============================================================
// FAVORITEN
// ============================================================

async function toggleFavorit(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body?.programm_id) return err("programm_id ist erforderlich");

  const existing = await env.PLATFORM_DB.prepare(
    "SELECT id FROM foerdermittel_favoriten WHERE user_id = ? AND programm_id = ?"
  ).bind(user.userId, body.programm_id).first();

  if (existing) {
    await env.PLATFORM_DB.prepare("DELETE FROM foerdermittel_favoriten WHERE id = ?").bind(existing.id).run();
    return json({ success: true, action: "entfernt", programm_id: body.programm_id });
  } else {
    // Prüfe ob foerdermittel_favoriten die richtige Spalte hat
    await env.PLATFORM_DB.prepare(
      "INSERT INTO foerdermittel_favoriten (id, user_id, programm_id) VALUES (?, ?, ?)"
    ).bind(uuid(), user.userId, body.programm_id).run();
    return json({ success: true, action: "gemerkt", programm_id: body.programm_id });
  }
}

async function listFavoriten(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);

  const favs = await env.PLATFORM_DB.prepare(
    "SELECT * FROM foerdermittel_favoriten WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(user.userId).all();

  // Programm-Details laden
  const favDetails = [];
  for (const f of favs.results) {
    const prog = await env.FOERDER_DB.prepare(
      "SELECT id, titel, foerderart, foerderbereich, foerdergebiet, kurztext, url FROM foerderprogramme WHERE id = ?"
    ).bind(f.programm_id).first();
    favDetails.push({ ...f, programm: prog });
  }

  return json({ success: true, favoriten: favDetails });
}

// ============================================================
// BEWERTUNGEN
// ============================================================

async function createBewertung(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body?.berater_id || !body?.score) return err("berater_id und score sind erforderlich");
  if (body.score < 1 || body.score > 5) return err("Score muss zwischen 1 und 5 liegen");

  // Prüfe ob Anfrage existiert und abgeschlossen ist
  const bewertungId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO berater_bewertungen (id, berater_profile_id, von_user_id, sterne, text)
    VALUES (?, ?, ?, ?, ?)
  `).bind(bewertungId, body.berater_id, user.userId, body.score, body.kommentar || null).run();

  // Rating neu berechnen
  const stats = await env.PLATFORM_DB.prepare(
    "SELECT AVG(sterne) as avg, COUNT(*) as count FROM berater_bewertungen WHERE berater_profile_id = ?"
  ).bind(body.berater_id).first();

  await env.PLATFORM_DB.prepare(
    "UPDATE berater_profiles SET rating_avg = ?, rating_count = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(Math.round((stats?.avg || 0) * 10) / 10, stats?.count || 0, body.berater_id).run();

  return json({ success: true, bewertung_id: bewertungId, neues_rating: stats?.avg, bewertungen_gesamt: stats?.count });
}

// ============================================================
// BERATER-BUCHUNG → PAYMENT BRIDGE
// ============================================================

async function createBuchung(request, env) {
  const user = await optionalAuth(request, env);
  if (!user) return err("Authentifizierung erforderlich", 401);
  const body = await request.json().catch(() => null);
  if (!body?.anfrage_id) return err("anfrage_id ist erforderlich");

  const anfrage = await env.PLATFORM_DB.prepare(
    "SELECT * FROM berater_zuweisungen WHERE id = ? AND status = 'angenommen'"
  ).bind(body.anfrage_id).first();
  if (!anfrage) return err("Anfrage nicht gefunden oder noch nicht angenommen", 404);

  // Dienstleistung laden für Preis
  let preis = body.preis || 0;
  if (anfrage.dienstleistung_id) {
    const dl = await env.PLATFORM_DB.prepare(
      "SELECT preis_von, preis_bis, preis_typ FROM berater_dienstleistungen WHERE id = ?"
    ).bind(anfrage.dienstleistung_id).first();
    if (dl) preis = preis || dl.preis_von || 0;
  }

  // Order erstellen
  const orderId = uuid();
  await env.PLATFORM_DB.prepare(`
    INSERT INTO orders (id, user_id, paket_id, betrag, status, typ, referenz_id, created_at)
    VALUES (?, ?, 'beratung', ?, 'ausstehend', 'beratung', ?, datetime('now'))
  `).bind(orderId, user.userId, preis, anfrage.id).run();

  // Status aktualisieren
  await env.PLATFORM_DB.prepare(
    "UPDATE berater_zuweisungen SET status = 'gebucht', updated_at = datetime('now') WHERE id = ?"
  ).bind(anfrage.id).run();

  return json({
    success: true,
    order_id: orderId,
    betrag: preis,
    status: "ausstehend",
    hinweis: "Bitte nutze /api/payments/stripe/create-session auf dem Haupt-Worker um die Zahlung abzuschließen",
    stripe_payload: {
      order_id: orderId,
      amount: Math.round(preis * 100),
      currency: "eur",
      description: `Fördermittelberatung – ${anfrage.dienstleistung_id || "Individuell"}`
    }
  });
}

// ============================================================
// NETZWERK SYSTEM – Berater-Netzwerk & Nachrichten
// ============================================================

async function listNetzwerkBerater(request, env) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const region = url.searchParams.get('region');
    const branche = url.searchParams.get('branche');
    const search = url.searchParams.get('q');
    let conditions = ['bp.verfuegbar = 1']; let params = [];
    if (region) { conditions.push('bp.region = ?'); params.push(region); }
    if (branche) { conditions.push('bp.branchen LIKE ?'); params.push(`%${branche}%`); }
    if (search) { conditions.push('(bp.display_name LIKE ? OR bp.bio LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countR = await env.PLATFORM_DB.prepare(`SELECT COUNT(*) as total FROM berater_profiles bp ${where}`).bind(...params).first();
    const total = countR?.total || 0;
    const results = await env.PLATFORM_DB.prepare(`
      SELECT bp.id, bp.user_id, bp.display_name, bp.bio, bp.photo_url, bp.branchen, bp.spezialisierungen, bp.region, bp.rating_avg, bp.rating_count, bp.profil_views, u.email
      FROM berater_profiles bp LEFT JOIN users u ON bp.user_id = u.id ${where}
      ORDER BY bp.rating_avg DESC, bp.rating_count DESC LIMIT ? OFFSET ?
    `).bind(...params, limit, (page - 1) * limit).all();
    return json({ success: true, berater: (results.results || []).map(b => ({ ...b, branchen: JSON.parse(b.branchen || '[]'), spezialisierungen: JSON.parse(b.spezialisierungen || '[]') })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { console.error('listNetzwerkBerater error:', e); return err(e.message, 500); }
}

async function sendKontaktAnfrage(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { an_berater_id, typ, nachricht } = await request.json();
    if (!an_berater_id || !typ || !nachricht) return err('Pflichtfelder: an_berater_id, typ, nachricht', 400);
    if (!['beratung', 'zusammenarbeit', 'frage'].includes(typ)) return err('Ungültiger Typ', 400);
    const id = crypto.randomUUID().replace(/-/g, ''); const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(`INSERT INTO netzwerk_anfragen (id, von_user_id, an_berater_id, typ, nachricht, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'offen', ?, ?)`).bind(id, auth.userId, an_berater_id, typ, nachricht, now, now).run();

    // === AUTOMATISIERUNG: Admin-Alert + Berater-Info ===
    const berater = await env.PLATFORM_DB.prepare('SELECT display_name FROM berater_profiles WHERE id = ?').bind(an_berater_id).first();
    const sender = await env.PLATFORM_DB.prepare('SELECT name, company FROM users WHERE id = ?').bind(auth.userId).first();
    await createAdminAlert(env, 'neue_anfrage', 'normal',
      `Neue Anfrage: ${sender?.name || 'Unbekannt'} → ${berater?.display_name || 'Berater'}`,
      `Typ: ${typ} | Unternehmen: ${sender?.company || '-'}`, 'anfrage', id);

    return json({ success: true, id, status: 'offen', created_at: now }, 201);
  } catch (e) { return err(e.message, 500); }
}

async function listKontaktAnfragen(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const url = new URL(request.url);
    const direction = url.searchParams.get('direction') || 'received';
    const sent = await env.PLATFORM_DB.prepare(`SELECT na.*, bp.display_name as partner_name FROM netzwerk_anfragen na JOIN berater_profiles bp ON na.an_berater_id = bp.id WHERE na.von_user_id = ? ORDER BY na.created_at DESC LIMIT 50`).bind(auth.userId).all();
    const received = await env.PLATFORM_DB.prepare(`SELECT na.*, u.name as partner_name FROM netzwerk_anfragen na JOIN users u ON na.von_user_id = u.id WHERE na.an_berater_id IN (SELECT id FROM berater_profiles WHERE user_id = ?) ORDER BY na.created_at DESC LIMIT 50`).bind(auth.userId).all();
    return json({ success: true, gesendet: sent.results || [], empfangen: received.results || [] });
  } catch (e) { return err(e.message, 500); }
}

async function updateKontaktAnfrage(request, env, id) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { status } = await request.json();
    if (!['angenommen', 'abgelehnt'].includes(status)) return err('Status muss "angenommen" oder "abgelehnt" sein', 400);
    const anfrage = await env.PLATFORM_DB.prepare('SELECT * FROM netzwerk_anfragen WHERE id = ?').bind(id).first();
    if (!anfrage) return err('Anfrage nicht gefunden', 404);
    const beraterProfile = await env.PLATFORM_DB.prepare('SELECT id FROM berater_profiles WHERE user_id = ?').bind(auth.userId).first();
    if (!beraterProfile || anfrage.an_berater_id !== beraterProfile.id) return err('Nicht berechtigt', 403);
    const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare('UPDATE netzwerk_anfragen SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, id).run();

    // === AUTOMATISIERUNG: Provision bei Annahme ===
    if (status === 'angenommen') {
      const provision = await berechneProvision(env, anfrage.an_berater_id, 'lead', 'anfrage', id, anfrage.von_user_id, null, 1000);
      const sender = await env.PLATFORM_DB.prepare('SELECT name FROM users WHERE id = ?').bind(anfrage.von_user_id).first();
      await createAdminAlert(env, 'neue_anfrage', 'normal',
        `Anfrage angenommen: ${beraterProfile.id}`,
        `Berater hat Anfrage von ${sender?.name || 'Unbekannt'} angenommen${provision ? '. Provision: ' + provision.betrag.toFixed(2) + '€' : ''}`,
        'anfrage', id);
    }

    return json({ success: true, id, status, updated_at: now });
  } catch (e) { return err(e.message, 500); }
}

async function sendNachricht(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { an_user_id, betreff, nachricht } = await request.json();
    if (!an_user_id || !betreff || !nachricht) return err('Pflichtfelder: an_user_id, betreff, nachricht', 400);
    const id = crypto.randomUUID().replace(/-/g, ''); const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(`INSERT INTO netzwerk_nachrichten (id, von_user_id, an_user_id, betreff, nachricht, gelesen, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)`).bind(id, auth.userId, an_user_id, betreff, nachricht, now).run();
    return json({ success: true, id, created_at: now }, 201);
  } catch (e) { return err(e.message, 500); }
}

async function listNachrichten(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const inbox = await env.PLATFORM_DB.prepare(`SELECT nn.*, u.name as von_name FROM netzwerk_nachrichten nn JOIN users u ON nn.von_user_id = u.id WHERE nn.an_user_id = ? ORDER BY nn.created_at DESC LIMIT 50`).bind(auth.userId).all();
    const sent = await env.PLATFORM_DB.prepare(`SELECT nn.*, u.name as an_name FROM netzwerk_nachrichten nn JOIN users u ON nn.an_user_id = u.id WHERE nn.von_user_id = ? ORDER BY nn.created_at DESC LIMIT 50`).bind(auth.userId).all();
    const unread = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as count FROM netzwerk_nachrichten WHERE an_user_id = ? AND gelesen = 0').bind(auth.userId).first();
    return json({ success: true, inbox: inbox.results || [], sent: sent.results || [], unread: unread?.count || 0 });
  } catch (e) { return err(e.message, 500); }
}

async function markNachrichtGelesen(request, env, id) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const n = await env.PLATFORM_DB.prepare('SELECT * FROM netzwerk_nachrichten WHERE id = ?').bind(id).first();
    if (!n) return err('Nachricht nicht gefunden', 404);
    if (n.an_user_id !== auth.userId) return err('Nicht berechtigt', 403);
    await env.PLATFORM_DB.prepare('UPDATE netzwerk_nachrichten SET gelesen = 1 WHERE id = ?').bind(id).run();
    return json({ success: true, id, gelesen: true });
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// FORUM SYSTEM – Community Fragen & Antworten
// ============================================================

async function listForumThreads(request, env) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const kategorie = url.searchParams.get('kategorie');
    const sortBy = url.searchParams.get('sort') || 'newest';
    let conditions = []; let params = [];
    if (kategorie) { conditions.push('ft.kategorie = ?'); params.push(kategorie); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = sortBy === 'upvotes' ? 'ft.upvotes DESC' : 'ft.gepinnt DESC, ft.created_at DESC';
    const countR = await env.PLATFORM_DB.prepare(`SELECT COUNT(*) as total FROM forum_threads ft ${where}`).bind(...params).first();
    const total = countR?.total || 0;
    const results = await env.PLATFORM_DB.prepare(`
      SELECT ft.*, u.name as author_name FROM forum_threads ft JOIN users u ON ft.user_id = u.id ${where} ORDER BY ${order} LIMIT ? OFFSET ?
    `).bind(...params, limit, (page - 1) * limit).all();
    return json({ success: true, threads: (results.results || []).map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { return err(e.message, 500); }
}

async function getForumThread(request, env, threadId) {
  try {
    const thread = await env.PLATFORM_DB.prepare(`SELECT ft.*, u.name as author_name FROM forum_threads ft JOIN users u ON ft.user_id = u.id WHERE ft.id = ?`).bind(threadId).first();
    if (!thread) return err('Thread nicht gefunden', 404);
    const antworten = await env.PLATFORM_DB.prepare(`SELECT fa.*, u.name as author_name FROM forum_antworten fa JOIN users u ON fa.user_id = u.id WHERE fa.thread_id = ? ORDER BY fa.ist_loesung DESC, fa.upvotes DESC, fa.created_at ASC`).bind(threadId).all();
    return json({ success: true, thread: { ...thread, tags: JSON.parse(thread.tags || '[]') }, antworten: antworten.results || [] });
  } catch (e) { return err(e.message, 500); }
}

async function createForumThread(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { kategorie, titel, inhalt, tags } = await request.json();
    if (!kategorie || !titel || !inhalt) return err('Pflichtfelder: kategorie, titel, inhalt', 400);
    if (titel.length < 5 || titel.length > 200) return err('Titel muss 5-200 Zeichen haben', 400);
    const id = crypto.randomUUID().replace(/-/g, ''); const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(`INSERT INTO forum_threads (id, user_id, kategorie, titel, inhalt, tags, upvotes, antworten_count, gepinnt, gesperrt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`).bind(id, auth.userId, kategorie, titel, inhalt, JSON.stringify(tags || []), now, now).run();
    return json({ success: true, id, titel, kategorie, created_at: now }, 201);
  } catch (e) { return err(e.message, 500); }
}

async function createForumAntwort(request, env, threadId) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { inhalt } = await request.json();
    if (!inhalt || inhalt.length < 5) return err('Antwort muss mindestens 5 Zeichen haben', 400);
    const thread = await env.PLATFORM_DB.prepare('SELECT id, gesperrt FROM forum_threads WHERE id = ?').bind(threadId).first();
    if (!thread) return err('Thread nicht gefunden', 404);
    if (thread.gesperrt) return err('Thread ist gesperrt', 403);
    const id = crypto.randomUUID().replace(/-/g, ''); const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(`INSERT INTO forum_antworten (id, thread_id, user_id, inhalt, upvotes, ist_loesung, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`).bind(id, threadId, auth.userId, inhalt, now, now).run();
    await env.PLATFORM_DB.prepare('UPDATE forum_threads SET antworten_count = antworten_count + 1, updated_at = ? WHERE id = ?').bind(now, threadId).run();
    return json({ success: true, id, thread_id: threadId, created_at: now }, 201);
  } catch (e) { return err(e.message, 500); }
}

async function toggleForumUpvote(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { thread_id, antwort_id } = await request.json();
    if (!thread_id && !antwort_id) return err('thread_id oder antwort_id erforderlich', 400);
    if (thread_id) {
      const ex = await env.PLATFORM_DB.prepare('SELECT id FROM forum_upvotes WHERE user_id = ? AND thread_id = ? AND antwort_id IS NULL').bind(auth.userId, thread_id).first();
      if (ex) { await env.PLATFORM_DB.prepare('DELETE FROM forum_upvotes WHERE id = ?').bind(ex.id).run(); await env.PLATFORM_DB.prepare('UPDATE forum_threads SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').bind(thread_id).run(); return json({ success: true, upvoted: false }); }
      else { await env.PLATFORM_DB.prepare('INSERT INTO forum_upvotes (id, user_id, thread_id, created_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID().replace(/-/g, ''), auth.userId, thread_id, new Date().toISOString()).run(); await env.PLATFORM_DB.prepare('UPDATE forum_threads SET upvotes = upvotes + 1 WHERE id = ?').bind(thread_id).run(); return json({ success: true, upvoted: true }); }
    }
    if (antwort_id) {
      const ex = await env.PLATFORM_DB.prepare('SELECT id FROM forum_upvotes WHERE user_id = ? AND antwort_id = ?').bind(auth.userId, antwort_id).first();
      if (ex) { await env.PLATFORM_DB.prepare('DELETE FROM forum_upvotes WHERE id = ?').bind(ex.id).run(); await env.PLATFORM_DB.prepare('UPDATE forum_antworten SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').bind(antwort_id).run(); return json({ success: true, upvoted: false }); }
      else { await env.PLATFORM_DB.prepare('INSERT INTO forum_upvotes (id, user_id, antwort_id, created_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID().replace(/-/g, ''), auth.userId, antwort_id, new Date().toISOString()).run(); await env.PLATFORM_DB.prepare('UPDATE forum_antworten SET upvotes = upvotes + 1 WHERE id = ?').bind(antwort_id).run(); return json({ success: true, upvoted: true }); }
    }
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// ADMIN SYSTEM – Plattform-Verwaltung
// ============================================================

async function adminGetUsers(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth || auth.role !== 'admin') return err('Nur für Administratoren', 403);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const search = url.searchParams.get('q'); const role = url.searchParams.get('role');
    let conditions = ['deleted_at IS NULL']; let params = [];
    if (search) { conditions.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (role) { conditions.push('role = ?'); params.push(role); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const countR = await env.PLATFORM_DB.prepare(`SELECT COUNT(*) as total FROM users ${where}`).bind(...params).first();
    const total = countR?.total || 0;
    const results = await env.PLATFORM_DB.prepare(`SELECT id, email, name, role, email_verified, company, phone, created_at, last_login_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, (page - 1) * limit).all();
    return json({ success: true, users: results.results || [], pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (e) { return err(e.message, 500); }
}

async function adminGetStats(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth || auth.role !== 'admin') return err('Nur für Administratoren', 403);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const users = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL').first();
    const berater = await env.PLATFORM_DB.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'berater' AND deleted_at IS NULL").first();
    const unternehmen = await env.PLATFORM_DB.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'unternehmen' AND deleted_at IS NULL").first();
    const newUsers = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL AND created_at > ?').bind(sevenDaysAgo).first();
    const checks = await env.CHECK_DB.prepare('SELECT COUNT(*) as c FROM check_sessions').first();
    const programme = await env.FOERDER_DB.prepare('SELECT COUNT(*) as c FROM foerderprogramme').first();
    const threads = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM forum_threads').first();
    const vorgaenge = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM tracker_vorgaenge').first();
    const anfragen = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM netzwerk_anfragen').first();
    return json({ success: true, stats: {
      total_users: users?.c || 0, total_berater: berater?.c || 0, total_unternehmen: unternehmen?.c || 0,
      neue_nutzer_7_tage: newUsers?.c || 0, total_checks: checks?.c || 0, total_foerderprogramme: programme?.c || 0,
      total_forum_threads: threads?.c || 0, total_vorgaenge: vorgaenge?.c || 0, total_anfragen: anfragen?.c || 0
    } });
  } catch (e) { console.error('adminGetStats error:', e); return err(e.message, 500); }
}

async function adminGetUser(request, env, userId) {
  try {
    const auth = await optionalAuth(request, env); if (!auth || auth.role !== 'admin') return err('Nur für Administratoren', 403);
    const user = await env.PLATFORM_DB.prepare('SELECT id, email, name, first_name, last_name, role, company, phone, website, email_verified, kontingent_total, kontingent_used, onboarding_done, created_at, last_login_at FROM users WHERE id = ?').bind(userId).first();
    if (!user) return err('Benutzer nicht gefunden', 404);
    const bp = await env.PLATFORM_DB.prepare('SELECT * FROM berater_profiles WHERE user_id = ?').bind(userId).first();
    return json({ success: true, user, berater_profil: bp || null });
  } catch (e) { return err(e.message, 500); }
}

async function adminUpdateUser(request, env, userId) {
  try {
    const auth = await optionalAuth(request, env); if (!auth || auth.role !== 'admin') return err('Nur für Administratoren', 403);
    const body = await request.json();
    const allowed = ['role', 'email_verified', 'kontingent_total'];
    const updates = []; const vals = [];
    for (const f of allowed) { if (f in body) { updates.push(`${f} = ?`); vals.push(body[f]); } }
    if (!updates.length) return err('Keine gültigen Felder', 400);
    vals.push(userId);
    await env.PLATFORM_DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true, message: 'Benutzer aktualisiert' });
  } catch (e) { return err(e.message, 500); }
}

async function adminDeleteUser(request, env, userId) {
  try {
    const auth = await optionalAuth(request, env); if (!auth || auth.role !== 'admin') return err('Nur für Administratoren', 403);
    if (userId === auth.userId) return err('Eigenen Account kann nicht gelöscht werden', 400);
    const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare('UPDATE users SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL').bind(now, userId).run();
    return json({ success: true, message: 'Benutzer deaktiviert' });
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// TRACKER SYSTEM – Fördermittel-Vorgänge & Fristen
// ============================================================

async function listVorgaenge(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const url = new URL(request.url);
    const phase = url.searchParams.get('phase');
    let conditions = ['user_id = ?']; let params = [auth.userId];
    if (phase) { conditions.push('phase = ?'); params.push(phase); }
    const results = await env.PLATFORM_DB.prepare(`SELECT * FROM tracker_vorgaenge WHERE ${conditions.join(' AND ')} ORDER BY CASE WHEN naechste_frist IS NOT NULL THEN 0 ELSE 1 END, naechste_frist ASC, created_at DESC LIMIT 100`).bind(...params).all();
    return json({ success: true, vorgaenge: results.results || [] });
  } catch (e) { return err(e.message, 500); }
}

async function createVorgang(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const { titel, beschreibung, programm_name, foerdersumme, naechste_frist, prioritaet } = await request.json();
    if (!titel) return err('Titel erforderlich', 400);
    const validP = ['niedrig', 'normal', 'hoch', 'dringend'];
    const prio = validP.includes(prioritaet) ? prioritaet : 'normal';
    const id = crypto.randomUUID().replace(/-/g, ''); const now = new Date().toISOString();
    await env.PLATFORM_DB.prepare(`INSERT INTO tracker_vorgaenge (id, user_id, titel, beschreibung, programm_name, foerdersumme, phase, naechste_frist, prioritaet, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'vorbereitung', ?, ?, ?, ?)`).bind(id, auth.userId, titel, beschreibung || null, programm_name || null, foerdersumme || null, naechste_frist || null, prio, now, now).run();
    // Log initial activity
    await env.PLATFORM_DB.prepare(`INSERT INTO tracker_aktivitaeten (id, vorgang_id, user_id, typ, beschreibung, created_at) VALUES (?, ?, ?, 'erstellt', 'Vorgang erstellt', ?)`).bind(crypto.randomUUID().replace(/-/g, ''), id, auth.userId, now).run();
    return json({ success: true, id, titel, phase: 'vorbereitung', created_at: now }, 201);
  } catch (e) { return err(e.message, 500); }
}

async function getVorgang(request, env, id) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const v = await env.PLATFORM_DB.prepare('SELECT * FROM tracker_vorgaenge WHERE id = ? AND user_id = ?').bind(id, auth.userId).first();
    if (!v) return err('Vorgang nicht gefunden', 404);
    const akt = await env.PLATFORM_DB.prepare('SELECT * FROM tracker_aktivitaeten WHERE vorgang_id = ? ORDER BY created_at DESC').bind(id).all();
    return json({ success: true, vorgang: v, aktivitaeten: akt.results || [] });
  } catch (e) { return err(e.message, 500); }
}

async function updateVorgang(request, env, id) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const v = await env.PLATFORM_DB.prepare('SELECT * FROM tracker_vorgaenge WHERE id = ? AND user_id = ?').bind(id, auth.userId).first();
    if (!v) return err('Vorgang nicht gefunden', 404);
    const body = await request.json();
    const now = new Date().toISOString();
    const allowed = ['titel', 'beschreibung', 'programm_name', 'foerdersumme', 'phase', 'naechste_frist', 'frist_typ', 'prioritaet'];
    const validPhases = ['vorbereitung', 'antrag', 'pruefung', 'bewilligt', 'abgeschlossen', 'abgelehnt'];
    if (body.phase && !validPhases.includes(body.phase)) return err('Ungültige Phase', 400);
    const updates = []; const vals = [];
    for (const f of allowed) { if (f in body) { updates.push(`${f} = ?`); vals.push(body[f]); } }
    if (!updates.length) return err('Keine Felder zum Aktualisieren', 400);
    updates.push('updated_at = ?'); vals.push(now); vals.push(id);
    await env.PLATFORM_DB.prepare(`UPDATE tracker_vorgaenge SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    if (body.phase && body.phase !== v.phase) {
      await env.PLATFORM_DB.prepare(`INSERT INTO tracker_aktivitaeten (id, vorgang_id, user_id, typ, beschreibung, alte_phase, neue_phase, created_at) VALUES (?, ?, ?, 'status_aenderung', ?, ?, ?, ?)`).bind(crypto.randomUUID().replace(/-/g, ''), id, auth.userId, `Phase: ${v.phase} → ${body.phase}`, v.phase, body.phase, now).run();
    }
    return json({ success: true, message: 'Vorgang aktualisiert' });
  } catch (e) { return err(e.message, 500); }
}

async function deleteVorgang(request, env, id) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const v = await env.PLATFORM_DB.prepare('SELECT id FROM tracker_vorgaenge WHERE id = ? AND user_id = ?').bind(id, auth.userId).first();
    if (!v) return err('Vorgang nicht gefunden', 404);
    await env.PLATFORM_DB.prepare('DELETE FROM tracker_aktivitaeten WHERE vorgang_id = ?').bind(id).run();
    await env.PLATFORM_DB.prepare('DELETE FROM tracker_benachrichtigungen WHERE vorgang_id = ?').bind(id).run();
    await env.PLATFORM_DB.prepare('DELETE FROM tracker_vorgaenge WHERE id = ?').bind(id).run();
    return json({ success: true, message: 'Vorgang gelöscht' });
  } catch (e) { return err(e.message, 500); }
}

async function listBenachrichtigungen(request, env) {
  try {
    const auth = await optionalAuth(request, env); if (!auth) return err('Authentifizierung erforderlich', 401);
    const results = await env.PLATFORM_DB.prepare(`SELECT tb.*, tv.titel as vorgang_titel FROM tracker_benachrichtigungen tb LEFT JOIN tracker_vorgaenge tv ON tb.vorgang_id = tv.id WHERE tb.user_id = ? ORDER BY tb.created_at DESC LIMIT 50`).bind(auth.userId).all();
    const unread = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM tracker_benachrichtigungen WHERE user_id = ? AND gesendet = 0').bind(auth.userId).first();
    return json({ success: true, benachrichtigungen: results.results || [], unread: unread?.c || 0 });
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// AUTOMATISIERUNGS-SYSTEM
// ============================================================

// --- Helper: Admin-Alert erstellen ---
async function createAdminAlert(env, typ, prioritaet, titel, beschreibung, referenz_typ, referenz_id) {
  try {
    await env.PLATFORM_DB.prepare(
      `INSERT INTO admin_alerts (id, typ, prioritaet, titel, beschreibung, referenz_typ, referenz_id) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID().replace(/-/g, ''), typ, prioritaet, titel, beschreibung, referenz_typ || null, referenz_id || null).run();
  } catch (e) { console.error("Alert-Fehler:", e.message); }
}

// --- Helper: Provision berechnen und erstellen ---
async function berechneProvision(env, berater_profile_id, typ, referenz_typ, referenz_id, unternehmen_user_id, foerderbereich, betrag_basis) {
  try {
    // Passendes Provisionsmodell finden
    let modell;
    if (foerderbereich) {
      modell = await env.PLATFORM_DB.prepare(
        "SELECT * FROM provisions_modelle WHERE aktiv = 1 AND typ = ? AND foerderbereich = ? LIMIT 1"
      ).bind(typ, foerderbereich).first();
    }
    if (!modell) {
      modell = await env.PLATFORM_DB.prepare(
        "SELECT * FROM provisions_modelle WHERE aktiv = 1 AND typ = ? AND foerderbereich IS NULL LIMIT 1"
      ).bind(typ).first();
    }
    if (!modell) return null;

    let provBetrag = betrag_basis * modell.provisions_satz;
    if (modell.min_betrag && provBetrag < modell.min_betrag) provBetrag = modell.min_betrag;
    if (modell.max_betrag && provBetrag > modell.max_betrag) provBetrag = modell.max_betrag;
    if (provBetrag <= 0) return null;

    const faelligAm = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const provId = crypto.randomUUID().replace(/-/g, '');

    await env.PLATFORM_DB.prepare(`
      INSERT INTO provisionen (id, berater_profile_id, typ, referenz_typ, referenz_id, unternehmen_user_id, foerderbereich, betrag_basis, provisions_satz, provisions_betrag, status, faellig_am, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offen', ?, ?, ?)
    `).bind(provId, berater_profile_id, typ, referenz_typ, referenz_id, unternehmen_user_id || null, foerderbereich || null, betrag_basis, modell.provisions_satz, provBetrag, faelligAm, new Date().toISOString(), new Date().toISOString()).run();

    // Admin-Alert für neue Provision
    await createAdminAlert(env, 'provision_faellig', 'normal',
      `Neue Provision: ${provBetrag.toFixed(2)}€ (${typ})`,
      `Berater-Profil ${berater_profile_id} | Basis: ${betrag_basis}€ | Satz: ${(modell.provisions_satz * 100).toFixed(0)}%`,
      'provision', provId);

    return { id: provId, betrag: provBetrag, satz: modell.provisions_satz, modell: modell.name };
  } catch (e) { console.error("Provisions-Fehler:", e.message); return null; }
}

// --- Auto-Matching: Finde passende Berater für einen Check ---
async function autoMatchBerater(env, checkSession) {
  try {
    const bundesland = checkSession.bundesland || '';
    const branche = checkSession.branche || '';
    const vorhaben = checkSession.vorhaben || '';

    // Alle aktiven Berater laden
    const berater = await env.PLATFORM_DB.prepare(`
      SELECT bp.id, bp.user_id, bp.display_name, bp.branchen, bp.spezialisierungen, bp.region,
             bp.rating_avg, bp.rating_count, bp.verfuegbar
      FROM berater_profiles bp
      WHERE bp.verfuegbar = 1
    `).all();

    if (!berater.results?.length) return [];

    const matches = [];
    for (const b of berater.results) {
      let score = 0;
      const gruende = [];

      // Region-Match
      if (b.region && bundesland && b.region.toLowerCase().includes(bundesland.toLowerCase())) {
        score += 30;
        gruende.push(`Region passt: ${b.region}`);
      }

      // Branchen-Match
      const branchen = JSON.parse(b.branchen || '[]');
      if (branchen.some(br => branche.toLowerCase().includes(br.toLowerCase()) || br.toLowerCase().includes(branche.toLowerCase()))) {
        score += 25;
        gruende.push(`Branche passt: ${branche}`);
      }

      // Spezialisierung-Match
      const specs = JSON.parse(b.spezialisierungen || '[]');
      if (specs.some(s => vorhaben.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(vorhaben.toLowerCase()))) {
        score += 25;
        gruende.push(`Spezialisierung passt: ${vorhaben}`);
      }

      // Rating-Bonus
      if (b.rating_avg >= 4.5) { score += 10; gruende.push(`Top-Bewertung: ${b.rating_avg}★`); }
      else if (b.rating_avg >= 4.0) { score += 5; gruende.push(`Gute Bewertung: ${b.rating_avg}★`); }

      // Erfahrungs-Bonus (Anzahl Bewertungen)
      if (b.rating_count >= 10) { score += 10; gruende.push(`Erfahren: ${b.rating_count} Bewertungen`); }
      else if (b.rating_count >= 5) { score += 5; }

      if (score >= 30) {
        matches.push({ berater_profile_id: b.id, display_name: b.display_name, score, gruende });
      }
    }

    // Nach Score sortieren und Top 5
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 5);

    // In auto_matching_log speichern
    for (const m of topMatches) {
      await env.PLATFORM_DB.prepare(`
        INSERT INTO auto_matching_log (id, check_session_id, unternehmen_user_id, berater_profile_id, matching_score, matching_gruende)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID().replace(/-/g, ''),
        checkSession.id,
        checkSession.user_id || null,
        m.berater_profile_id,
        m.score,
        JSON.stringify(m.gruende)
      ).run();
    }

    return topMatches;
  } catch (e) {
    console.error("Auto-Match Fehler:", e.message);
    return [];
  }
}

// --- Admin Alerts & Provisionen Endpunkte ---
async function getAdminAlerts(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first();
    if (!user || user.role !== 'admin') return err('Admin-Berechtigung erforderlich', 403);

    const url = new URL(request.url);
    const nurUngelesen = url.searchParams.get('ungelesen') === '1';
    const typ = url.searchParams.get('typ');

    let query = 'SELECT * FROM admin_alerts WHERE 1=1';
    const params = [];
    if (nurUngelesen) { query += ' AND gelesen = 0'; }
    if (typ) { query += ' AND typ = ?'; params.push(typ); }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const results = await env.PLATFORM_DB.prepare(query).bind(...params).all();
    const ungelesen = await env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM admin_alerts WHERE gelesen = 0').first();

    return json({ success: true, alerts: results.results || [], ungelesen: ungelesen?.c || 0 });
  } catch (e) { return err(e.message, 500); }
}

async function markAlertGelesen(request, env, alertId) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first();
    if (!user || user.role !== 'admin') return err('Admin-Berechtigung erforderlich', 403);

    await env.PLATFORM_DB.prepare('UPDATE admin_alerts SET gelesen = 1 WHERE id = ?').bind(alertId).run();
    return json({ success: true, message: 'Alert als gelesen markiert' });
  } catch (e) { return err(e.message, 500); }
}

async function getProvisionen(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first();
    if (!user || user.role !== 'admin') return err('Admin-Berechtigung erforderlich', 403);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const berater_id = url.searchParams.get('berater_id');

    let query = `SELECT p.*, bp.display_name as berater_name FROM provisionen p
      LEFT JOIN berater_profiles bp ON p.berater_profile_id = bp.id WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND p.status = ?'; params.push(status); }
    if (berater_id) { query += ' AND p.berater_profile_id = ?'; params.push(berater_id); }
    query += ' ORDER BY p.created_at DESC LIMIT 200';

    const results = await env.PLATFORM_DB.prepare(query).bind(...params).all();

    // Zusammenfassung berechnen
    const alle = results.results || [];
    const zusammenfassung = {
      gesamt: alle.reduce((s, p) => s + p.provisions_betrag, 0),
      offen: alle.filter(p => p.status === 'offen').reduce((s, p) => s + p.provisions_betrag, 0),
      bestaetigt: alle.filter(p => p.status === 'bestaetigt').reduce((s, p) => s + p.provisions_betrag, 0),
      bezahlt: alle.filter(p => p.status === 'bezahlt').reduce((s, p) => s + p.provisions_betrag, 0),
      anzahl: alle.length,
    };

    return json({ success: true, provisionen: alle, zusammenfassung });
  } catch (e) { return err(e.message, 500); }
}

async function updateProvision(request, env, provId) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first();
    if (!user || user.role !== 'admin') return err('Admin-Berechtigung erforderlich', 403);

    const body = await request.json();
    const updates = []; const vals = [];
    if (body.status) {
      if (!['offen', 'bestaetigt', 'bezahlt', 'storniert'].includes(body.status)) return err('Ungültiger Status', 400);
      updates.push('status = ?'); vals.push(body.status);
      if (body.status === 'bezahlt') { updates.push('bezahlt_am = ?'); vals.push(new Date().toISOString()); }
    }
    if (body.rechnungs_nr) { updates.push('rechnungs_nr = ?'); vals.push(body.rechnungs_nr); }
    if (body.notiz) { updates.push('notiz = ?'); vals.push(body.notiz); }
    updates.push('updated_at = ?'); vals.push(new Date().toISOString());
    vals.push(provId);

    await env.PLATFORM_DB.prepare(`UPDATE provisionen SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true, message: 'Provision aktualisiert' });
  } catch (e) { return err(e.message, 500); }
}

// --- Auto-Matching Endpunkt ---
async function getAutoMatching(request, env, sessionId) {
  try {
    const session = await env.CHECK_DB.prepare("SELECT * FROM check_sessions WHERE id = ?").bind(sessionId).first();
    if (!session) return err("Session nicht gefunden", 404);

    // Bestehende Matches prüfen
    let matches = await env.PLATFORM_DB.prepare(
      "SELECT aml.*, bp.display_name, bp.bio, bp.rating_avg, bp.rating_count, bp.region FROM auto_matching_log aml JOIN berater_profiles bp ON aml.berater_profile_id = bp.id WHERE aml.check_session_id = ? ORDER BY aml.matching_score DESC"
    ).bind(sessionId).all();

    // Wenn noch keine Matches existieren, automatisch erstellen
    if (!matches.results?.length) {
      const newMatches = await autoMatchBerater(env, session);
      if (newMatches.length > 0) {
        matches = await env.PLATFORM_DB.prepare(
          "SELECT aml.*, bp.display_name, bp.bio, bp.rating_avg, bp.rating_count, bp.region FROM auto_matching_log aml JOIN berater_profiles bp ON aml.berater_profile_id = bp.id WHERE aml.check_session_id = ? ORDER BY aml.matching_score DESC"
        ).bind(sessionId).all();
      }
    }

    return json({ success: true, session_id: sessionId, matches: matches.results || [] });
  } catch (e) { return err(e.message, 500); }
}

// --- Dashboard-Stats für Admin (erweitert mit Provisionen) ---
async function getAdminDashboard(request, env) {
  try {
    const auth = await optionalAuth(request, env);
    if (!auth) return err('Authentifizierung erforderlich', 401);
    const user = await env.PLATFORM_DB.prepare('SELECT role FROM users WHERE id = ?').bind(auth.userId).first();
    if (!user || user.role !== 'admin') return err('Admin-Berechtigung erforderlich', 403);

    const [users, berater, anfragen, checks, provisionen, alerts, threads] = await Promise.all([
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM users').first(),
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM berater_profiles').first(),
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM netzwerk_anfragen').first(),
      env.CHECK_DB.prepare('SELECT COUNT(*) as c FROM check_sessions').first(),
      env.PLATFORM_DB.prepare("SELECT COALESCE(SUM(provisions_betrag),0) as gesamt, COUNT(*) as anzahl FROM provisionen WHERE status != 'storniert'").first(),
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM admin_alerts WHERE gelesen = 0').first(),
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM forum_threads').first(),
    ]);

    // Letzte 7 Tage Aktivität
    const sieben_tage = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [neueUser, neueAnfragen, neueChecks] = await Promise.all([
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM users WHERE created_at >= ?').bind(sieben_tage).first(),
      env.PLATFORM_DB.prepare('SELECT COUNT(*) as c FROM netzwerk_anfragen WHERE created_at >= ?').bind(sieben_tage).first(),
      env.CHECK_DB.prepare('SELECT COUNT(*) as c FROM check_sessions WHERE created_at >= ?').bind(sieben_tage).first(),
    ]);

    return json({
      success: true,
      dashboard: {
        gesamt: { users: users?.c || 0, berater: berater?.c || 0, anfragen: anfragen?.c || 0, checks: checks?.c || 0, threads: threads?.c || 0 },
        provisionen: { gesamt_summe: provisionen?.gesamt || 0, anzahl: provisionen?.anzahl || 0 },
        ungelesene_alerts: alerts?.c || 0,
        letzte_7_tage: { neue_user: neueUser?.c || 0, neue_anfragen: neueAnfragen?.c || 0, neue_checks: neueChecks?.c || 0 },
      }
    });
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// RECHTSRAHMEN & REFERENZDATEN ENDPUNKTE
// ============================================================

async function getRechtsrahmen(request, env) {
  try {
    const url = new URL(request.url);
    const kategorie = url.searchParams.get('kategorie');
    let query = 'SELECT id, kategorie, titel, rechtsgrundlage, gueltig_ab, gueltig_bis, max_betrag, max_intensitaet, zeitraum_jahre, zusammenfassung, quelle_url FROM rechtsrahmen WHERE aktiv = 1';
    const params = [];
    if (kategorie) { query += ' AND kategorie = ?'; params.push(kategorie); }
    query += ' ORDER BY kategorie, titel';
    const results = await env.PLATFORM_DB.prepare(query).bind(...params).all();
    return json({ success: true, rechtsrahmen: results.results || [], total: (results.results || []).length });
  } catch (e) { return err(e.message, 500); }
}

async function getKombinationsregeln(request, env) {
  try {
    const url = new URL(request.url);
    const typ = url.searchParams.get('typ');
    let query = 'SELECT id, regel_typ, foerderart_a, foerderart_b, rechtsgrundlage, max_kumulierte_intensitaet, bedingung, erklaerung, beispiel FROM kombinationsregeln WHERE aktiv = 1';
    const params = [];
    if (typ) { query += ' AND regel_typ = ?'; params.push(typ); }
    query += ' ORDER BY prioritaet DESC';
    const results = await env.PLATFORM_DB.prepare(query).bind(...params).all();
    return json({ success: true, regeln: results.results || [], total: (results.results || []).length });
  } catch (e) { return err(e.message, 500); }
}

async function getAnforderungen(request, env) {
  try {
    const url = new URL(request.url);
    const kategorie = url.searchParams.get('kategorie');
    let query = 'SELECT id, programm_kategorie, anforderung_typ, kriterium, beschreibung, schwellenwert, rechtsgrundlage FROM unternehmens_anforderungen';
    const params = [];
    if (kategorie) { query += ' WHERE programm_kategorie = ?'; params.push(kategorie); }
    query += ' ORDER BY programm_kategorie, anforderung_typ';
    const results = await env.PLATFORM_DB.prepare(query).bind(...params).all();
    return json({ success: true, anforderungen: results.results || [], total: (results.results || []).length });
  } catch (e) { return err(e.message, 500); }
}

async function pruefeKombinierbarkeit(request, env) {
  try {
    const body = await request.json();
    const { foerderart_a, foerderart_b } = body;
    if (!foerderart_a || !foerderart_b) return err('foerderart_a und foerderart_b sind erforderlich', 400);

    // Exakte und ähnliche Regeln suchen
    const regeln = await env.PLATFORM_DB.prepare(`
      SELECT * FROM kombinationsregeln WHERE aktiv = 1
        AND ((foerderart_a LIKE ? AND foerderart_b LIKE ?)
          OR (foerderart_a LIKE ? AND foerderart_b LIKE ?))
      ORDER BY prioritaet DESC
    `).bind(`%${foerderart_a}%`, `%${foerderart_b}%`, `%${foerderart_b}%`, `%${foerderart_a}%`).all();

    // Relevante Rechtsrahmen laden
    const rechtsrahmen = await env.PLATFORM_DB.prepare(
      "SELECT kategorie, titel, zusammenfassung, max_betrag, max_intensitaet FROM rechtsrahmen WHERE aktiv = 1 AND kategorie IN ('kumulierung', 'doppelfoerderung') ORDER BY titel"
    ).all();

    return json({
      success: true,
      foerderart_a,
      foerderart_b,
      direkte_regeln: regeln.results || [],
      allgemeine_regeln: rechtsrahmen.results || [],
      empfehlung: (regeln.results || []).length > 0
        ? `${(regeln.results || [])[0].regel_typ === 'erlaubt' ? '✅ Grundsätzlich kombinierbar' : regeln.results[0].regel_typ === 'verboten' ? '❌ Kombination nicht zulässig' : '⚠️ Bedingt kombinierbar'}: ${(regeln.results || [])[0].erklaerung}`
        : '⚠️ Keine spezifische Regel gefunden — Einzelfallprüfung empfohlen'
    });
  } catch (e) { return err(e.message, 500); }
}

// ============================================================
// ROUTER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.startsWith("/check/")) path = path.substring(6) || "/";
    else if (path === "/check") path = "/";
    const method = request.method;

    // CORS preflight — dynamisch pro Origin
    const corsHeaders = getCorsHeaders(request);
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Zentrales Rate Limiting ---
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

    // Schreibende Endpoints: 30/min pro IP
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      if (!checkRate(`write:${clientIP}`, 30)) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten.", success: false }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" }
        });
      }
    }

    // Lesende Endpoints: 120/min pro IP
    if (method === "GET") {
      if (!checkRate(`read:${clientIP}`, 120)) {
        return new Response(JSON.stringify({ error: "Zu viele Anfragen. Bitte warten.", success: false }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "30" }
        });
      }
    }

    // Auth-Endpoints (Login/Register): Strenger, 10/min pro IP
    if ((path === "/api/auth/login" || path === "/api/auth/register") && method === "POST") {
      if (!checkRate(`auth:${clientIP}`, 10)) {
        return new Response(JSON.stringify({ error: "Zu viele Anmeldeversuche. Bitte warten.", success: false }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "120" }
        });
      }
    }

    try {
      // Health check
      if (path === "/health" && method === "GET") {
        const dbCheck = await env.CHECK_DB.prepare("SELECT 1").first();
        return json({
          status: "ok",
          service: "foerdermittel-check-api",
          version: env.API_VERSION,
          database: dbCheck ? "connected" : "error",
        });
      }

      // POST /api/checks – Neuen Check starten
      if (path === "/api/checks" && method === "POST") {
        return createCheck(request, env);
      }

      // Route matching for /api/checks/:id/...
      const checkMatch = path.match(/^\/api\/checks\/([a-f0-9]+)(\/.*)?$/);
      if (checkMatch) {
        const sessionId = checkMatch[1];
        const sub = checkMatch[2] || "";

        if (sub === "/chat" && method === "POST") return chatMessage(request, env, sessionId);
        if (sub === "/docs" && method === "POST") return uploadDocument(request, env, sessionId);
        if (sub === "/analyze" && method === "POST") return analyzeCheck(request, env, sessionId);
        if (sub === "/optimize" && method === "POST") return optimizeCheck(request, env, sessionId);
        if (sub === "/schwarm" && method === "POST") return schwarmOptimierung(request, env, sessionId);
        if (sub === "/plan" && method === "GET") return getActionPlan(request, env, sessionId);
        if (sub === "/berater" && method === "GET") return findBestBerater(request, env, sessionId);
        if (sub === "" && method === "GET") return getCheck(request, env, sessionId);

        // PATCH /api/checks/:id/plan/:schritt_id
        const planMatch = sub.match(/^\/plan\/([a-f0-9]+)$/);
        if (planMatch && method === "PATCH") return updatePlanStep(request, env, sessionId, planMatch[1]);
      }

      // GET /api/checks – Liste der eigenen Checks
      if (path === "/api/checks" && method === "GET") {
        const user = await optionalAuth(request, env);
        if (!user) return err("Authentifizierung erforderlich", 401);

        const checks = await env.CHECK_DB.prepare(`
          SELECT id, firmenname, branche, vorhaben, status, created_at
          FROM check_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
        `).bind(user.userId).all();

        return json({ success: true, checks: checks.results });
      }

      // ============================================================
      // FÖRDERPROGRAMME ROUTES – Browse, Search, Stats
      // ============================================================

      // GET /api/foerderprogramme – Browse & Suche
      if (path === "/api/foerderprogramme" && method === "GET") {
        return browseFoerderprogramme(request, env);
      }

      // GET /api/foerderprogramme/stats – Statistiken
      if (path === "/api/foerderprogramme/stats" && method === "GET") {
        return getFoerderprogrammeStats(request, env);
      }

      // GET /api/foerderprogramme/:id – Einzelnes Programm
      const fpMatch = path.match(/^\/api\/foerderprogramme\/(\d+)$/);
      if (fpMatch && method === "GET") {
        return getFoerderprogrammDetail(request, env, parseInt(fpMatch[1]));
      }

      // ============================================================
      // MATCHING ROUTES
      // ============================================================

      // GET /api/matching/berater?vorhaben=...&bundesland=...&branche=...
      if (path === "/api/matching/berater" && method === "GET") {
        return searchMatchingBerater(request, env);
      }

      // GET /api/matching/berater/:id
      const beraterMatch = path.match(/^\/api\/matching\/berater\/([a-f0-9-]+)$/);
      if (beraterMatch && method === "GET") {
        return getBeraterDetail(request, env, beraterMatch[1]);
      }

      // ============================================================
      // BERATER-ZUWEISUNG (nach Check-Analyse)
      // ============================================================

      // GET /api/checks/:id/berater – Berater-Empfehlung basierend auf Förderergebnis
      const zuweisungMatch = path.match(/^\/api\/checks\/([a-f0-9]+)\/berater$/);
      if (zuweisungMatch && method === "GET") {
        return findBestBerater(request, env, zuweisungMatch[1]);
      }

      // GET /api/dienstleistungen – Alle aktiven Dienstleistungen
      if (path === "/api/dienstleistungen" && method === "GET") {
        const url = new URL(request.url);
        const bereich = url.searchParams.get("bereich") || "";
        const kategorie = url.searchParams.get("kategorie") || "";

        let conditions = ["d.aktiv = 1"];
        let params = [];
        if (bereich) {
          conditions.push("d.foerderbereiche LIKE ?");
          params.push(`%${bereich}%`);
        }
        if (kategorie) {
          conditions.push("d.kategorie = ?");
          params.push(kategorie);
        }

        const dl = await env.PLATFORM_DB.prepare(`
          SELECT d.*, bp.display_name as berater_name, bp.region as berater_region, bp.rating_avg as berater_rating
          FROM berater_dienstleistungen d
          JOIN berater_profiles bp ON d.berater_id = bp.id
          WHERE ${conditions.join(" AND ")}
          ORDER BY d.erfolgsquote DESC
        `).bind(...params).all();

        return json({
          success: true,
          dienstleistungen: dl.results.map(d => ({
            ...d,
            foerderbereiche: JSON.parse(d.foerderbereiche || '[]'),
            foerderarten: JSON.parse(d.foerderarten || '[]'),
            inklusiv_leistungen: JSON.parse(d.inklusiv_leistungen || '[]')
          }))
        });
      }

      // ============================================================
      // ANFRAGEN ROUTES – Berater-Anfrage-Workflow
      // ============================================================

      // POST /api/anfragen – Neue Anfrage erstellen
      if (path === "/api/anfragen" && method === "POST") {
        return createAnfrage(request, env);
      }

      // GET /api/anfragen – Eigene Anfragen auflisten
      if (path === "/api/anfragen" && method === "GET") {
        return listAnfragen(request, env);
      }

      // PATCH /api/anfragen/:id – Anfrage-Status ändern
      const anfrageMatch = path.match(/^\/api\/anfragen\/([a-f0-9-]+)$/);
      if (anfrageMatch && method === "PATCH") {
        return updateAnfrage(request, env, anfrageMatch[1]);
      }

      // ============================================================
      // BERATER-PROFIL ROUTES – CRUD
      // ============================================================

      // GET /api/berater/profil – Eigenes Berater-Profil
      if (path === "/api/berater/profil" && method === "GET") {
        return getBeraterProfil(request, env);
      }

      // PUT /api/berater/profil – Profil aktualisieren
      if (path === "/api/berater/profil" && method === "PUT") {
        return updateBeraterProfil(request, env);
      }

      // POST /api/berater/dienstleistungen – Neue Dienstleistung
      if (path === "/api/berater/dienstleistungen" && method === "POST") {
        return createDienstleistung(request, env);
      }

      // PUT /api/berater/dienstleistungen/:id – Dienstleistung bearbeiten
      const dlMatch = path.match(/^\/api\/berater\/dienstleistungen\/([a-f0-9-]+)$/);
      if (dlMatch && method === "PUT") {
        return updateDienstleistung(request, env, dlMatch[1]);
      }

      // POST /api/berater/expertise – Förder-Expertise hinzufügen
      if (path === "/api/berater/expertise" && method === "POST") {
        return addExpertise(request, env);
      }

      // ============================================================
      // DASHBOARD ROUTES
      // ============================================================

      // GET /api/dashboard/unternehmen – Unternehmen-Dashboard
      if (path === "/api/dashboard/unternehmen" && method === "GET") {
        return getUnternehmenDashboard(request, env);
      }

      // GET /api/dashboard/berater – Berater-Dashboard
      if (path === "/api/dashboard/berater" && method === "GET") {
        return getBeraterDashboard(request, env);
      }

      // ============================================================
      // FAVORITEN ROUTES
      // ============================================================

      // POST /api/favoriten – Förderprogramm merken/entmerken
      if (path === "/api/favoriten" && method === "POST") {
        return toggleFavorit(request, env);
      }

      // GET /api/favoriten – Eigene Favoriten auflisten
      if (path === "/api/favoriten" && method === "GET") {
        return listFavoriten(request, env);
      }

      // ============================================================
      // BEWERTUNGEN ROUTES
      // ============================================================

      // POST /api/bewertungen – Berater bewerten
      if (path === "/api/bewertungen" && method === "POST") {
        return createBewertung(request, env);
      }

      // ============================================================
      // BUCHUNGEN ROUTES – Payment Bridge
      // ============================================================

      // POST /api/buchungen – Beratung buchen
      if (path === "/api/buchungen" && method === "POST") {
        return createBuchung(request, env);
      }

      // ============================================================
      // AUTH ROUTES – Registrierung, Login, Profil
      // ============================================================

      // POST /api/auth/register – Neuen Account erstellen
      if (path === "/api/auth/register" && method === "POST") {
        return registerUser(request, env);
      }

      // POST /api/auth/login – Einloggen
      if (path === "/api/auth/login" && method === "POST") {
        return loginUser(request, env);
      }

      // POST /api/auth/verify-email – E-Mail verifizieren
      if (path === "/api/auth/verify-email" && method === "POST") {
        return verifyEmailCode(request, env);
      }

      // GET /api/auth/me – Eigenes Profil abrufen
      if (path === "/api/auth/me" && method === "GET") {
        return getMe(request, env);
      }

      // PATCH /api/auth/me – Eigenes Profil aktualisieren
      if (path === "/api/auth/me" && method === "PATCH") {
        return updateMe(request, env);
      }

      // POST /api/auth/forgot-password – Passwort zurücksetzen anfordern
      if (path === "/api/auth/forgot-password" && method === "POST") {
        return requestPasswordReset(request, env);
      }

      // POST /api/auth/reset-password – Passwort zurücksetzen
      if (path === "/api/auth/reset-password" && method === "POST") {
        return resetPassword(request, env);
      }

      // ============================================================
      // NETZWERK ROUTES – Berater-Suche, Kontaktanfragen, Nachrichten
      // ============================================================

      // GET /api/netzwerk/berater – Berater im Netzwerk suchen
      if (path === "/api/netzwerk/berater" && method === "GET") {
        return listNetzwerkBerater(request, env);
      }

      // POST /api/netzwerk/anfragen – Kontaktanfrage senden
      if (path === "/api/netzwerk/anfragen" && method === "POST") {
        return sendKontaktAnfrage(request, env);
      }

      // GET /api/netzwerk/anfragen – Eigene Kontaktanfragen auflisten
      if (path === "/api/netzwerk/anfragen" && method === "GET") {
        return listKontaktAnfragen(request, env);
      }

      // PATCH /api/netzwerk/anfragen/:id – Kontaktanfrage akzeptieren/ablehnen
      const netzAnfrageMatch = path.match(/^\/api\/netzwerk\/anfragen\/([a-f0-9-]+)$/);
      if (netzAnfrageMatch && method === "PATCH") {
        return updateKontaktAnfrage(request, env, netzAnfrageMatch[1]);
      }

      // POST /api/netzwerk/nachrichten – Nachricht senden
      if (path === "/api/netzwerk/nachrichten" && method === "POST") {
        return sendNachricht(request, env);
      }

      // GET /api/netzwerk/nachrichten – Nachrichten-Postfach
      if (path === "/api/netzwerk/nachrichten" && method === "GET") {
        return listNachrichten(request, env);
      }

      // PATCH /api/netzwerk/nachrichten/:id – Nachricht als gelesen markieren
      const netzMsgMatch = path.match(/^\/api\/netzwerk\/nachrichten\/([a-f0-9-]+)$/);
      if (netzMsgMatch && method === "PATCH") {
        return markNachrichtGelesen(request, env, netzMsgMatch[1]);
      }

      // ============================================================
      // FORUM ROUTES – Threads, Antworten, Upvotes
      // ============================================================

      // GET /api/forum – Forum-Threads auflisten
      if (path === "/api/forum" && method === "GET") {
        return listForumThreads(request, env);
      }

      // POST /api/forum – Neuen Thread erstellen
      if (path === "/api/forum" && method === "POST") {
        return createForumThread(request, env);
      }

      // POST /api/forum/upvote – Upvote auf Thread oder Antwort
      if (path === "/api/forum/upvote" && method === "POST") {
        return toggleForumUpvote(request, env);
      }

      // GET /api/forum/:id – Einzelnen Thread mit Antworten
      const forumThreadMatch = path.match(/^\/api\/forum\/([a-f0-9-]+)$/);
      if (forumThreadMatch && method === "GET") {
        return getForumThread(request, env, forumThreadMatch[1]);
      }

      // POST /api/forum/:id/antworten – Antwort auf Thread
      const forumAntwortMatch = path.match(/^\/api\/forum\/([a-f0-9-]+)\/antworten$/);
      if (forumAntwortMatch && method === "POST") {
        return createForumAntwort(request, env, forumAntwortMatch[1]);
      }

      // ============================================================
      // ADMIN ROUTES – Benutzerverwaltung, Statistiken
      // ============================================================

      // GET /api/admin/stats – Plattform-Statistiken
      if (path === "/api/admin/stats" && method === "GET") {
        return adminGetStats(request, env);
      }

      // GET /api/admin/users – Benutzer auflisten
      if (path === "/api/admin/users" && method === "GET") {
        return adminGetUsers(request, env);
      }

      // GET /api/admin/users/:id – Benutzer-Details
      const adminUserMatch = path.match(/^\/api\/admin\/users\/([a-f0-9-]+)$/);
      if (adminUserMatch && method === "GET") {
        return adminGetUser(request, env, adminUserMatch[1]);
      }

      // PATCH /api/admin/users/:id – Benutzer aktualisieren
      if (adminUserMatch && method === "PATCH") {
        return adminUpdateUser(request, env, adminUserMatch[1]);
      }

      // DELETE /api/admin/users/:id – Benutzer löschen (Soft Delete)
      if (adminUserMatch && method === "DELETE") {
        return adminDeleteUser(request, env, adminUserMatch[1]);
      }

      // ============================================================
      // TRACKER ROUTES – Vorgänge, Benachrichtigungen
      // ============================================================

      // GET /api/tracker/benachrichtigungen – Benachrichtigungen auflisten
      if (path === "/api/tracker/benachrichtigungen" && method === "GET") {
        return listBenachrichtigungen(request, env);
      }

      // GET /api/tracker – Eigene Vorgänge auflisten
      if (path === "/api/tracker" && method === "GET") {
        return listVorgaenge(request, env);
      }

      // POST /api/tracker – Neuen Vorgang erstellen
      if (path === "/api/tracker" && method === "POST") {
        return createVorgang(request, env);
      }

      // GET /api/tracker/:id – Vorgang-Details
      const trackerMatch = path.match(/^\/api\/tracker\/([a-f0-9-]+)$/);
      if (trackerMatch && method === "GET") {
        return getVorgang(request, env, trackerMatch[1]);
      }

      // PATCH /api/tracker/:id – Vorgang aktualisieren
      if (trackerMatch && method === "PATCH") {
        return updateVorgang(request, env, trackerMatch[1]);
      }

      // DELETE /api/tracker/:id – Vorgang löschen
      if (trackerMatch && method === "DELETE") {
        return deleteVorgang(request, env, trackerMatch[1]);
      }

      // === AUTOMATISIERUNG & ADMIN ===

      // GET /api/admin/dashboard – Erweitertes Admin-Dashboard
      if (path === "/api/admin/dashboard" && method === "GET") {
        return getAdminDashboard(request, env);
      }

      // GET /api/admin/alerts – Admin-Alerts (ungefiltert oder nach Typ)
      if (path === "/api/admin/alerts" && method === "GET") {
        return getAdminAlerts(request, env);
      }

      // PATCH /api/admin/alerts/:id – Alert als gelesen markieren
      const alertMatch = path.match(/^\/api\/admin\/alerts\/([a-f0-9-]+)$/);
      if (alertMatch && method === "PATCH") {
        return markAlertGelesen(request, env, alertMatch[1]);
      }

      // GET /api/admin/provisionen – Alle Provisionen
      if (path === "/api/admin/provisionen" && method === "GET") {
        return getProvisionen(request, env);
      }

      // PATCH /api/admin/provisionen/:id – Provision aktualisieren
      const provMatch = path.match(/^\/api\/admin\/provisionen\/([a-f0-9-]+)$/);
      if (provMatch && method === "PATCH") {
        return updateProvision(request, env, provMatch[1]);
      }

      // GET /api/checks/:id/matching – Auto-Matching für Check-Session
      const matchingMatch = path.match(/^\/api\/checks\/([a-f0-9-]+)\/matching$/);
      if (matchingMatch && method === "GET") {
        return getAutoMatching(request, env, matchingMatch[1]);
      }

      // === RECHTSRAHMEN & REFERENZDATEN ===

      // GET /api/rechtsrahmen – Rechtliche Rahmenbedingungen
      if (path === "/api/rechtsrahmen" && method === "GET") {
        return getRechtsrahmen(request, env);
      }

      // GET /api/kombinationsregeln – Fördermittel-Kombinationsregeln
      if (path === "/api/kombinationsregeln" && method === "GET") {
        return getKombinationsregeln(request, env);
      }

      // GET /api/anforderungen – Unternehmensanforderungen pro Programmkategorie
      if (path === "/api/anforderungen" && method === "GET") {
        return getAnforderungen(request, env);
      }

      // POST /api/kombinierbarkeit – Prüfe ob zwei Förderarten kombinierbar sind
      if (path === "/api/kombinierbarkeit" && method === "POST") {
        return pruefeKombinierbarkeit(request, env);
      }

      // 404 handler
      return err("Nicht gefunden", 404);
    } catch (e) {
      console.error("[Error]", e.message, e.stack);
      return err("Interner Serverfehler", 500);
    }
  },
};
