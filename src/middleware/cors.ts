// CORS Middleware - Environment-conditional origin allowlist
import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'

const PRODUCTION_ORIGINS = [
  'https://zfbf.info',
  'https://www.zfbf.info',
]

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://v0-bafa-creator-ai.vercel.app',
]

// Vercel preview deployments use pattern: https://<project>-<hash>-<team>.vercel.app
const VERCEL_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/
// v0.dev preview domains
const V0_PREVIEW_PATTERN = /^https:\/\/[a-z0-9-]+\.v0\.dev$/

function isAllowedOrigin(origin: string, env?: string): boolean {
  if (PRODUCTION_ORIGINS.includes(origin)) return true
  if (env !== 'production') {
    if (DEV_ORIGINS.includes(origin)) return true
  }
  // Allow Vercel preview deployments for this project
  if (VERCEL_PREVIEW_PATTERN.test(origin) && origin.includes('bafa')) return true
  // Allow any v0.dev preview domain
  if (V0_PREVIEW_PATTERN.test(origin)) return true
  if (origin === 'https://v0.dev') return true
  // Allow any *.vercel.app or *.vercel.sh for dev/preview
  if (origin.endsWith('.vercel.app') || origin.endsWith('.vercel.sh')) return true
  return false
}

export const corsMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const handler = cors({
    origin: (origin) => {
      if (!origin) return ''
      if (isAllowedOrigin(origin, c.env.ENVIRONMENT)) return origin
      return ''
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 3600,
    credentials: true,
  })
  return handler(c, next)
}

export const strictCorsCheck: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const origin = c.req.header('Origin')
  if (!origin) { await next(); return }
  if (!isAllowedOrigin(origin, c.env.ENVIRONMENT)) {
    return c.json({ success: false, error: 'Forbidden' }, 403)
  }
  await next()
}
