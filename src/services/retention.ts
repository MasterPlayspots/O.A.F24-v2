// Data Retention Service - GDPR cleanup of expired/soft-deleted data
// Uses DB (zfbf-db) for users/refresh_tokens, BAFA_DB (bafa_antraege) for download_tokens/antraege

export async function cleanupExpiredData(db: D1Database, bafaDb: D1Database): Promise<{ deletedUsers: number; deletedTokens: number; deletedDrafts: number }> {
  const results = { deletedUsers: 0, deletedTokens: 0, deletedDrafts: 0 }

  // Delete soft-deleted users after 30 days (zfbf-db)
  const userCleanup = await db.prepare(
    "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-30 days')"
  ).run()
  results.deletedUsers = userCleanup.meta.changes || 0

  // Delete expired download tokens from BAFA_DB (older than 24 hours past expiry)
  const tokenCleanup = await bafaDb.prepare(
    "DELETE FROM download_tokens WHERE gueltig_bis < datetime('now', '-1 day')"
  ).run()
  results.deletedTokens = tokenCleanup.meta.changes || 0

  // Delete abandoned vorschau antraege after 90 days (BAFA_DB)
  const draftCleanup = await bafaDb.prepare(
    "DELETE FROM antraege WHERE status = 'vorschau' AND aktualisiert_am < datetime('now', '-90 days')"
  ).run()
  results.deletedDrafts = draftCleanup.meta.changes || 0

  // Also clean up draft reports in zfbf-db
  await db.prepare(
    "DELETE FROM reports WHERE status = 'entwurf' AND updated_at < datetime('now', '-90 days')"
  ).run()

  // Cleanup revoked refresh tokens older than 30 days (zfbf-db)
  await db.prepare(
    "DELETE FROM refresh_tokens WHERE (revoked = 1 OR expires_at < datetime('now')) AND created_at < datetime('now', '-30 days')"
  ).run()

  return results
}
