// middleware.ts — Echte JWT-Verifikation für geschützte Routen.
//
// Vor dem Audit-Fix prüfte die Middleware nur die *Existenz* eines
// client-gesetzten Signal-Cookies (`fund24-auth=1`) — das war trivial
// umgehbar. Jetzt wird ein HttpOnly-Cookie `fund24-token` gelesen,
// per JWT-Signaturprüfung gegen JWT_SECRET (env-var) verifiziert,
// und für /admin zusätzlich die Rolle geprüft.
//
// JWT_SECRET muss in Vercel als Server-only Env-Var gesetzt sein
// (NICHT NEXT_PUBLIC_), damit es nicht zum Browser geleaked wird.
// Es muss DASSELBE Secret sein, mit dem der Cloudflare Worker
// foerdermittel-check-api die Tokens signiert.

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = new Set([
  '/', '/programme', '/berater', '/preise', '/aktuelles', '/support',
  '/foerder-schnellcheck', '/login', '/registrieren', '/verifizieren',
  '/passwort-vergessen', '/passwort-reset', '/datenschutz', '/impressum', '/agb',
])

const PROTECTED_PREFIXES = ['/foerdercheck', '/onboarding', '/dashboard', '/admin']
const ADMIN_PREFIX = '/admin'
const PUBLIC_PREFIXES = ['/programme/', '/berater/', '/aktuelles/', '/foerder-schnellcheck/']

interface JwtPayload {
  sub?: string
  role?: 'unternehmen' | 'berater' | 'admin'
  exp?: number
}

async function verifyToken(token: string): Promise<JwtPayload | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // Fail-closed: ohne Secret kann nichts geprüft werden → ablehnen.
    console.error('[fund24] middleware: JWT_SECRET nicht gesetzt')
    return null
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload as JwtPayload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Echtes JWT aus HttpOnly-Cookie:
  const token = request.cookies.get('fund24-token')?.value
  if (!token) return redirectToLogin(request)

  const payload = await verifyToken(token)
  if (!payload) return redirectToLogin(request)

  // Admin-Routen brauchen role=admin:
  if (pathname.startsWith(ADMIN_PREFIX) && payload.role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/unternehmen'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
