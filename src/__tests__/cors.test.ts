// CORS & Security Headers Tests
import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import { setupTestDb } from './test-utils'

beforeAll(async () => {
  await setupTestDb(env.DB)
})

describe('Security Headers', () => {
  it('includes security headers on all responses', async () => {
    const res = await SELF.fetch('https://api.test/')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000')
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'")
    expect(res.headers.get('Permissions-Policy')).toContain('camera=()')
  })
})

describe('CORS', () => {
  it('allows requests from zfbf.info', async () => {
    const res = await SELF.fetch('https://api.test/', {
      headers: { 'Origin': 'https://zfbf.info' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zfbf.info')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })

  it('allows requests from localhost:3000', async () => {
    const res = await SELF.fetch('https://api.test/', {
      headers: { 'Origin': 'http://localhost:3000' },
    })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })

  it('rejects requests from disallowed origins on /api/* routes', async () => {
    const res = await SELF.fetch('https://api.test/api/auth/me', {
      headers: { 'Origin': 'https://evil.com' },
    })
    expect(res.status).toBe(403)
    const body = await res.json() as any
    expect(body.success).toBe(false)
    expect(body.error).toBe('Forbidden')
  })

  it('handles preflight OPTIONS requests', async () => {
    const res = await SELF.fetch('https://api.test/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://zfbf.info',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    })
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
