// app/api/session/route.ts
//
// Hilfs-Endpoint, der den vom Cloudflare-Worker
// foerdermittel-check-api ausgegebenen JWT in ein HttpOnly-Cookie
// packt. Damit ist das Token NICHT mehr per JS lesbar (kein
// XSS → Account-Takeover) und gleichzeitig kann die Next.js
// Middleware es signaturverifizieren.
//
// POST /api/session  { token: string }   → setzt fund24-token
// DELETE /api/session                    → löscht fund24-token

import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'fund24-token'
const MAX_AGE = 60 * 60 * 24 // 24h, sollte mit JWT-exp übereinstimmen

export async function POST(request: NextRequest) {
  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const token = body.token
  if (typeof token !== 'string' || token.length < 10) {
    return NextResponse.json({ error: 'token missing' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
