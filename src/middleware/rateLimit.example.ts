/**
 * Example Middleware - Rate Limiting
 */

import type { Context, Next } from "hono";
import type { Env } from "../index.new";

export async function rateLimit(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const key = `ratelimit:${ip}`;
  
  const count = await c.env.RATE_LIMIT.get(key);
  const current = count ? parseInt(count) : 0;
  
  if (current >= 100) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  
  await c.env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 60 });
  
  await next();
}
