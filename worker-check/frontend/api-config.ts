/**
 * ZFBF.info — API Configuration & Route Mapping
 *
 * Dieses File konfiguriert die Verbindung zwischen Frontend (Next.js)
 * und Backend (Cloudflare Workers). Das Hauptproblem war, dass das
 * Frontend andere Route-Pfade erwartet als der Worker bereitstellt.
 *
 * SETUP:
 * 1. In .env.local setzen: NEXT_PUBLIC_WORKER_URL=https://bafa-creator-ai-worker.<account>.workers.dev
 * 2. Dieses File in lib/ ablegen
 * 3. proxy-to-worker.ts durch die neue Version ersetzen
 */

// ═══ WORKER URL ═══
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL
  || process.env.WORKER_URL
  || "https://bafa-creator-ai-worker.kevin-froeba.workers.dev";

export const CHECK_API_URL = process.env.NEXT_PUBLIC_CHECK_API_URL
  || "https://foerdermittel-check-api.kevin-froeba.workers.dev";

export const FUND24_API_URL = process.env.NEXT_PUBLIC_FUND24_API_URL
  || "https://fund24-api.kevin-froeba.workers.dev";

// ═══ ROUTE MAPPING ═══
// Frontend-Pfade → Worker-Pfade
// Das Frontend nutzt /api/bafa/*, /api/auth/*, etc.
// Der Worker hat teilweise andere Pfad-Strukturen.

export const ROUTE_MAP: Record<string, { worker: string; path: string; notes?: string }> = {
  // ── AUTH ──
  "/api/auth/login":            { worker: "main", path: "/api/auth/login" },
  "/api/auth/register":         { worker: "main", path: "/api/auth/register" },
  "/api/auth/verify-code":      { worker: "main", path: "/api/auth/verify-code" },
  "/api/auth/verify-email":     { worker: "main", path: "/api/auth/verify-email" },
  "/api/auth/session":          { worker: "main", path: "/api/auth/me", notes: "Frontend nennt es 'session', Worker hat 'me'" },
  "/api/auth/refresh":          { worker: "main", path: "/api/auth/refresh" },
  "/api/auth/logout":           { worker: "main", path: "/api/auth/logout" },
  "/api/auth/forgot-password":  { worker: "main", path: "/api/auth/forgot-password" },
  "/api/auth/reset-password":   { worker: "main", path: "/api/auth/reset-password" },
  "/api/auth/resend-code":      { worker: "main", path: "/api/auth/resend-code" },

  // ── BAFA / REPORTS ──
  "/api/bafa/generate":         { worker: "main", path: "/api/reports/generate" },
  "/api/bafa/reports":          { worker: "main", path: "/api/reports/" },
  "/api/bafa/kontingent":       { worker: "main", path: "/api/admin/stats", notes: "Kontingent aus Admin-Stats ableiten" },
  "/api/bafa/checkout":         { worker: "main", path: "/api/payments/stripe/create-session" },
  "/api/bafa/payment-success":  { worker: "main", path: "/api/payments/stripe/webhook", notes: "Webhook-basiert" },
  "/api/bafa/paypal-success":   { worker: "main", path: "/api/payments/paypal/capture-order" },
  "/api/bafa/unlock":           { worker: "main", path: "/api/reports/unlock" },

  // ── REPORTS CRUD ──
  "/api/reports":               { worker: "main", path: "/api/reports/" },

  // ── PAYMENTS ──
  "/api/payments/create":       { worker: "main", path: "/api/payments/stripe/create-session" },
  "/api/payments/success":      { worker: "main", path: "/api/payments/stripe/webhook" },
  "/api/payments/validate":     { worker: "main", path: "/api/promo/validate" },

  // ── USER ──
  "/api/user/profile":          { worker: "main", path: "/api/auth/me", notes: "GET=Profil lesen, PATCH=Profil updaten" },
  "/api/user/onboarding":       { worker: "main", path: "/api/auth/me", notes: "Onboarding-Status als PATCH auf /me" },
  "/api/user/reports":          { worker: "main", path: "/api/reports/" },

  // ── OTHER ──
  "/api/branchen":              { worker: "main", path: "/api/branchen/" },
  "/api/templates":             { worker: "platform", path: "/api/templates", notes: "Evtl. in bafa-report-generator" },
  "/api/generate":              { worker: "main", path: "/api/reports/generate" },
  "/api/promo/validate":        { worker: "main", path: "/api/promo/validate" },

  // ── EIGNUNGSCHECK ──
  "/api/eignungscheck/submit":  { worker: "platform", path: "/api/eignungscheck/submit", notes: "In bafa-report-generator" },
  "/api/eignungscheck/result":  { worker: "platform", path: "/api/eignungscheck/result" },
  "/api/eignungscheck/history": { worker: "platform", path: "/api/eignungscheck/history" },

  // ── FOERDERMITTEL-CHECK (NEU) ──
  "/api/checks":                { worker: "check", path: "/api/checks" },
};

// ═══ WORKER RESOLVER ═══
export function resolveWorkerUrl(frontendPath: string): { url: string; workerPath: string } {
  // Exact match
  const mapping = ROUTE_MAP[frontendPath];
  if (mapping) {
    const baseUrl = mapping.worker === "check" ? CHECK_API_URL
      : mapping.worker === "fund24" ? FUND24_API_URL
      : WORKER_URL;
    return { url: baseUrl, workerPath: mapping.path };
  }

  // Dynamic route matching (e.g., /api/bafa/reports/123)
  for (const [pattern, map] of Object.entries(ROUTE_MAP)) {
    if (frontendPath.startsWith(pattern + "/")) {
      const suffix = frontendPath.slice(pattern.length);
      const baseUrl = map.worker === "check" ? CHECK_API_URL
        : map.worker === "fund24" ? FUND24_API_URL
        : WORKER_URL;
      return { url: baseUrl, workerPath: map.path + suffix };
    }
  }

  // Fallback: pass through to main worker
  return { url: WORKER_URL, workerPath: frontendPath };
}

// ═══ API STATUS (aus Audit) ═══
export const API_STATUS = {
  auth: {
    coverage: "100%",
    notes: "Alle 11 Auth-Endpoints haben Worker-Gegenstücke",
    mapping_issues: ["/api/auth/session → /api/auth/me (Pfad-Unterschied)"]
  },
  bafa: {
    coverage: "90%",
    notes: "Generierung, Reports, Payments vorhanden",
    mapping_issues: [
      "/api/bafa/kontingent fehlt als eigenständiger Endpoint → aus /api/admin/stats ableiten",
      "/api/bafa/download/[id] → /api/reports/download/:token (Token statt ID)"
    ]
  },
  dashboard: {
    coverage: "60%",
    notes: "Reports CRUD vorhanden, Kunden/Vorlagen fehlen als dedizierte Endpoints",
    missing: ["Templates API (evtl. in bafa-report-generator)", "Kunden CRUD"]
  },
  foerdermittelCheck: {
    coverage: "100%",
    notes: "Komplett neuer Worker, noch nicht deployed",
    missing: ["Worker muss deployed werden: wrangler deploy"]
  }
};
