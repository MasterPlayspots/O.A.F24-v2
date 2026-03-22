// User Repository - Data access layer for the users table (zfbf-db)
import type { UserRow } from "../types";

// ============================================
// Row types for query results
// ============================================

export interface UserListItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company: string | null;
  bafa_status: string;
  kontingent_total: number;
  kontingent_used: number;
  email_verified: number;
  created_at: string;
}

export interface UserStatsRow {
  total: number;
  verified: number;
}

// ============================================
// Query types
// ============================================

export interface CreateUserParams {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  firstName: string;
  lastName: string;
  role?: "unternehmen" | "berater";
  bafaId?: string | null;
  company?: string | null;
  ustId?: string | null;
  steuernummer?: string | null;
  isKleinunternehmer?: boolean;
  verificationToken: string;
}

export interface UserKontingent {
  kontingent_total: number;
  kontingent_used: number;
}

// ============================================
// Reads
// ============================================

export async function findByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();
}

export async function findById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function existsByEmail(db: D1Database, email: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string }>();
  return !!row;
}

export async function findByVerificationToken(
  db: D1Database,
  token: string
): Promise<{ id: string } | null> {
  return db
    .prepare("SELECT id FROM users WHERE verification_token = ?")
    .bind(token)
    .first<{ id: string }>();
}

export async function findByResetToken(
  db: D1Database,
  token: string
): Promise<{ id: string } | null> {
  return db
    .prepare("SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')")
    .bind(token)
    .first<{ id: string }>();
}

