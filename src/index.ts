// ZFBF Worker - Cloudflare Workers with D1 Database
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { D1Database } from '@cloudflare/workers-types' // Declare D1Database

type Bindings = {
  DB: D1Database
  AI: any
  JWT_SECRET: string
  FRONTEND_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/*', cors({
  origin: ['https://v0-bafa-creator-ai.vercel.app', 'http://localhost:3000'],
  credentials: true,
}))

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'zfbf-api' }))

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const { email, password, firstName, lastName, bafaId, company, ustId, steuernummer, isKleinunternehmer } = body
  
  // Check if user exists
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) {
    return c.json({ success: false, error: 'Email bereits registriert' }, 400)
  }
  
  // Hash password (simple hash for demo - use bcrypt in production)
  const encoder = new TextEncoder()
  const data = encoder.encode(password + c.env.JWT_SECRET)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  const id = crypto.randomUUID()
  const verificationToken = crypto.randomUUID()
  
  await db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, bafa_id, company, ust_id, steuernummer, is_kleinunternehmer, verification_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, email, passwordHash, firstName, lastName, bafaId || null, company || null, ustId || null, steuernummer || null, isKleinunternehmer ? 1 : 0, verificationToken).run()
  
  return c.json({ 
    success: true, 
    userId: id,
    message: 'Registrierung erfolgreich. Bitte pruefen Sie Ihr Email-Postfach zur Verifizierung.'
  })
})

// Login
app.post('/api/auth/login', async (c) => {
  const db = c.env.DB
  const { email, password } = await c.req.json()
  
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any
  if (!user) {
    return c.json({ success: false, error: 'Ungültige Anmeldedaten' }, 401)
  }
  
  // Verify password
  const encoder = new TextEncoder()
  const data = encoder.encode(password + c.env.JWT_SECRET)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  if (passwordHash !== user.password_hash) {
    return c.json({ success: false, error: 'Ungültige Anmeldedaten' }, 401)
  }
  
  if (!user.email_verified) {
    return c.json({ success: false, error: 'Email nicht verifiziert', needsVerification: true }, 401)
  }
  
  // Create JWT
  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(c.env.JWT_SECRET))
  
  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      company: user.company,
      kontingentTotal: user.kontingent_total,
      kontingentUsed: user.kontingent_used,
      bafaStatus: user.bafa_status,
      onboardingCompleted: user.onboarding_completed === 1,
    }
  })
})

// Verify Email
app.post('/api/auth/verify-email', async (c) => {
  const db = c.env.DB
  const { token } = await c.req.json()
  
  const user = await db.prepare('SELECT id FROM users WHERE verification_token = ?').bind(token).first() as any
  if (!user) {
    return c.json({ success: false, error: 'Ungültiger Token' }, 400)
  }
  
  await db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').bind(user.id).run()
  
  return c.json({ success: true, message: 'Email verifiziert' })
})

// Get User (protected)
app.get('/api/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  }
  
  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET))
    
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.userId).first() as any
    if (!user) {
      return c.json({ success: false, error: 'User nicht gefunden' }, 404)
    }
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        bafaId: user.bafa_id,
        phone: user.phone,
        website: user.website,
        kontingentTotal: user.kontingent_total,
        kontingentUsed: user.kontingent_used,
        bafaStatus: user.bafa_status,
        onboardingCompleted: user.onboarding_completed === 1,
      }
    })
  } catch {
    return c.json({ success: false, error: 'Ungültiger Token' }, 401)
  }
})

// Update User (onboarding)
app.patch('/api/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  }
  
  const token = authHeader.slice(7)
  const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET))
  
  const updates = await c.req.json()
  const allowedFields = ['phone', 'website', 'onboarding_completed']
  const setClauses: string[] = []
  const values: any[] = []
  
  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key === 'onboardingCompleted' ? 'onboarding_completed' : key
    if (allowedFields.includes(dbKey)) {
      setClauses.push(`${dbKey} = ?`)
      values.push(dbKey === 'onboarding_completed' ? (value ? 1 : 0) : value)
    }
  }
  
  if (setClauses.length > 0) {
    values.push(payload.userId)
    await c.env.DB.prepare(`UPDATE users SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...values).run()
  }
  
  return c.json({ success: true })
})

// ============================================
// REPORTS ROUTES
// ============================================

// List Reports
app.get('/api/reports', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const reports = await c.env.DB.prepare(`
    SELECT id, status, company_name, branche, unterbranche, qa_gesamt, is_unlocked, created_at, updated_at
    FROM reports WHERE user_id = ? ORDER BY updated_at DESC
  `).bind(userId).all()
  
  return c.json({ success: true, reports: reports.results })
})

// Get Single Report
app.get('/api/reports/:id', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const report = await c.env.DB.prepare('SELECT * FROM reports WHERE id = ? AND user_id = ?').bind(c.req.param('id'), userId).first()
  if (!report) {
    return c.json({ success: false, error: 'Bericht nicht gefunden' }, 404)
  }
  
  return c.json({ success: true, report })
})

// Create Report
app.post('/api/reports', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  // Check contingent
  const user = await c.env.DB.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(userId).first() as any
  const remaining = user.kontingent_total - user.kontingent_used
  if (remaining <= 0) {
    return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)
  }
  
  const id = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO reports (id, user_id, status) VALUES (?, ?, ?)').bind(id, userId, 'entwurf').run()
  
  return c.json({ success: true, reportId: id })
})

// Update Report (save progress)
app.patch('/api/reports/:id', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const reportId = c.req.param('id')
  const updates = await c.req.json()
  
  // Build dynamic update
  const allowedFields = [
    'status', 'company_name', 'company_rechtsform', 'company_gruendung', 'company_mitarbeiter',
    'company_umsatz', 'company_plz', 'company_ort', 'branche', 'unterbranche',
    'ausgangslage_stichpunkte', 'ausgangslage_herausforderungen', 'ausgangslage_text',
    'beratungsmodule', 'massnahmen', 'beratungsinhalte_text',
    'massnahmenplan', 'handlungsempfehlungen', 'umsetzungsplan',
    'ergebnisse_kurzfristig', 'ergebnisse_mittelfristig', 'ergebnisse_langfristig',
    'nachhaltigkeit_oekonomisch', 'nachhaltigkeit_oekologisch', 'nachhaltigkeit_sozial',
    'qa_vollstaendigkeit', 'qa_bafa_konformitaet', 'qa_textqualitaet', 'qa_plausibilitaet', 'qa_gesamt'
  ]
  
  const setClauses: string[] = []
  const values: any[] = []
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`)
      values.push(typeof value === 'object' ? JSON.stringify(value) : value)
    }
  }
  
  if (setClauses.length > 0) {
    values.push(reportId, userId)
    await c.env.DB.prepare(`UPDATE reports SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`).bind(...values).run()
  }
  
  return c.json({ success: true })
})

// Finalize Report (uses contingent)
app.post('/api/reports/:id/finalize', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const reportId = c.req.param('id')
  
  // Check contingent
  const user = await c.env.DB.prepare('SELECT kontingent_total, kontingent_used FROM users WHERE id = ?').bind(userId).first() as any
  const remaining = user.kontingent_total - user.kontingent_used
  if (remaining <= 0) {
    return c.json({ success: false, error: 'Kontingent aufgebraucht', needsUpgrade: true }, 403)
  }
  
  // Update report status and decrement contingent
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE reports SET status = ? WHERE id = ? AND user_id = ?').bind('generiert', reportId, userId),
    c.env.DB.prepare('UPDATE users SET kontingent_used = kontingent_used + 1 WHERE id = ?').bind(userId)
  ])
  
  return c.json({ success: true })
})

// ============================================
// AI GENERATION ROUTES
// ============================================

app.post('/api/ai/generate', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const { type, context } = await c.req.json()
  
  // Use Cloudflare AI
  const prompts: Record<string, string> = {
    ausgangslage: `Du bist ein BAFA-Beratungsexperte. Erstelle einen professionellen Text für die Ausgangslage eines Beratungsberichts.
Branche: ${context.branche}
Unterbranche: ${context.unterbranche}
Stichpunkte: ${context.stichpunkte?.join(', ')}
Herausforderungen: ${context.herausforderungen?.join(', ')}

Schreibe 2-3 Absätze in sachlichem, professionellem Deutsch.`,

    beratungsinhalte: `Du bist ein BAFA-Beratungsexperte. Erstelle einen professionellen Text für die Beratungsinhalte.
Branche: ${context.branche}
Module: ${context.module?.join(', ')}
Maßnahmen: ${JSON.stringify(context.massnahmen)}

Beschreibe die durchgeführten Beratungsleistungen strukturiert.`,

    ergebnisse: `Du bist ein BAFA-Beratungsexperte. Generiere konkrete, messbare Ergebnisse für einen Beratungsbericht.
Branche: ${context.branche}
Maßnahmen: ${JSON.stringify(context.massnahmen)}

Generiere je 2-3 Sätze für kurzfristige (0-3 Monate), mittelfristige (3-12 Monate) und langfristige (1-3 Jahre) Ergebnisse.
Format als JSON: { "kurzfristig": "...", "mittelfristig": "...", "langfristig": "..." }`,

    nachhaltigkeit: `Du bist ein BAFA-Beratungsexperte. Generiere Nachhaltigkeitsaspekte für einen Beratungsbericht.
Branche: ${context.branche}
Maßnahmen: ${JSON.stringify(context.massnahmen)}

Generiere je 2-3 Sätze für ökonomische, ökologische und soziale Nachhaltigkeit.
Format als JSON: { "oekonomisch": "...", "oekologisch": "...", "sozial": "..." }`
  }
  
  const prompt = prompts[type]
  if (!prompt) {
    return c.json({ success: false, error: 'Unbekannter Generierungstyp' }, 400)
  }
  
  try {
    const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      prompt,
      max_tokens: 1000,
    })
    
    return c.json({ success: true, text: response.response })
  } catch (error) {
    return c.json({ success: false, error: 'KI-Generierung fehlgeschlagen' }, 500)
  }
})

// ============================================
// PAYMENT ROUTES
// ============================================

// Validate Gutschein
app.post('/api/gutschein/validate', async (c) => {
  const { code } = await c.req.json()
  
  const gutschein = await c.env.DB.prepare(`
    SELECT * FROM gutscheine WHERE code = ? AND is_active = 1 AND (valid_until IS NULL OR valid_until > datetime('now'))
  `).bind(code.toUpperCase()).first() as any
  
  if (!gutschein || gutschein.current_uses >= gutschein.max_uses) {
    return c.json({ success: false, error: 'Ungültiger oder abgelaufener Gutscheincode' })
  }
  
  return c.json({ 
    success: true, 
    rabatt: gutschein.rabatt_prozent,
    code: gutschein.code
  })
})

// Create Payment (stub - integrate with Stripe/PayPal)
app.post('/api/payments/create', async (c) => {
  const userId = await getUserIdFromToken(c)
  if (!userId) return c.json({ success: false, error: 'Nicht authentifiziert' }, 401)
  
  const { packageType, gutscheinCode, paymentMethod } = await c.req.json()
  
  const packages: Record<string, { price: number, reports: number }> = {
    einzel: { price: 5900, reports: 1 },
    starter: { price: 14900, reports: 3 },
    standard: { price: 34900, reports: 10 },
    pro: { price: 74900, reports: 25 },
  }
  
  const pkg = packages[packageType]
  if (!pkg) {
    return c.json({ success: false, error: 'Ungültiges Paket' }, 400)
  }
  
  let finalPrice = pkg.price
  let rabatt = 0
  
  // Apply Gutschein
  if (gutscheinCode) {
    const gutschein = await c.env.DB.prepare(`
      SELECT * FROM gutscheine WHERE code = ? AND is_active = 1
    `).bind(gutscheinCode.toUpperCase()).first() as any
    
    if (gutschein && gutschein.current_uses < gutschein.max_uses) {
      rabatt = gutschein.rabatt_prozent
      finalPrice = Math.round(pkg.price * (1 - rabatt / 100))
      
      // Increment usage
      await c.env.DB.prepare('UPDATE gutscheine SET current_uses = current_uses + 1 WHERE id = ?').bind(gutschein.id).run()
    }
  }
  
  const paymentId = crypto.randomUUID()
  
  await c.env.DB.prepare(`
    INSERT INTO payments (id, user_id, package_type, amount, provider, gutschein_code, gutschein_rabatt, reports_added, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(paymentId, userId, packageType, finalPrice, paymentMethod, gutscheinCode || null, rabatt, pkg.reports, 'pending').run()
  
  // For demo: auto-complete payment and add reports
  if (paymentMethod === 'rechnung') {
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE payments SET status = ? WHERE id = ?').bind('completed', paymentId),
      c.env.DB.prepare('UPDATE users SET kontingent_total = kontingent_total + ? WHERE id = ?').bind(pkg.reports, userId)
    ])
    
    return c.json({ success: true, paymentId, status: 'completed', reportsAdded: pkg.reports })
  }
  
  // TODO: Create Stripe/PayPal checkout session
  return c.json({ 
    success: true, 
    paymentId,
    checkoutUrl: `https://checkout.stripe.com/...`, // Placeholder
  })
})

// ============================================
// HELPERS
// ============================================

async function getUserIdFromToken(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(token, new TextEncoder().encode(c.env.JWT_SECRET))
    return payload.userId as string
  } catch {
    return null
  }
}

// JWT imports (inline for Workers)
import { SignJWT, jwtVerify } from 'jose'

export default app
