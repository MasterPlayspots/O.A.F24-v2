// ZFBF Worker - Modular Hono API
import { Hono } from 'hono'
import type { Bindings, Variables } from './types'
import { securityHeaders } from './middleware/security'
import { corsMiddleware, strictCorsCheck } from './middleware/cors'
import { auth } from './routes/auth'
import { reports } from './routes/reports'
import { branchen } from './routes/branchen'
import { promo } from './routes/promo'
import { orders } from './routes/orders'
import { payments } from './routes/payments'
import { admin } from './routes/admin'
import { performBackup, cleanupOldBackups } from './services/backup'
import { cleanupAuditLogs } from './services/audit'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================
// Global Middleware
// ============================================
app.use('/*', securityHeaders)
app.use('/*', corsMiddleware)
app.use('/api/*', strictCorsCheck)

// ============================================
// Health Check
// ============================================
app.get('/', (c) => c.json({ status: 'ok', service: 'zfbf-api', version: c.env.API_VERSION || 'v1' }))
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// ============================================
// Route Mounting
// ============================================
app.route('/api/auth', auth)
app.route('/api/reports', reports)
app.route('/api/bafa', reports) // Legacy alias for /api/reports
app.route('/api/branchen', branchen)
app.route('/api/promo', promo)
app.route('/api/orders', orders)
app.route('/api/payments', payments)
app.route('/api/admin', admin)

// ============================================
// Legacy Compatibility Redirects
// ============================================
app.post('/api/gutschein/validate', async (c) => {
  const body = await c.req.json()
  const url = new URL('/api/promo/validate', c.req.url)
  return app.fetch(new Request(url, { method: 'POST', headers: c.req.raw.headers, body: JSON.stringify(body) }), c.env)
})

app.post('/api/payments/create', async (c) => {
  const body = await c.req.json()
  const url = new URL('/api/orders/create', c.req.url)
  return app.fetch(new Request(url, { method: 'POST', headers: c.req.raw.headers, body: JSON.stringify(body) }), c.env)
})

app.post('/api/ai/generate', async (c) => {
  const body = await c.req.json()
  const url = new URL('/api/reports/generate', c.req.url)
  return app.fetch(new Request(url, { method: 'POST', headers: c.req.raw.headers, body: JSON.stringify(body) }), c.env)
})

// ============================================
// 404 Handler
// ============================================
app.notFound((c) => c.json({ success: false, error: 'Endpoint nicht gefunden' }, 404))

// ============================================
// Global Error Handler
// ============================================
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack)
  return c.json({ success: false, error: c.env.ENVIRONMENT === 'production' ? 'Interner Serverfehler' : err.message }, 500)
})

// ============================================
// Scheduled Handler (cron triggers)
// ============================================
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      try {
        // Daily backup at 02:00 UTC
        await performBackup([env.DB], env.REPORTS)
        await cleanupOldBackups(env.REPORTS)

        // GDPR audit log cleanup (90 days)
        await cleanupAuditLogs(env.DB)

        console.log(`[cron] Backup + cleanup completed at ${new Date().toISOString()}`)
      } catch (err) {
        console.error('[cron] Failed:', err)
      }
    })())
  },
}
