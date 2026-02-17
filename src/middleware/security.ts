// Security Headers Middleware
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'

export const securityHeaders: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}
