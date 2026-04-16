// Rate Limiting Middleware using KV
import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../types";

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyPrefix: string;
  failClosed?: boolean;
}

export function rateLimit(
  config: RateLimitConfig
): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
    const key = `rl:${config.keyPrefix}:${ip}`;
    try {
      const current = await c.env.RATE_LIMIT.get(key);
      const count = current ? parseInt(current, 10) : 0;
      if (count >= config.maxRequests) {
        c.header("Retry-After", config.windowSeconds.toString());
        return c.json(
          { success: false, error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
          429
        );
      }
      await c.env.RATE_LIMIT.put(key, (count + 1).toString(), {
        expirationTtl: config.windowSeconds,
      });
    } catch {
      // KV error: fail-closed returns 503, fail-open falls through to next()
      if (config.failClosed) {
        return c.json(
          {
            success: false,
            error: "Dienst vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.",
          },
          503
        );
      }
    }
    await next();
  };
}

export const loginRateLimit = rateLimit({ maxRequests: 5, windowSeconds: 300, keyPrefix: "login" });
export const registerRateLimit = rateLimit({
  maxRequests: 3,
  windowSeconds: 3600,
  keyPrefix: "register",
});
export const downloadRateLimit = rateLimit({
  maxRequests: 10,
  windowSeconds: 300,
  keyPrefix: "download",
});
export const generateRateLimit = rateLimit({
  maxRequests: 5,
  windowSeconds: 600,
  keyPrefix: "generate",
});
export const forgotPasswordRateLimit = rateLimit({
  maxRequests: 3,
  windowSeconds: 900,
  keyPrefix: "forgot-pw",
});

export const verifyEmailRateLimit = rateLimit({
  maxRequests: 5,
  windowSeconds: 300,
  keyPrefix: "verify-email",
});

// Refresh-token rotation: 5 per minute per IP. Stops a stolen refresh-token
// attacker from grinding out access tokens; legitimate clients need at most
// one refresh every ~15min.
export const refreshRateLimit = rateLimit({
  maxRequests: 5,
  windowSeconds: 60,
  keyPrefix: "refresh",
});

// Global rate limit: 120 requests per minute per IP for all API endpoints
export const globalRateLimit = rateLimit({
  maxRequests: 120,
  windowSeconds: 60,
  keyPrefix: "global",
});
