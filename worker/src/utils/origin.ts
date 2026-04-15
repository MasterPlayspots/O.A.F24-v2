// Derive the client-facing frontend origin for email links + redirects.
// Worker serves both zfbf.info and fund24.io — a single env.FRONTEND_URL
// is wrong for one of them. Prefer the request's Origin/Referer, falling
// back to env, then to fund24.io.
import type { Context } from "hono";

const ALLOWED_HOSTS = new Set([
  "zfbf.info",
  "www.zfbf.info",
  "fund24.info",
  "www.fund24.info",
  "fund24.io",
  "www.fund24.io",
]);

export function getClientOrigin(c: Context): string {
  const candidates = [c.req.header("origin"), c.req.header("referer")];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (ALLOWED_HOSTS.has(url.host)) {
        return `${url.protocol}//${url.host}`;
      }
    } catch {
      // ignore parse errors, fall through
    }
  }
  const envUrl = (c.env as { FRONTEND_URL?: string } | undefined)?.FRONTEND_URL;
  return envUrl || "https://fund24.io";
}
