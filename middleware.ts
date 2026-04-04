// middleware.ts (Root-Verzeichnis)
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/', '/programme', '/berater', '/preise', '/aktuelles', '/support',
  '/foerder-schnellcheck', '/login', '/registrieren', '/verifizieren',
  '/passwort-vergessen', '/passwort-reset', '/datenschutz', '/impressum', '/agb',
])

const PROTECTED_PREFIXES = ['/foerdercheck', '/onboarding', '/dashboard', '/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Statische Assets + API-Routes überspringen:
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // Öffentliche Pfade:
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/programme/') ||
      pathname.startsWith('/berater/') || pathname.startsWith('/aktuelles/') ||
      pathname.startsWith('/foerder-schnellcheck/')) {
    return NextResponse.next()
  }

  // Geschützte Pfade prüfen:
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  // Signal-Cookie lesen:
  const authCookie = request.cookies.get('fund24-auth')
  if (!authCookie?.value) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
