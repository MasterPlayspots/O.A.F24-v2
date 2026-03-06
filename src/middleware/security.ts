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
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
}

export const csrfProtection: MiddlewareHandler = async (c, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    return next()
  }
  const origin = c.req.header('Origin')
  const host = c.req.header('Host')
  if (origin) {
    const originHost = new URL(origin).hostname
    const allowedHosts = ['zfbf.info', 'www.zfbf.info', 'localhost']
    const isVercelPreview = originHost.endsWith('.vercel.app')
    const isDevelopment = originHost === 'localhost' || originHost === '127.0.0.1'

    const isAllowed = allowedHosts.includes(originHost) || isVercelPreview || (isDevelopment && process.env.ENVIRONMENT !== 'production')

    if (!isAllowed) {
      return c.json({ error: 'CSRF validation failed' }, 403)
    }
  }
  return next()
}
