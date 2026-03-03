// Foerdermittel Routes Tests - Catalog, Profile, Matching, Cases
import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import { setupTestDb, setupBafaDb, setupFoerderDb, setupFundingTables, createTestUser, createTestToken } from './test-utils'

beforeAll(async () => {
  await setupTestDb(env.DB)
  await setupBafaDb(env.BAFA_DB)
  await setupFoerderDb(env.FOERDER_DB)
  await setupFundingTables(env.BAFA_DB)
})

describe('Foerdermittel Catalog', () => {
  describe('GET /api/foerdermittel/katalog', () => {
    it('returns paginated results', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog?limit=2', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.items.length).toBeLessThanOrEqual(2)
      expect(body.data.total).toBeGreaterThanOrEqual(3)
      expect(body.data.page).toBe(1)
      expect(body.data.totalPages).toBeGreaterThanOrEqual(1)
    })

    it('supports search query', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog?search=Digital', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.items.length).toBeGreaterThanOrEqual(1)
      expect(body.data.items[0].titel).toContain('Digital')
    })

    it('supports foerderart filter', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog?foerderart=Darlehen', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.items.every((i: any) => i.foerderart === 'Darlehen')).toBe(true)
    })
  })

  describe('GET /api/foerdermittel/katalog/:id', () => {
    it('returns single program', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog/1', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.titel).toBe('Digitalbonus Bayern')
      expect(body.data.volltext).toBeTruthy()
    })

    it('returns 404 for unknown id', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog/9999', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid id', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog/abc', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/foerdermittel/katalog/filters', () => {
    it('returns filter options', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/katalog/filters', {
        headers: { 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.foerderart).toContain('Zuschuss')
      expect(body.data.foerderart).toContain('Darlehen')
      expect(body.data.foerdergebiet).toContain('Bayern')
    })
  })
})

describe('Foerdermittel Profile', () => {
  describe('POST /api/foerdermittel/profile', () => {
    it('creates a business profile', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-profile@example.com' })
      const token = await createTestToken(userId, 'fm-profile@example.com')

      const res = await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({
          company_name: 'Test GmbH',
          branche: 'IT/Tech',
          standort: 'Bayern',
          rechtsform: 'GmbH',
          mitarbeiter_anzahl: 25,
          jahresumsatz: 500000,
          gruendungsjahr: 2018,
          beschreibung: 'Software-Entwicklung',
        }),
      })
      const body = await res.json() as any
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data.id).toBeTruthy()
    })

    it('requires authentication', async () => {
      const res = await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ company_name: 'No Auth GmbH' }),
      })
      expect(res.status).toBe(401)
    })

    it('validates company_name required', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-profile-val@example.com' })
      const token = await createTestToken(userId, 'fm-profile-val@example.com')

      const res = await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ branche: 'IT/Tech' }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/foerdermittel/profile', () => {
    it('returns existing profile', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-profile-get@example.com' })
      const token = await createTestToken(userId, 'fm-profile-get@example.com')

      // Create profile first
      await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ company_name: 'Get Test GmbH', standort: 'Berlin' }),
      })

      const res = await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.company_name).toBe('Get Test GmbH')
      expect(body.data.standort).toBe('Berlin')
    })

    it('returns null when no profile', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-no-profile@example.com' })
      const token = await createTestToken(userId, 'fm-no-profile@example.com')

      const res = await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data).toBeNull()
    })
  })
})

describe('Foerdermittel Cases', () => {
  describe('POST /api/foerdermittel/cases', () => {
    it('creates a case with funnel steps', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-case@example.com' })
      const token = await createTestToken(userId, 'fm-case@example.com')

      // Create profile first
      await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ company_name: 'Case Test GmbH' }),
      })

      // Create case for program 1
      const res = await SELF.fetch('https://api.test/api/foerdermittel/cases', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ programm_id: 1 }),
      })
      const body = await res.json() as any
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.data.caseId).toBeTruthy()

      // Verify steps were created
      const caseRes = await SELF.fetch(`https://api.test/api/foerdermittel/cases/${body.data.caseId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const caseBody = await caseRes.json() as any
      expect(caseBody.success).toBe(true)
      expect(caseBody.data.steps.length).toBeGreaterThan(0)
      expect(caseBody.data.phase).toBe('eligibility_check')
    })

    it('requires a profile', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-case-noprofile@example.com' })
      const token = await createTestToken(userId, 'fm-case-noprofile@example.com')

      const res = await SELF.fetch('https://api.test/api/foerdermittel/cases', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ programm_id: 1 }),
      })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/foerdermittel/cases', () => {
    it('lists user cases', async () => {
      const userId = await createTestUser(env.DB, { email: 'fm-case-list@example.com' })
      const token = await createTestToken(userId, 'fm-case-list@example.com')

      // Create profile + case
      await SELF.fetch('https://api.test/api/foerdermittel/profile', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ company_name: 'List Test GmbH' }),
      })
      await SELF.fetch('https://api.test/api/foerdermittel/cases', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ programm_id: 2 }),
      })

      const res = await SELF.fetch('https://api.test/api/foerdermittel/cases', {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(body.success).toBe(true)
      expect(body.data.cases.length).toBeGreaterThanOrEqual(1)
      expect(body.data.cases[0].steps_total).toBeGreaterThan(0)
    })
  })
})

describe('Foerdermittel Notifications', () => {
  it('returns empty notifications', async () => {
    const userId = await createTestUser(env.DB, { email: 'fm-notif@example.com' })
    const token = await createTestToken(userId, 'fm-notif@example.com')

    const res = await SELF.fetch('https://api.test/api/foerdermittel/notifications', {
      headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
    })
    const body = await res.json() as any
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.notifications).toEqual([])
    expect(body.data.unread_count).toBe(0)
  })
})
