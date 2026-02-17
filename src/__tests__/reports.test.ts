// Reports Routes Tests - CRUD, Preview, Download
import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import { setupTestDb, createTestUser, createTestToken } from './test-utils'

beforeAll(async () => {
  await setupTestDb(env.DB)
})

describe('Reports CRUD', () => {
  describe('POST /api/reports', () => {
    it('creates a new draft report', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-create@example.com' })
      const token = await createTestToken(userId, 'report-create@example.com')

      const res = await SELF.fetch('https://api.test/api/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.reportId).toBeTruthy()
    })

    it('rejects when contingent is exhausted', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-noquota@example.com' })
      await env.DB.prepare('UPDATE users SET kontingent_total = 0, kontingent_used = 0 WHERE id = ?').bind(userId).run()
      const token = await createTestToken(userId, 'report-noquota@example.com')

      const res = await SELF.fetch('https://api.test/api/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(403)
      const body = await res.json() as any
      expect(body.needsUpgrade).toBe(true)
    })

    it('requires authentication', async () => {
      const res = await SELF.fetch('https://api.test/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/reports', () => {
    it('lists user reports', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-list@example.com' })
      const token = await createTestToken(userId, 'report-list@example.com')

      // Create a report
      const reportId = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status, company_name, branche) VALUES (?, ?, 'entwurf', 'TestCo', 'handwerk')")
        .bind(reportId, userId).run()

      const res = await SELF.fetch('https://api.test/api/reports', {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.reports.length).toBeGreaterThanOrEqual(1)
    })

    it('only returns own reports', async () => {
      const user1 = await createTestUser(env.DB, { email: 'report-owner1@example.com' })
      const user2 = await createTestUser(env.DB, { email: 'report-owner2@example.com' })

      const r1 = crypto.randomUUID()
      const r2 = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(r1, user1).run()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(r2, user2).run()

      const token1 = await createTestToken(user1, 'report-owner1@example.com')
      const res = await SELF.fetch('https://api.test/api/reports', {
        headers: { 'Authorization': `Bearer ${token1}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      const ids = body.reports.map((r: any) => r.id)
      expect(ids).toContain(r1)
      expect(ids).not.toContain(r2)
    })
  })

  describe('GET /api/reports/:id', () => {
    it('returns a single report', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-single@example.com' })
      const reportId = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status, company_name) VALUES (?, ?, 'generiert', 'MyCo')")
        .bind(reportId, userId).run()
      const token = await createTestToken(userId, 'report-single@example.com')

      const res = await SELF.fetch(`https://api.test/api/reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
      })
      const body = await res.json() as any
      expect(res.status).toBe(200)
      expect(body.report.company_name).toBe('MyCo')
    })

    it('returns 404 for other users report', async () => {
      const user1 = await createTestUser(env.DB, { email: 'report-notmine@example.com' })
      const user2 = await createTestUser(env.DB, { email: 'report-other@example.com' })
      const reportId = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(reportId, user2).run()
      const token1 = await createTestToken(user1, 'report-notmine@example.com')

      const res = await SELF.fetch(`https://api.test/api/reports/${reportId}`, {
        headers: { 'Authorization': `Bearer ${token1}`, 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/reports/:id', () => {
    it('updates allowed fields', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-patch@example.com' })
      const reportId = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(reportId, userId).run()
      const token = await createTestToken(userId, 'report-patch@example.com')

      const res = await SELF.fetch(`https://api.test/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
        body: JSON.stringify({ company_name: 'Updated GmbH', branche: 'handel' }),
      })
      expect(res.status).toBe(200)

      const report = await env.DB.prepare('SELECT company_name, branche FROM reports WHERE id = ?').bind(reportId).first() as any
      expect(report.company_name).toBe('Updated GmbH')
      expect(report.branche).toBe('handel')
    })
  })

  describe('POST /api/reports/:id/finalize', () => {
    it('finalizes report and uses contingent', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-finalize@example.com' })
      const reportId = crypto.randomUUID()
      await env.DB.prepare("INSERT INTO reports (id, user_id, status) VALUES (?, ?, 'entwurf')").bind(reportId, userId).run()
      const token = await createTestToken(userId, 'report-finalize@example.com')

      const res = await SELF.fetch(`https://api.test/api/reports/${reportId}/finalize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      })
      expect(res.status).toBe(200)

      const report = await env.DB.prepare('SELECT status FROM reports WHERE id = ?').bind(reportId).first() as any
      expect(report.status).toBe('finalisiert')

      const user = await env.DB.prepare('SELECT kontingent_used FROM users WHERE id = ?').bind(userId).first() as any
      expect(user.kontingent_used).toBe(1)
    })
  })

  describe('GET /api/reports/download/:token', () => {
    it('downloads unlocked report with valid token', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-download@example.com' })
      const reportId = crypto.randomUUID()
      const dlToken = crypto.randomUUID()
      const validUntil = new Date(Date.now() + 86400_000).toISOString()

      await env.DB.prepare("INSERT INTO reports (id, user_id, status, company_name, is_unlocked, ausgangslage_text) VALUES (?, ?, 'generiert', 'DownloadCo', 1, 'Test content')")
        .bind(reportId, userId).run()
      await env.DB.prepare('INSERT INTO download_tokens (id, report_id, token, valid_until) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), reportId, dlToken, validUntil).run()

      const res = await SELF.fetch(`https://api.test/api/reports/download/${dlToken}`)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/html')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
    })

    it('rejects expired download token', async () => {
      const userId = await createTestUser(env.DB, { email: 'report-expired-dl@example.com' })
      const reportId = crypto.randomUUID()
      const dlToken = crypto.randomUUID()
      const expiredAt = new Date(Date.now() - 86400_000).toISOString() // yesterday

      await env.DB.prepare("INSERT INTO reports (id, user_id, status, is_unlocked) VALUES (?, ?, 'generiert', 1)")
        .bind(reportId, userId).run()
      await env.DB.prepare('INSERT INTO download_tokens (id, report_id, token, valid_until) VALUES (?, ?, ?, ?)')
        .bind(crypto.randomUUID(), reportId, dlToken, expiredAt).run()

      const res = await SELF.fetch(`https://api.test/api/reports/download/${dlToken}`)
      expect(res.status).toBe(403)
    })

    it('rejects invalid download token', async () => {
      const res = await SELF.fetch('https://api.test/api/reports/download/nonexistent-token')
      expect(res.status).toBe(403)
    })
  })
})
