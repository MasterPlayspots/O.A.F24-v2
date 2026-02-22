// Auth Routes - Register, Login (SHA-256→PBKDF2 auto-migration), Refresh, Verify, Profile
import { Hono } from 'hono'
import { SignJWT } from 'jose'
import { z } from 'zod'
import type { Bindings, Variables, UserRow } from '../types'
import { AUDIT_EVENTS } from '../types'
import { hashPassword, verifyPassword, verifyLegacySha256 } from '../services/password'
import { writeAuditLog } from '../services/audit'
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit, verifyCodeRateLimit, resetPasswordRateLimit, refreshRateLimit } from '../middleware/rateLimit'
import { requireAuth } from '../middleware/auth'
import { sendPasswordResetEmail, sendVerificationCodeEmail } from '../services/email'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  if (ab.byteLength !== bb.byteLength) return false
  return crypto.subtle.timingSafeEqual(ab, bb)
}

function generateVerificationCode(): { code: string; expires: string } {
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900000))
  const expires = new Date(Date.now() + 15 * 60_000).toISOString()
  return { code, expires }
}

async function issueTokenPair(db: D1Database, jwtSecret: string, user: { id: string; email: string; role: string }): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = new TextEncoder().encode(jwtSecret)
  const accessToken = await new SignJWT({ userId: user.id, email: user.email, role: user.role || 'user' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30m').sign(secret)
  const refreshRaw = crypto.randomUUID() + '-' + crypto.randomUUID()
  const refreshHash = await hashTokenSha256(refreshRaw)
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString()
  await db.batch([
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0').bind(user.id),
    db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), user.id, refreshHash, expiresAt),
  ])
  return { accessToken, refreshToken: refreshRaw }
}

const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
    .regex(/[^A-Za-z0-9]/, 'Passwort muss mindestens ein Sonderzeichen enthalten'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  bafaId: z.string().optional(),
  company: z.string().optional(),
  ustId: z.string().optional(),
  steuernummer: z.string().optional(),
  isKleinunternehmer: z.boolean().optional(),
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
const refreshSchema = z.object({ refreshToken: z.string().min(1) })
const patchMeSchema = z.object({
  phone: z.string().max(50).optional(),
  website: z.string().url().max(200).optional(),
  onboardingCompleted: z.boolean().optional(),
}).strict()

// POST /register
auth.post('/register', registerRateLimit, async (c) => {
  const parsed = registerSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: z.ZodIssue) => e.message) }, 400)

  const { email, password, firstName, lastName, bafaId, company, ustId, steuernummer, isKleinunternehmer } = parsed.data
  const db = c.env.DB

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
  if (existing) return c.json({ success: false, error: 'E-Mail bereits registriert' }, 400)

  const { hash, salt } = await hashPassword(password)
  const id = crypto.randomUUID()
  const verificationToken = crypto.randomUUID()

  await db.prepare(`INSERT INTO users (id, email, password_hash, salt, hash_version, first_name, last_name, role, bafa_id, company, ust_id, steuernummer, is_kleinunternehmer, verification_token)
    VALUES (?, ?, ?, ?, 2, ?, ?, 'user', ?, ?, ?, ?, ?, ?)`)
    .bind(id, email.toLowerCase(), hash, salt, firstName, lastName, bafaId || null, company || null, ustId || null, steuernummer || null, isKleinunternehmer ? 1 : 0, verificationToken).run()

  await writeAuditLog(db, { userId: id, eventType: AUDIT_EVENTS.REGISTER, detail: `New: ${email}`, ip: c.req.header('CF-Connecting-IP'), userAgent: c.req.header('User-Agent') })

  const { code: verificationCode, expires: codeExpires } = generateVerificationCode()
  await db.prepare(
    "UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?"
  ).bind(verificationCode, codeExpires, id).run()

  if (c.env.RESEND_API_KEY) {
    await sendVerificationCodeEmail(c.env.RESEND_API_KEY, email.toLowerCase(), firstName, verificationCode)
  }

  return c.json({
    success: true,
    userId: id,
    requiresVerification: true,
    message: 'Registrierung erfolgreich. Bitte geben Sie den 6-stelligen Code ein, den wir an Ihre E-Mail gesendet haben.',
  })
})

