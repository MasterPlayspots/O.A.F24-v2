// Rate Limiting Middleware using KV
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyPrefix: string
}

export function rateLimit(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const key = `rl:${config.keyPrefix}:${ip}`
    try {
      const current = await c.env.RATE_LIMIT.get(key)
      const count = current ? parseInt(current, 10) : 0
      if (count >= config.maxRequests) {
        c.header('Retry-After', config.windowSeconds.toString())
        return c.json({ success: false, error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.' }, 429)
      }
      await c.env.RATE_LIMIT.put(key, (count + 1).toString(), { expirationTtl: config.windowSeconds })
    } catch (err) {
      console.error(`[RateLimit] KV error for ${config.keyPrefix}:`, err)
      // fail open - allow request through if KV is unavailable
    }
    await next()
  }
}

export const loginRateLimit = rateLimit({ maxRequests: 5, windowSeconds: 300, keyPrefix: 'login' })
export const registerRateLimit = rateLimit({ maxRequests: 3, windowSeconds: 3600, keyPrefix: 'register' })
export const downloadRateLimit = rateLimit({ maxRequests: 10, windowSeconds: 300, keyPrefix: 'download' })
export const generateRateLimit = rateLimit({ maxRequests: 5, windowSeconds: 600, keyPrefix: 'generate' })
export const forgotPasswordRateLimit = rateLimit({ maxRequests: 3, windowSeconds: 900, keyPrefix: 'forgot-pw' })
