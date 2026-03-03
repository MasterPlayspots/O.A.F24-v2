// Audit Logging Service

export interface AuditEntry {
  userId?: string | null
  eventType: string
  detail?: string | null
  ip?: string | null
  userAgent?: string | null
}

export async function writeAuditLog(db: D1Database, entry: AuditEntry): Promise<void> {
  try {
    await db.prepare(
      'INSERT INTO audit_logs (id, user_id, event_type, detail, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), entry.userId || null, entry.eventType, entry.detail || null, entry.ip || null, entry.userAgent || null).run()
  } catch {
    // Audit write failure is non-critical, intentionally swallowed
  }
}

export async function queryAuditLogs(db: D1Database, opts: {
  userId?: string; eventType?: string; from?: string; to?: string; page?: number; limit?: number
}) {
  const limit = Math.min(opts.limit || 50, 100)
  const page = Math.max(opts.page || 1, 1)
  const offset = (page - 1) * limit
  const conds: string[] = []
  const params: unknown[] = []

  if (opts.userId) { conds.push('user_id = ?'); params.push(opts.userId) }
  if (opts.eventType) { conds.push('event_type = ?'); params.push(opts.eventType) }
  if (opts.from) { conds.push('created_at >= ?'); params.push(opts.from) }
  if (opts.to) { conds.push('created_at <= ?'); params.push(opts.to) }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM audit_logs ${where}`).bind(...params).first<{ total: number }>()
  const logs = await db.prepare(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all()

  return { logs: logs.results, total: countResult?.total || 0, page, limit }
}

export async function cleanupAuditLogs(db: D1Database): Promise<number> {
  const r = await db.prepare("DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days')").run()
  return r.meta.changes || 0
}
