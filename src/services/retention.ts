// Data Retention Service - GDPR cleanup of expired/soft-deleted data

export async function cleanupExpiredData(db: D1Database): Promise<{ deletedUsers: number; deletedTokens: number; deletedDrafts: number }> {
  const results = { deletedUsers: 0, deletedTokens: 0, deletedDrafts: 0 }

  // Delete soft-deleted users after 30 days
  const userCleanup = await db.prepare(
    "DELETE FROM users WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-30 days')"
  ).run()
  results.deletedUsers = userCleanup.meta.changes || 0

  // Delete expired download tokens (older than 24 hours past expiry)
  const tokenCleanup = await db.prepare(
    "DELETE FROM download_tokens WHERE valid_until < datetime('now', '-1 day')"
  ).run()
  results.deletedTokens = tokenCleanup.meta.changes || 0

  // Delete abandoned draft reports after 90 days
  const draftCleanup = await db.prepare(
    "DELETE FROM reports WHERE status = 'entwurf' AND updated_at < datetime('now', '-90 days')"
  ).run()
  results.deletedDrafts = draftCleanup.meta.changes || 0

  // Cleanup revoked refresh tokens older than 30 days
  await db.prepare(
    "DELETE FROM refresh_tokens WHERE (revoked = 1 OR expires_at < datetime('now')) AND created_at < datetime('now', '-30 days')"
  ).run()

  return results
}
