// CORS Middleware
import { cors } from 'hono/cors'
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables } from '../types'

const ALLOWED_ORIGINS = [
  'https://zfbf.info',
  'https://www.zfbf.info',
  'https://v0-bafa-creator-ai.vercel.app',
  'http://localhost:3000',
]

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return ''
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    return ''
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 3600,
  credentials: true,
})

export const strictCorsCheck: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const origin = c.req.header('Origin')
  if (!origin) { await next(); return }
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return c.json({ success: false, error: 'Forbidden' }, 403)
  }
  await next()
}
