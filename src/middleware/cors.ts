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

function getAllowedOrigins(env?: string): string[] {
  if (env === 'production') return PRODUCTION_ORIGINS
  return [...PRODUCTION_ORIGINS, ...DEV_ORIGINS]
}

export const corsMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const allowed = getAllowedOrigins(c.env.ENVIRONMENT)
  const handler = cors({
    origin: (origin) => {
      if (!origin) return ''
      if (allowed.includes(origin)) return origin
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
  const allowed = getAllowedOrigins(c.env.ENVIRONMENT)
  if (!allowed.includes(origin)) {
    return c.json({ success: false, error: 'Forbidden' }, 403)
  }
  await next()
}