// POST /login
auth.post('/login', loginRateLimit, async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Ungültige Anmeldedaten' }, 400)

  const { email, password } = parsed.data
  const db = c.env.DB
  const ip = c.req.header('CF-Connecting-IP') || null
  const ua = c.req.header('User-Agent') || null

  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first() as UserRow | null
  if (!user) {
    await writeAuditLog(db, { eventType: AUDIT_EVENTS.LOGIN_FAILED, detail: `Unknown email: ${email}`, ip, userAgent: ua })
    return c.json({ success: false, error: 'Ungültige Anmeldedaten' }, 401)
  }

  const hv = user.hash_version || 1
  const valid = hv === 1
    ? await verifyLegacySha256(password, user.password_hash, c.env.JWT_SECRET)
    : await verifyPassword(password, user.password_hash, user.salt || '')

  if (!valid) {
    await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.LOGIN_FAILED, detail: 'Bad password', ip, userAgent: ua })
    return c.json({ success: false, error: 'Ungültige Anmeldedaten' }, 401)
  }

  // Auto-migrate SHA-256 → PBKDF2
  if (hv === 1) {
    const { hash: nh, salt: ns } = await hashPassword(password)
    await db.prepare("UPDATE users SET password_hash = ?, salt = ?, hash_version = 2, updated_at = datetime('now') WHERE id = ?").bind(nh, ns, user.id).run()
  }

  // If email not verified: auto-generate + send new code, redirect to verification
  if (!user.email_verified) {
    const { code: verificationCode, expires: codeExpires } = generateVerificationCode()
    await db.prepare(
      "UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?"
    ).bind(verificationCode, codeExpires, user.id).run()
    if (c.env.RESEND_API_KEY) {
      await sendVerificationCodeEmail(c.env.RESEND_API_KEY, user.email, user.first_name, verificationCode)
    }
    return c.json({ success: false, error: 'E-Mail nicht verifiziert. Ein neuer Code wurde gesendet.', requiresVerification: true }, 403)
  }

  const { accessToken, refreshToken } = await issueTokenPair(db, c.env.JWT_SECRET, { id: user.id, email: user.email, role: user.role || 'user' })

  await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.LOGIN, detail: `OK (hv:${hv}${hv === 1 ? ' migrated' : ''})`, ip, userAgent: ua })

  return c.json({
    success: true, token: accessToken, refreshToken,
    user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role || 'user', company: user.company, kontingentTotal: user.kontingent_total, kontingentUsed: user.kontingent_used, bafaStatus: user.bafa_status, onboardingCompleted: user.onboarding_completed === 1 },
  })
})

