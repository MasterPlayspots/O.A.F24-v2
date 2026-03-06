// Authentication & Authorization Middleware
import { jwtVerify } from 'jose'
import { getCookie } from 'hono/cookie'
import type { MiddlewareHandler } from 'hono'
import type { Bindings, Variables, JwtPayload } from '../types'

export const requireAuth: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : getCookie(c, 'access_token')
  if (!token) {
    return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const jwt = payload as unknown as JwtPayload

    const user = await c.env.DB.prepare(
      'SELECT id, email, role, first_name, last_name FROM users WHERE id = ?'
    ).bind(jwt.userId).first<{ id: string; email: string; role: string; first_name: string; last_name: string }>()

    if (!user) {
      return c.json({ success: false, error: 'Benutzer nicht gefunden' }, 401)
    }

    c.set('user', { id: user.id, email: user.email, role: user.role || 'user', firstName: user.first_name, lastName: user.last_name })
    c.set('jwtPayload', jwt)
    await next()
  } catch {
    return c.json({ success: false, error: 'Ungültiger Token' }, 401)
  }
}

export function requireRole(role: string): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
    if (user.role !== role) return c.json({ success: false, error: 'Keine Berechtigung' }, 403)
    await next()
  }
}
