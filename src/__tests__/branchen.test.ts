// Branchen Routes Tests - Industry listing with KV cache
import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import { setupTestDb } from './test-utils'

beforeAll(async () => {
  await setupTestDb(env.DB)
})

describe('GET /api/branchen', () => {
  it('returns all 10 industries', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen')
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.branchen).toHaveLength(10)
  })

  it('returns expected industry IDs', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen')
    const body = await res.json() as any
    const ids = body.branchen.map((b: any) => b.id)
    expect(ids).toContain('handwerk')
    expect(ids).toContain('handel')
    expect(ids).toContain('gastronomie')
    expect(ids).toContain('it-software')
    expect(ids).toContain('produktion')
    expect(ids).toContain('dienstleistung')
    expect(ids).toContain('gesundheit')
    expect(ids).toContain('bildung')
    expect(ids).toContain('bau')
    expect(ids).toContain('sonstige')
  })

  it('returns cached response on second call', async () => {
    // First call populates cache
    await SELF.fetch('https://api.test/api/branchen')
    // Second call should hit cache
    const res = await SELF.fetch('https://api.test/api/branchen')
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.cached).toBe(true)
  })

  it('includes herausforderungen and beratungsfelder', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen')
    const body = await res.json() as any
    const handwerk = body.branchen.find((b: any) => b.id === 'handwerk')
    expect(handwerk.herausforderungen).toBeTruthy()
    expect(handwerk.herausforderungen.length).toBeGreaterThan(0)
    expect(handwerk.beratungsfelder).toBeTruthy()
    expect(handwerk.beratungsfelder.length).toBeGreaterThan(0)
  })
})

describe('GET /api/branchen/:id', () => {
  it('returns a single industry by ID', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen/handwerk')
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.branche.id).toBe('handwerk')
    expect(body.branche.name).toBe('Handwerk')
  })

  it('returns 404 for unknown industry', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen/unknown')
    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.success).toBe(false)
  })

  it('includes KPIs for IT & Software', async () => {
    const res = await SELF.fetch('https://api.test/api/branchen/it-software')
    const body = await res.json() as any
    expect(body.branche.kpis).toBeTruthy()
    expect(body.branche.kpis.length).toBeGreaterThan(0)
    expect(body.branche.unterbranchen).toBeTruthy()
  })
})