// POST /refresh - uses JOIN to avoid N+1 query
auth.post('/refresh', refreshRateLimit, async (c) => {
  const parsed = refreshSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Refresh Token erforderlich' }, 400)
  const { refreshToken } = parsed.data

  const db = c.env.DB
  const tokenHash = await hashTokenSha256(refreshToken)

  const row = await db.prepare(
    `SELECT rt.id as token_id, u.id, u.email, u.role
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked = 0 AND rt.expires_at > datetime('now')`
  ).bind(tokenHash).first<{ token_id: string; id: string; email: string; role: string }>()
  if (!row) return c.json({ success: false, error: 'Ungültiger Refresh Token' }, 401)

  const newRefresh = crypto.randomUUID() + '-' + crypto.randomUUID()
  const newHash = await hashTokenSha256(newRefresh)
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString()
  const secret = new TextEncoder().encode(c.env.JWT_SECRET)

  const accessToken = await new SignJWT({ userId: row.id, email: row.email, role: row.role || 'user' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30m').sign(secret)

  await db.batch([
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').bind(row.token_id),
    db.prepare('INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), row.id, newHash, expiresAt),
  ])

  return c.json({ success: true, token: accessToken, refreshToken: newRefresh })
})

// POST /verify-email
auth.post('/verify-email', async (c) => {
  const { token } = await c.req.json()
  if (!token) return c.json({ success: false, error: 'Token erforderlich' }, 400)
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE verification_token = ? AND created_at > datetime('now', '-24 hours')").bind(token).first<{ id: string }>()
  if (!user) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Token' }, 400)
  await c.env.DB.prepare("UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = datetime('now') WHERE id = ?").bind(user.id).run()
  return c.json({ success: true, message: 'E-Mail verifiziert' })
})

// POST /verify-code — validates 6-digit code, marks verified, issues JWT + refresh token
auth.post('/verify-code', verifyCodeRateLimit, async (c) => {
  const { email, code } = await c.req.json()
  if (!email || !code) {
    return c.json({ success: false, error: 'E-Mail und Code sind erforderlich' }, 400)
  }
  const db = c.env.DB
  const user = await db.prepare(
    "SELECT id, email, first_name, last_name, role, email_verified, email_verification_code, email_verification_expires, company, kontingent_total, kontingent_used FROM users WHERE email = ?"
  ).bind(email.toLowerCase()).first<{
    id: string; email: string; first_name: string; last_name: string; role: string
    email_verified: number; email_verification_code: string | null
    email_verification_expires: string | null; company: string | null
    kontingent_total: number; kontingent_used: number
  }>()

  if (!user) {
    return c.json({ success: false, error: 'Ungueltiger Code. Bitte versuchen Sie es erneut.', invalidCode: true }, 400)
  }

  // Already verified — just issue tokens
  if (user.email_verified) {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const accessToken = await new SignJWT({ userId: user.id, email: user.email, role: user.role || 'user' })
      .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30m').sign(secret)
    return c.json({
      success: true, alreadyVerified: true, token: accessToken,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role || 'user', company: user.company }
    })
  }

  if (!user.email_verification_code) {
    return c.json({ success: false, error: 'Kein Code vorhanden. Bitte fordern Sie einen neuen an.' }, 400)
  }
  if (new Date(user.email_verification_expires!) < new Date()) {
    return c.json({ success: false, error: 'Code abgelaufen. Bitte fordern Sie einen neuen an.', expired: true }, 400)
  }
  if (!timingSafeEqual(user.email_verification_code, code.trim())) {
    return c.json({ success: false, error: 'Ungueltiger Code. Bitte versuchen Sie es erneut.', invalidCode: true }, 400)
  }

  // Mark verified + clear code
  await db.prepare(
    "UPDATE users SET email_verified = 1, email_verification_code = NULL, email_verification_expires = NULL, verification_token = NULL, updated_at = datetime('now') WHERE id = ?"
  ).bind(user.id).run()

  const { accessToken, refreshToken } = await issueTokenPair(db, c.env.JWT_SECRET, { id: user.id, email: user.email, role: user.role || 'user' })

  await writeAuditLog(db, { userId: user.id, eventType: 'email_verified', detail: `Code verified for ${user.email}`, ip: c.req.header('CF-Connecting-IP') })

  return c.json({
    success: true, token: accessToken, refreshToken,
    user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role || 'user', company: user.company, kontingentTotal: user.kontingent_total, kontingentUsed: user.kontingent_used }
  })
})

// POST /resend-code
auth.post('/resend-code', registerRateLimit, async (c) => {
  const { email } = await c.req.json()
  if (!email) return c.json({ success: false, error: 'E-Mail ist erforderlich' }, 400)
  const db = c.env.DB
  const user = await db.prepare(
    "SELECT id, first_name, email_verified FROM users WHERE email = ?"
  ).bind(email.toLowerCase()).first<{ id: string; first_name: string; email_verified: number }>()
  if (!user || user.email_verified) {
    return c.json({ success: true, message: 'Falls ein Konto existiert, wurde ein neuer Code gesendet.' })
  }
  const { code: newCode, expires: codeExpires } = generateVerificationCode()
  await db.prepare(
    "UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?"
  ).bind(newCode, codeExpires, user.id).run()
  if (c.env.RESEND_API_KEY) {
    await sendVerificationCodeEmail(c.env.RESEND_API_KEY, email.toLowerCase(), user.first_name, newCode)
  }
  return c.json({ success: true, message: 'Neuer Code wurde gesendet.' })
})

// GET /me
auth.get('/me', requireAuth, async (c) => {
  const u = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('user').id).first() as UserRow | null
  if (!u) return c.json({ success: false, error: 'Nicht gefunden' }, 404)
  return c.json({ success: true, user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, company: u.company, bafaId: u.bafa_id, phone: u.phone, website: u.website, kontingentTotal: u.kontingent_total, kontingentUsed: u.kontingent_used, bafaStatus: u.bafa_status, onboardingCompleted: u.onboarding_completed === 1 } })
})

