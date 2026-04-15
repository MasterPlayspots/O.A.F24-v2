// CORS Middleware - Environment-conditional origin allowlist
import { cors } from "hono/cors";
import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../types";

const PRODUCTION_ORIGINS = [
  "https://zfbf.info",
  "https://www.zfbf.info",
  "https://fund24.info",
  "https://www.fund24.info",
  "https://fund24.io",
  "https://www.fund24.io",
];

const DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
];

// Vercel preview deployments use pattern: https://<project>-<hash>-<team>.vercel.app
const VERCEL_PREVIEW_PATTERN =
  /^https:\/\/fund24-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/;
// v0.dev preview domains (only needed in non-prod envs)
const V0_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.v0\.dev$/;

function isAllowedOrigin(origin: string, env?: string): boolean {
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  // Everything below is non-prod only.
  if (env === "production") return false;
  if (DEV_ORIGINS.includes(origin)) return true;
  if (VERCEL_PREVIEW_PATTERN.test(origin)) return true;
  if (V0_PREVIEW_PATTERN.test(origin)) return true;
  if (origin === "https://v0.dev") return true;
  return false;
}

export const corsMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const handler = cors({
    origin: (origin) => {
      if (!origin) return "";
      if (isAllowedOrigin(origin, c.env.ENVIRONMENT)) return origin;
      return "";
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 3600,
    credentials: true,
  });
  return handler(c, next);
};

export const strictCorsCheck: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const origin = c.req.header("Origin");
  if (!origin) {
    await next();
    return;
  }
  // Same-origin requests (Origin host === request Host) are always allowed.
  // CF Workers inject an Origin header on self-zone fetches, which would
  // otherwise 403 our own cron/monitoring jobs (OA-CP).
  try {
    const originHost = new URL(origin).host;
    const reqHost = c.req.header("Host");
    if (reqHost && originHost === reqHost) {
      await next();
      return;
    }
  } catch {
    // fall through to allowlist check
  }
  if (!isAllowedOrigin(origin, c.env.ENVIRONMENT)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  await next();
};
