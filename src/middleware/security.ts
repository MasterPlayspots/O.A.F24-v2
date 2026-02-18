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
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.stripe.com https://www.paypal.com; frame-src https://js.stripe.com https://www.paypal.com")
}

export const csrfProtection: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
    const origin = c.req.header('Origin')
    // Allow requests without Origin (same-origin form posts, server-to-server)
    if (origin) {
      const allowedOrigins = [
        'https://zfbf.info',
        'https://www.zfbf.info',
        'https://v0-bafa-creator-ai.vercel.app',
        'http://localhost:3000',
      ]
      const frontendUrl = c.env.FRONTEND_URL
      if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
        allowedOrigins.push(frontendUrl)
      }
      if (!allowedOrigins.includes(origin)) {
        return c.json({ success: false, error: 'CSRF validation failed' }, 403)
      }
    }
  }
  await next()
}
