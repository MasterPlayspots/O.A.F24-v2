// Admin Routes - Audit Logs, Users, Stats
import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'
import { AUDIT_EVENTS } from '../types'
import { requireAuth, requireRole } from '../middleware/auth'
import { queryAuditLogs, cleanupAuditLogs, writeAuditLog } from '../services/audit'

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()
admin.use('/*', requireAuth, requireRole('admin'))

// GET /audit-logs
admin.get('/audit-logs', async (c) => {
  const q = c.req.query()
  const page = q.page ? Math.max(1, Math.min(parseInt(q.page) || 1, 10000)) : undefined
  const limit = q.limit ? Math.max(1, Math.min(parseInt(q.limit) || 50, 100)) : undefined
  const result = await queryAuditLogs(c.env.DB, { userId: q.userId, eventType: q.eventType, from: q.from, to: q.to, page, limit })
  return c.json({ success: true, ...result })
})

// POST /audit-logs/cleanup
admin.post('/audit-logs/cleanup', async (c) => {
  const deleted = await cleanupAuditLogs(c.env.DB)
  return c.json({ success: true, deletedCount: deleted })
})

// GET /users
admin.get('/users', async (c) => {
  const page = Math.max(1, Math.min(parseInt(c.req.query('page') || '1') || 1, 10000)); const limit = Math.max(1, Math.min(parseInt(c.req.query('limit') || '50') || 50, 100)); const offset = (page - 1) * limit
  const count = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first<{ total: number }>()
  const users = await c.env.DB.prepare('SELECT id, email, first_name, last_name, role, company, bafa_status, kontingent_total, kontingent_used, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all()
  return c.json({ success: true, users: users.results, total: count?.total || 0, page, limit })
})

// PATCH /users/:id/role
admin.patch('/users/:id/role', async (c) => {
  const { role } = await c.req.json()
  if (!['user', 'admin'].includes(role)) return c.json({ success: false, error: 'Ungültige Rolle' }, 400)
  await c.env.DB.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").bind(role, c.req.param('id')).run()
  await writeAuditLog(c.env.DB, { userId: c.get('user').id, eventType: AUDIT_EVENTS.ROLE_CHANGE, detail: `${c.req.param('id')} → ${role}` })
  return c.json({ success: true })
})

// GET /stats
admin.get('/stats', async (c) => {
  const [dbResults, bafaResults] = await Promise.all([
    c.env.DB.batch([
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN email_verified=1 THEN 1 ELSE 0 END) as verified FROM users"),
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='generiert' THEN 1 ELSE 0 END) as generated, SUM(CASE WHEN is_unlocked=1 THEN 1 ELSE 0 END) as unlocked FROM reports"),
      c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) as revenue FROM payments"),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM gutscheine WHERE is_active = 1'),
    ]),
    c.env.BAFA_DB.batch([
      c.env.BAFA_DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='generiert' THEN 1 ELSE 0 END) as generated, SUM(CASE WHEN status='bezahlt' THEN 1 ELSE 0 END) as paid FROM antraege"),
      c.env.BAFA_DB.prepare("SELECT COUNT(*) as total FROM antrag_bausteine"),
    ]),
  ])
  return c.json({
    success: true,
    stats: {
      users: dbResults[0]?.results?.[0] ?? null,
      reports: dbResults[1]?.results?.[0] ?? null,
      antraege: bafaResults[0]?.results?.[0] ?? null,
      bausteine: bafaResults[1]?.results?.[0] ?? null,
      payments: dbResults[2]?.results?.[0] ?? null,
      activePromos: (dbResults[3]?.results?.[0] as Record<string, unknown>)?.total ?? 0,
    },
  })
})

export { admin }
