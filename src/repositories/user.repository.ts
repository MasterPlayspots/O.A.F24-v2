// User Repository - Data access layer for the users table (zfbf-db)
import type { UserRow } from "../types";

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
): Promise<{ users: Record<string, unknown>[]; total: number }> {
  const [countResult, usersResult] = await Promise.all([
    db.prepare("SELECT COUNT(*) as total FROM users").first<{ total: number }>(),
    db
      .prepare(
        "SELECT id, email, first_name, last_name, role, company, bafa_status, kontingent_total, kontingent_used, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .bind(limit, offset)
      .all(),
  ]);
  return {
    users: (usersResult.results || []) as Record<string, unknown>[],
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
     VALUES (?, ?, ?, ?, 2, ?, ?, 'user', ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.id,
      params.email.toLowerCase(),
      params.passwordHash,
      params.salt,
      params.firstName,
      params.lastName,
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

export async function incrementKontingentUsed(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET kontingent_used = kontingent_used + 1 WHERE id = ?")
    .bind(userId)
    .run();
}
