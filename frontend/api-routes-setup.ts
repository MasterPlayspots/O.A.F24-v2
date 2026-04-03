/**
 * ZFBF.info — Next.js API Route Setup Guide
 *
 * Dieses File zeigt, wie die API Routes in der Next.js App
 * konfiguriert werden müssen, um die Worker korrekt anzusprechen.
 *
 * OPTION A: Catch-All Route (empfohlen für schnellen Start)
 * OPTION B: Individuelle Route Handler (empfohlen für Produktion)
 */

// ════════════════════════════════════════════════════════════
// OPTION A: Catch-All Route
// Datei: app/api/[...slug]/route.ts
// Leitet ALLE /api/* Requests automatisch an den Worker weiter
// ════════════════════════════════════════════════════════════

/*
// app/api/[...slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkerUrl } from "@/lib/api-config";

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Lokale Routes (kein Proxy nötig)
  if (path === "/api/auth/dev-session" || path === "/api/debug/worker-url") {
    return NextResponse.next();
  }

  const { url: workerBase, workerPath } = resolveWorkerUrl(path);
  const targetUrl = `${workerBase}${workerPath}${url.search}`;

  // Headers aufbauen
  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("content-type") || "application/json");

  // Auth weiterleiten
  const session = req.cookies.get("zfbf_session")?.value;
  const auth = req.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  else if (session) headers.set("Authorization", `Bearer ${session}`);

  // Body weiterleiten
  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer() as unknown as BodyInit;
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseBody = await res.arrayBuffer();
    const responseHeaders = new Headers();
    responseHeaders.set("content-type", res.headers.get("content-type") || "application/json");

    // Session-Cookie vom Worker übernehmen
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) responseHeaders.set("set-cookie", setCookie);

    return new NextResponse(responseBody, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Worker nicht erreichbar", detail: String(err) },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
*/

// ════════════════════════════════════════════════════════════
// OPTION B: Individuelle Routes (mehr Kontrolle)
// ════════════════════════════════════════════════════════════

/*
// app/api/auth/login/route.ts
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const POST = createProxyHandler("/api/auth/login");

// app/api/auth/register/route.ts
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const POST = createProxyHandler("/api/auth/register");

// app/api/auth/session/route.ts
// WICHTIG: Mappt auf /api/auth/me im Worker
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const GET = createProxyHandler("/api/auth/session");

// app/api/bafa/generate/route.ts
// WICHTIG: Mappt auf /api/reports/generate im Worker
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const POST = createProxyHandler("/api/bafa/generate");

// app/api/bafa/reports/route.ts
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const GET = createProxyHandler("/api/bafa/reports");

// app/api/bafa/checkout/route.ts
// WICHTIG: Mappt auf /api/payments/stripe/create-session
import { createProxyHandler } from "@/lib/proxy-to-worker";
export const POST = createProxyHandler("/api/bafa/checkout");

// app/api/foerderprogramme/route.ts
// Direkt an fund24-api
import { NextRequest, NextResponse } from "next/server";
import { FUND24_API_URL } from "@/lib/api-config";
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const res = await fetch(`${FUND24_API_URL}/api/programmes${url.search}`);
  const data = await res.json();
  return NextResponse.json(data);
}

// app/api/checks/route.ts
// An foerdermittel-check-api Worker
import { NextRequest, NextResponse } from "next/server";
import { CHECK_API_URL } from "@/lib/api-config";
export async function POST(req: NextRequest) {
  const body = await req.text();
  const session = req.cookies.get("zfbf_session")?.value;
  const res = await fetch(`${CHECK_API_URL}/api/checks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
    },
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
*/

// ════════════════════════════════════════════════════════════
// ENV VARIABLEN (.env.local)
// ════════════════════════════════════════════════════════════

/*
# Worker URLs
NEXT_PUBLIC_WORKER_URL=https://bafa-creator-ai-worker.<subdomain>.workers.dev
NEXT_PUBLIC_CHECK_API_URL=https://foerdermittel-check-api.<subdomain>.workers.dev
NEXT_PUBLIC_FUND24_API_URL=https://fund24-api.<subdomain>.workers.dev

# Oder mit Custom Domain:
# NEXT_PUBLIC_WORKER_URL=https://api.zfbf.info
# NEXT_PUBLIC_CHECK_API_URL=https://check.zfbf.info
# NEXT_PUBLIC_FUND24_API_URL=https://fund24.zfbf.info
*/

// ════════════════════════════════════════════════════════════
// MIGRATION VON MOCK-DATEN
// ════════════════════════════════════════════════════════════

/*
SCHRITT-FÜR-SCHRITT:

1. FÖRDERPROGRAMME (lib/foerderprogramme-data.ts → api.foerderprogramme.list())
   - Aktuell: 12 hardcoded Programme
   - Ziel: 2.467 Programme aus fund24-api
   - Änderungen:
     * /foerdermittel/programme/page.tsx: statt import FOERDERPROGRAMME → useEffect + api.foerderprogramme.list()
     * /dashboard/foerdermittel/page.tsx: gleiche Änderung
     * /antrag/[programmId]/page.tsx: api.foerderprogramme.get(id)

2. BERATER (lib/berater-data.ts → api.berater.list())
   - Aktuell: 6 statische Profile
   - Ziel: Echte Berater aus bafa_antraege.berater_profiles
   - Änderungen:
     * /netzwerk/page.tsx: statt MOCK_BERATER → useEffect + api.berater.list()
     * /netzwerk/[id]/page.tsx: api.berater.get(id)
     * /dashboard/netzwerk/*: gleiche Änderung

3. AUTH (localStorage → api.auth.session())
   - Aktuell: AuthContext liest aus localStorage
   - Ziel: Session gegen Worker validieren
   - Änderungen:
     * lib/context/auth-context.tsx: useEffect → api.auth.session(), bei Fehler → logout

4. DASHBOARD STATS (hardcoded → api.dashboard.stats())
   - Aktuell: Zahlen in JSX hardcoded
   - Ziel: Echte Aggregation vom Worker
   - Änderungen:
     * /dashboard/page.tsx: useEffect + fetch stats

5. FORUM (inline mock → api.forum.list())
   - Aktuell: Threads/Replies hardcoded
   - Ziel: Forum-CRUD über bafa-report-generator Worker
   - Änderungen:
     * /netzwerk/forum/page.tsx + /dashboard/forum/*
*/

export {};
