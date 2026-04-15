// Order Repository - Data access layer for payments table (zfbf-db)
// and download_tokens / refresh_tokens

// ============================================
// Row types for query results
// ============================================

export interface PaymentStatsRow {
  total: number;
  completed: number;
  revenue: number;
}

// ============================================
// Payments
// ============================================

export async function createPayment(
  db: D1Database,
  params: {
    id: string;
    userId: string;
    reportId: string;
    packageType: string;
    amount: number;
    provider: string;
    providerPaymentId: string;
    gutscheinCode?: string | null;
    status?: string;
  }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO payments (id, user_id, report_id, package_type, amount, provider, provider_payment_id, gutschein_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      params.id,
      params.userId,
      params.reportId,
      params.packageType,
      params.amount,
      params.provider,
      params.providerPaymentId,
      params.gutscheinCode || null,
      params.status || "pending"
    )
    .run();
}

export async function findByProviderPaymentId(
  db: D1Database,
  providerPaymentId: string
): Promise<{ id: string; report_id: string; amount: number } | null> {
  return db
    .prepare("SELECT id, report_id, amount FROM payments WHERE provider_payment_id = ?")
    .bind(providerPaymentId)
    .first<{ id: string; report_id: string; amount: number }>();
}

export async function findReportIdByProviderPaymentId(
  db: D1Database,
  providerPaymentId: string
): Promise<{ report_id: string } | null> {
  return db
    .prepare("SELECT report_id FROM payments WHERE provider_payment_id = ?")
    .bind(providerPaymentId)
    .first<{ report_id: string }>();
}

export async function updatePaymentStatus(
  db: D1Database,
  providerPaymentId: string,
  status: string
): Promise<void> {
  await db
    .prepare("UPDATE payments SET status = ? WHERE provider_payment_id = ?")
    .bind(status, providerPaymentId)
    .run();
}

export async function updatePaymentStatusById(
  db: D1Database,
  paymentId: string,
  status: string
): Promise<void> {
  await db.prepare("UPDATE payments SET status = ? WHERE id = ?").bind(status, paymentId).run();
}

// ============================================
// Refresh tokens
// ============================================

export async function revokeAllRefreshTokens(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")
    .bind(userId)
    .run();
}

export async function revokeRefreshTokenById(db: D1Database, tokenId: string): Promise<void> {
  await db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?").bind(tokenId).run();
}

export async function insertRefreshToken(
  db: D1Database,
  id: string,
  userId: string,
  tokenHash: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, tokenHash, expiresAt)
    .run();
}

export async function rotateRefreshTokens(
  db: D1Database,
  userId: string,
  newTokenId: string,
  newTokenHash: string,
  expiresAt: string
): Promise<void> {
  await db.batch([
    db
      .prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0")
      .bind(userId),
    db
      .prepare(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
      )
      .bind(newTokenId, userId, newTokenHash, expiresAt),
  ]);
}

export async function findValidRefreshToken(
  db: D1Database,
  tokenHash: string
): Promise<{ token_id: string; id: string; email: string; role: string } | null> {
  return db
    .prepare(
      `SELECT rt.id as token_id, u.id, u.email, u.role
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > datetime('now')`
    )
    .bind(tokenHash)
    .first<{ token_id: string; id: string; email: string; role: string }>();
}

export async function rotateRefreshToken(
  db: D1Database,
  oldTokenId: string,
  newTokenId: string,
  userId: string,
  newTokenHash: string,
  expiresAt: string
): Promise<void> {
  await db.batch([
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE id = ?").bind(oldTokenId),
    db
      .prepare(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
      )
      .bind(newTokenId, userId, newTokenHash, expiresAt),
  ]);
}

// ============================================
// Download tokens (bafa_antraege DB)
// ============================================

export async function findValidDownloadToken(
  bafaDb: D1Database,
  token: string
): Promise<{ antrag_id: string; downloads: number; max_downloads: number } | null> {
  return bafaDb
    .prepare(
      "SELECT antrag_id, downloads, max_downloads FROM download_tokens WHERE token = ? AND gueltig_bis > datetime('now')"
    )
    .bind(token)
    .first<{ antrag_id: string; downloads: number; max_downloads: number }>();
}

export async function incrementDownloadCount(bafaDb: D1Database, token: string): Promise<void> {
  await bafaDb
    .prepare("UPDATE download_tokens SET downloads = downloads + 1 WHERE token = ?")
    .bind(token)
    .run();
}

// ============================================
// Admin stats
// ============================================

export async function getPaymentStats(db: D1Database): Promise<PaymentStatsRow> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='completed' THEN amount ELSE 0 END) as revenue FROM payments"
    )
    .first<PaymentStatsRow>();
  return row || { total: 0, completed: 0, revenue: 0 };
}

export async function getActivePromoCount(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as total FROM gutscheine WHERE is_active = 1")
    .first<{ total: number }>();
  return row?.total || 0;
}