// PATCH /me
auth.patch('/me', requireAuth, async (c) => {
  const parsed = patchMeSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: z.ZodIssue) => e.message) }, 400)
  const updates = parsed.data
  const set: string[] = []; const vals: unknown[] = []
  if (updates.phone !== undefined) { set.push('phone = ?'); vals.push(updates.phone) }
  if (updates.website !== undefined) { set.push('website = ?'); vals.push(updates.website) }
  if (updates.onboardingCompleted !== undefined) { set.push('onboarding_completed = ?'); vals.push(updates.onboardingCompleted ? 1 : 0) }
  if (set.length) { vals.push(c.get('user').id); await c.env.DB.prepare(`UPDATE users SET ${set.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...vals).run() }
  return c.json({ success: true })
})

// POST /forgot-password
auth.post('/forgot-password', forgotPasswordRateLimit, async (c) => {
  const { email } = await c.req.json()
  if (!email) return c.json({ success: false, error: 'E-Mail ist erforderlich' }, 400)

  const db = c.env.DB
  // Rate limit per email using KV
  const rlKey = `pwd-reset:${email.toLowerCase()}`
  const existing = await c.env.RATE_LIMIT.get(rlKey)
  if (existing) {
    return c.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' })
  }

  const user = await db.prepare('SELECT id, first_name FROM users WHERE email = ?').bind(email.toLowerCase()).first<{ id: string; first_name: string }>()
  // Always return success to prevent email enumeration
  if (!user) return c.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' })

  const resetToken = crypto.randomUUID()
  const expires = new Date(Date.now() + 3600_000).toISOString() // 1 hour
  await db.prepare("UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(resetToken, expires, user.id).run()

  await c.env.RATE_LIMIT.put(rlKey, '1', { expirationTtl: 300 })

  const frontendUrl = c.env.FRONTEND_URL || 'https://zfbf.info'
  if (c.env.RESEND_API_KEY) {
    await sendPasswordResetEmail(c.env.RESEND_API_KEY, email.toLowerCase(), user.first_name, `${frontendUrl}/passwort-zuruecksetzen?token=${resetToken}`)
  }

  await writeAuditLog(db, { userId: user.id, eventType: 'password_reset_request', detail: email, ip: c.req.header('CF-Connecting-IP') })
  return c.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' })
})

// POST /reset-password
auth.post('/reset-password', resetPasswordRateLimit, async (c) => {
  const parsed = z.object({
    token: z.string().uuid(),
    password: z.string().min(8)
      .regex(/[A-Z]/, 'Mindestens ein Großbuchstabe')
      .regex(/[a-z]/, 'Mindestens ein Kleinbuchstabe')
      .regex(/[0-9]/, 'Mindestens eine Zahl')
      .regex(/[^A-Za-z0-9]/, 'Mindestens ein Sonderzeichen'),
  }).safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'Validierungsfehler', details: parsed.error.issues.map((e: any) => e.message) }, 400)

  const db = c.env.DB
  const user = await db.prepare("SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > datetime('now')").bind(parsed.data.token).first<{ id: string }>()
  if (!user) return c.json({ success: false, error: 'Ungültiger oder abgelaufener Token' }, 400)

  const { hash, salt } = await hashPassword(parsed.data.password)
  await db.batch([
    db.prepare("UPDATE users SET password_hash = ?, salt = ?, hash_version = 2, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now') WHERE id = ?").bind(hash, salt, user.id),
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').bind(user.id),
  ])

  await writeAuditLog(db, { userId: user.id, eventType: 'password_reset', ip: c.req.header('CF-Connecting-IP') })
  return c.json({ success: true, message: 'Passwort erfolgreich geändert. Bitte melden Sie sich erneut an.' })
})

// POST /logout
auth.post('/logout', requireAuth, async (c) => {
  const db = c.env.DB; const user = c.get('user')
  await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').bind(user.id).run()
  await writeAuditLog(db, { userId: user.id, eventType: AUDIT_EVENTS.LOGOUT, ip: c.req.header('CF-Connecting-IP'), userAgent: c.req.header('User-Agent') })
  return c.json({ success: true })
})

async function hashTokenSha256(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export { auth }
