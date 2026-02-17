// Download Token Service - Creates time-limited download tokens for reports

export async function createDownloadToken(db: D1Database, reportId: string): Promise<{ token: string; validUntil: string }> {
  const token = crypto.randomUUID()
  const validUntil = new Date(Date.now() + 24 * 3600_000).toISOString()
  await db.prepare('INSERT INTO download_tokens (id, report_id, token, valid_until) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), reportId, token, validUntil).run()
  return { token, validUntil }
}
