/**
 * ZFBF.info — Verbesserter Worker Proxy
 *
 * Ersetzt lib/proxy-to-worker.ts im Next.js-Projekt.
 * Kernfunktion: Route-Mapping + Auth-Forwarding + Error-Handling
 *
 * Änderungen gegenüber Original:
 * 1. Nutzt ROUTE_MAP für korrekte Pfad-Zuordnung
 * 2. Besseres Error-Handling mit Retry-Logik
 * 3. Session-Token wird automatisch weitergeleitet
 * 4. TypeScript-typisiert
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkerUrl } from "./api-config";

interface ProxyOptions {
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Retry on 5xx errors (default: 1) */
  retries?: number;
  /** Additional headers to forward */
  extraHeaders?: Record<string, string>;
}

export async function proxyToWorker(
  req: NextRequest,
  frontendPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const { timeout = 30000, retries = 1, extraHeaders = {} } = options;

  // Route-Mapping: Frontend-Pfad → Worker-Pfad
  const { url: workerBase, workerPath } = resolveWorkerUrl(frontendPath);
  const targetUrl = `${workerBase}${workerPath}`;

  // Headers aufbauen
  const headers = new Headers();
  headers.set("Content-Type", req.headers.get("content-type") || "application/json");

  // Auth-Token weiterleiten (Cookie oder Authorization Header)
  const sessionCookie = req.cookies.get("zfbf_session")?.value;
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    headers.set("Authorization", authHeader);
  } else if (sessionCookie) {
    headers.set("Authorization", `Bearer ${sessionCookie}`);
  }

  // Extra Headers
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  // Request-Body
  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text();
    } catch {
      // No body
    }
  }

  // Retry-Logik
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Bei 5xx und noch Retries übrig → nochmal
      if (response.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      // Response durchreichen
      const responseBody = await response.text();
      const responseHeaders = new Headers();

      // Wichtige Headers vom Worker übernehmen
      const forwardHeaders = ["content-type", "x-request-id", "x-ratelimit-remaining"];
      for (const h of forwardHeaders) {
        const val = response.headers.get(h);
        if (val) responseHeaders.set(h, val);
      }

      // Session-Cookie aus Worker-Response setzen
      const setCookie = response.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders.set("set-cookie", setCookie);
      }

      return new NextResponse(responseBody, {
        status: response.status,
        headers: responseHeaders,
      });

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // Alle Versuche fehlgeschlagen
  console.error(`[Proxy] Failed after ${retries + 1} attempts:`, lastError?.message);
  return NextResponse.json(
    {
      error: "Worker nicht erreichbar",
      detail: lastError?.message || "Timeout oder Netzwerkfehler",
      path: frontendPath,
      target: targetUrl,
    },
    { status: 502 }
  );
}

/**
 * Erstellt einen Next.js API Route Handler der automatisch an den Worker proxied.
 *
 * Nutzung in app/api/auth/login/route.ts:
 * ```
 * import { createProxyHandler } from "@/lib/proxy-to-worker";
 * export const POST = createProxyHandler("/api/auth/login");
 * ```
 */
export function createProxyHandler(frontendPath: string, options?: ProxyOptions) {
  return async (req: NextRequest) => proxyToWorker(req, frontendPath, options);
}

/**
 * Catch-all Proxy für dynamische Routes.
 *
 * Nutzung in app/api/[...slug]/route.ts:
 * ```
 * import { createCatchAllProxy } from "@/lib/proxy-to-worker";
 * const handler = createCatchAllProxy();
 * export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
 * ```
 */
export function createCatchAllProxy(options?: ProxyOptions) {
  return async (req: NextRequest) => {
    const url = new URL(req.url);
    return proxyToWorker(req, url.pathname, options);
  };
}
