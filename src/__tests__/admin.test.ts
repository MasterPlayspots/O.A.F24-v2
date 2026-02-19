// Admin Routes Tests - Role enforcement, users, stats
import { describe, it, expect, beforeAll } from 'vitest'
import { env, SELF } from 'cloudflare:test'
import { setupTestDb, setupBafaDb, createTestUser, createTestToken } from './test-utils'

beforeAll(async () => {
  await setupTestDb(env.DB)
  await setupBafaDb(env.BAFA_DB)
})

describe('Admin Routes', () => {
  it('rejects non-admin access to /api/admin/users', async () => {
    const userId = await createTestUser(env.DB, { email: 'regular-admin-test@example.com', role: 'user' })
    const token = await createTestToken(userId, 'regular-admin-test@example.com', 'user')

    const res = await SELF.fetch('https://api.test/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
    })
    expect(res.status).toBe(403)
    const body = await res.json() as any
    expect(body.error).toContain('Berechtigung')
  })

  it('rejects unauthenticated access to /api/admin/users', async () => {
    const res = await SELF.fetch('https://api.test/api/admin/users', {
      headers: { 'Origin': 'https://zfbf.info' },
    })
    expect(res.status).toBe(401)
  })

  it('allows admin to list users', async () => {
    const adminId = await createTestUser(env.DB, { email: 'admin-list@example.com', role: 'admin' })
    const token = await createTestToken(adminId, 'admin-list@example.com', 'admin')

    const res = await SELF.fetch('https://api.test/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(Array.isArray(body.users)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  it('allows admin to get stats', async () => {
    const adminId = await createTestUser(env.DB, { email: 'admin-stats@example.com', role: 'admin' })
    const token = await createTestToken(adminId, 'admin-stats@example.com', 'admin')

    const res = await SELF.fetch('https://api.test/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(body.stats).toBeTruthy()
    expect(body.stats.users).toBeTruthy()
  })

  it('allows admin to change user role', async () => {
    const adminId = await createTestUser(env.DB, { email: 'admin-role@example.com', role: 'admin' })
    const token = await createTestToken(adminId, 'admin-role@example.com', 'admin')
    const targetId = await createTestUser(env.DB, { email: 'target-role@example.com', role: 'user' })

    const res = await SELF.fetch(`https://api.test/api/admin/users/${targetId}/role`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      body: JSON.stringify({ role: 'admin' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)

    // Verify the role was updated
    const user = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(targetId).first() as any
    expect(user.role).toBe('admin')
  })

  it('rejects invalid role in role change', async () => {
    const adminId = await createTestUser(env.DB, { email: 'admin-badrole@example.com', role: 'admin' })
    const token = await createTestToken(adminId, 'admin-badrole@example.com', 'admin')
    const targetId = await createTestUser(env.DB, { email: 'target-badrole@example.com' })

    const res = await SELF.fetch(`https://api.test/api/admin/users/${targetId}/role`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Origin': 'https://zfbf.info' },
      body: JSON.stringify({ role: 'superadmin' }),
    })
    expect(res.status).toBe(400)
  })

  it('allows admin to query audit logs', async () => {
    const adminId = await createTestUser(env.DB, { email: 'admin-audit@example.com', role: 'admin' })
    const token = await createTestToken(adminId, 'admin-audit@example.com', 'admin')

    const res = await SELF.fetch('https://api.test/api/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${token}`, 'Origin': 'https://zfbf.info' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.success).toBe(true)
    expect(Array.isArray(body.logs)).toBe(true)
  })
})