export async function findForResendCode(
  db: D1Database,
  email: string
): Promise<{ id: string; first_name: string; email_verified: number } | null> {
  return db
    .prepare("SELECT id, first_name, email_verified FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string; first_name: string; email_verified: number }>();
}

export async function findForVerifyCode(
  db: D1Database,
  email: string
): Promise<{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  email_verified: number;
  email_verification_code: string | null;
  email_verification_expires: string | null;
  company: string | null;
  kontingent_total: number;
  kontingent_used: number;
} | null> {
  return db
    .prepare(
      "SELECT id, email, first_name, last_name, role, email_verified, email_verification_code, email_verification_expires, company, kontingent_total, kontingent_used FROM users WHERE email = ?"
    )
    .bind(email.toLowerCase())
    .first();
}

export async function findEmailAndName(
  db: D1Database,
  userId: string
): Promise<{ email: string; first_name: string } | null> {
  return db
    .prepare("SELECT email, first_name FROM users WHERE id = ?")
    .bind(userId)
    .first<{ email: string; first_name: string }>();
}

export async function findForForgotPassword(
  db: D1Database,
  email: string
): Promise<{ id: string; first_name: string } | null> {
  return db
    .prepare("SELECT id, first_name FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string; first_name: string }>();
}

export async function getKontingent(
  db: D1Database,
  userId: string
): Promise<UserKontingent | null> {
  return db
    .prepare("SELECT kontingent_total, kontingent_used FROM users WHERE id = ?")
    .bind(userId)
    .first<UserKontingent>();
}

export async function listUsers(
  db: D1Database,
  limit: number,
  offset: number
): Promise<{ users: UserListItem[]; total: number }> {
  const [countResult, usersResult] = await Promise.all([
    db.prepare("SELECT COUNT(*) as total FROM users").first<{ total: number }>(),
    db
      .prepare(
        "SELECT id, email, first_name, last_name, role, company, bafa_status, kontingent_total, kontingent_used, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .bind(limit, offset)
      .all<UserListItem>(),
  ]);
  return {
    users: usersResult.results || [],
    total: countResult?.total || 0,
  };
}

// ============================================
// Writes
// ============================================

export async function create(db: D1Database, params: CreateUserParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, salt, hash_version, first_name, last_name, role, bafa_id, company, ust_id, steuernummer, is_kleinunternehmer, verification_token)
     VALUES (?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.id,
      params.email.toLowerCase(),
      params.passwordHash,
      params.salt,
      params.firstName,
      params.lastName,
      params.role || "unternehmen",
      params.bafaId || null,
      params.company || null,
      params.ustId || null,
      params.steuernummer || null,
      params.isKleinunternehmer ? 1 : 0,
      params.verificationToken
    )
    .run();
}

export async function setVerificationCode(
  db: D1Database,
  userId: string,
  code: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?"
    )
    .bind(code, expiresAt, userId)
    .run();
}

export async function markEmailVerified(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(userId)
    .run();
}

export async function markEmailVerifiedClearCode(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET email_verified = 1, email_verification_code = NULL, email_verification_expires = NULL, verification_token = NULL, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(userId)
    .run();
}

export async function migratePasswordHash(
  db: D1Database,
  userId: string,
  hash: string,
  salt: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET password_hash = ?, salt = ?, hash_version = 2, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(hash, salt, userId)
    .run();
}

export async function updatePassword(
  db: D1Database,
  userId: string,
  hash: string,
  salt: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET password_hash = ?, salt = ?, hash_version = 2, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(hash, salt, userId)
    .run();
}

export async function setResetToken(
  db: D1Database,
  userId: string,
  resetToken: string,
  expiresAt: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(resetToken, expiresAt, userId)
    .run();
}

export async function updateRole(db: D1Database, userId: string, role: string): Promise<void> {
  await db
    .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(role, userId)
    .run();
}

export interface UpdateProfileParams {
  first_name?: string;
  last_name?: string;
  company?: string | null;
  phone?: string | null;
  email?: string;
}

export async function updateProfile(
  db: D1Database,
  userId: string,
  params: UpdateProfileParams
): Promise<void> {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (params.first_name !== undefined) {
    sets.push("first_name = ?");
    values.push(params.first_name);
  }
  if (params.last_name !== undefined) {
    sets.push("last_name = ?");
    values.push(params.last_name);
  }
  if (params.company !== undefined) {
    sets.push("company = ?");
    values.push(params.company);
  }
  if (params.phone !== undefined) {
    sets.push("phone = ?");
    values.push(params.phone);
  }
  if (params.email !== undefined) {
    sets.push("email = ?");
    values.push(params.email.toLowerCase());
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  const sql = `UPDATE users SET ${sets.join(", ")} WHERE id = ?`;
  values.push(userId);

  await db
    .prepare(sql)
    .bind(...values)
    .run();
}

export async function incrementKontingentUsed(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET kontingent_used = kontingent_used + 1 WHERE id = ?")
    .bind(userId)
    .run();
}

// ============================================
// GDPR Art. 15 - Data export
// ============================================

export interface GdprUserExport {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  bafa_id: string | null;
  ust_id: string | null;
  steuernummer: string | null;
  phone: string | null;
  website: string | null;
  bafa_status: string;
  kontingent_total: number;
  kontingent_used: number;
  created_at: string;
  updated_at: string;
  privacy_accepted_at: string | null;
}

export interface GdprReportExport {
  id: string;
  status: string;
  company_name: string | null;
  branche: string | null;
  unterbranche: string | null;
  is_unlocked: number;
  created_at: string;
  updated_at: string;
}

export interface GdprPaymentExport {
  id: string;
  report_id: string;
  package_type: string;
  amount: number;
  currency: string | null;
  status: string;
  provider: string;
  created_at: string;
}

export interface GdprOrderExport {
  id: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  reports_count: number;
  status: string;
  created_at: string;
}

export interface GdprPromoRedemptionExport {
  id: string;
  code: string;
  discount_amount: number;
  redeemed_at: string;
}

export interface GdprAuditLogExport {
  event_type: string;
  detail: string | null;
  created_at: string;
}

export interface GdprExportData {
  user: GdprUserExport | null;
  reports: GdprReportExport[];
  payments: GdprPaymentExport[];
  orders: GdprOrderExport[];
  promoRedemptions: GdprPromoRedemptionExport[];
  auditLogs: GdprAuditLogExport[];
}

export async function getGdprExportData(db: D1Database, userId: string): Promise<GdprExportData> {
  const [userResult, reportsResult, paymentsResult, ordersResult, promoResult, auditResult] =
    await db.batch([
      db
        .prepare(
          "SELECT id, email, first_name, last_name, company, bafa_id, ust_id, steuernummer, phone, website, bafa_status, kontingent_total, kontingent_used, created_at, updated_at, privacy_accepted_at FROM users WHERE id = ?"
        )
        .bind(userId),
      db
        .prepare(
          "SELECT id, status, company_name, branche, unterbranche, is_unlocked, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(userId),
      db
        .prepare(
          "SELECT id, report_id, package_type, amount, currency, status, provider, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(userId),
      db
        .prepare(
          "SELECT id, amount, discount_amount, final_amount, reports_count, status, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(userId),
      db
        .prepare(
          "SELECT pr.id, g.code, pr.discount_amount, pr.redeemed_at FROM promo_redemptions pr JOIN gutscheine g ON g.id = pr.promo_code_id WHERE pr.user_id = ? ORDER BY pr.redeemed_at DESC"
        )
        .bind(userId),
      db
        .prepare(
          "SELECT event_type, detail, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100"
        )
        .bind(userId),
    ]);

  return {
    user: (userResult?.results?.[0] as GdprUserExport | undefined) ?? null,
    reports: (reportsResult?.results ?? []) as GdprReportExport[],
    payments: (paymentsResult?.results ?? []) as GdprPaymentExport[],
    orders: (ordersResult?.results ?? []) as GdprOrderExport[],
    promoRedemptions: (promoResult?.results ?? []) as GdprPromoRedemptionExport[],
    auditLogs: (auditResult?.results ?? []) as GdprAuditLogExport[],
  };
}

export async function acceptPrivacy(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET privacy_accepted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .bind(userId)
    .run();
}

// ============================================
// Admin stats
// ============================================

export async function getUserStats(db: D1Database): Promise<UserStatsRow> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN email_verified=1 THEN 1 ELSE 0 END) as verified FROM users"
    )
    .first<UserStatsRow>();
  return row || { total: 0, verified: 0 };
}

// ============================================
// GDPR Art. 17 - Anonymize
// ============================================

export async function anonymizeUser(
  db: D1Database,
  userId: string,
  deletedEmail: string
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE users SET
      email = ?, first_name = '[GELÖSCHT]', last_name = '[GELÖSCHT]',
      company = NULL, phone = NULL, website = NULL, bafa_id = NULL,
      ust_id = NULL, steuernummer = NULL,
      password_hash = '', salt = NULL,
      verification_token = NULL, reset_token = NULL, reset_token_expires = NULL,
      deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`
      )
      .bind(deletedEmail, userId),
    db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?").bind(userId),
    db
      .prepare(
        "UPDATE audit_logs SET ip = NULL, user_agent = NULL, detail = '[GELÖSCHT]' WHERE user_id = ?"
      )
      .bind(userId),
  ]);
}
