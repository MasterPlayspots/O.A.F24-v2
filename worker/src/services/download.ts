// Download Token Service - Creates time-limited download tokens for antraege
// Uses bafa_antraege D1 database with new column names

export async function createDownloadToken(bafaDb: D1Database, antragId: string): Promise<{ token: string; validUntil: string }> {
  const token = crypto.randomUUID()
  const validUntil = new Date(Date.now() + 24 * 3600_000).toISOString()
  await bafaDb.prepare(
    "INSERT INTO download_tokens (id, antrag_id, token, gueltig_bis, downloads, max_downloads, erstellt_am) VALUES (?, ?, ?, ?, 0, 3, datetime('now'))"
  ).bind(crypto.randomUUID(), antragId, token, validUntil).run()
  return { token, validUntil }
}
