// ZFBF Worker - Modular Hono API
import { Hono } from 'hono'
import type { Bindings, Variables } from './types'
import { securityHeaders, csrfProtection } from './middleware/security'
import { corsMiddleware, strictCorsCheck } from './middleware/cors'
import { auth } from './routes/auth'
import { reports } from './routes/reports'
import { branchen } from './routes/branchen'
import { promo } from './routes/promo'
import { orders } from './routes/orders'
import { payments } from './routes/payments'
import { admin } from './routes/admin'
import { gdpr } from './routes/gdpr'
import { performBackup, cleanupOldBackups } from './services/backup'
import { cleanupAuditLogs } from './services/audit'
import { cleanupExpiredData } from './services/retention'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// ============================================
// Global Middleware
// ============================================
app.use('/*', securityHeaders)
app.use('/*', corsMiddleware)
app.use('/api/*', strictCorsCheck)
app.use('/api/*', csrfProtection)

// ============================================
// Health Check
// ============================================
app.get('/', (c) => c.json({ status: 'ok', service: 'zfbf-api', version: c.env.API_VERSION || 'v1' }))
app.get('/health', async (c) => {
  const checks: Record<string, boolean> = {}
  try { await c.env.DB.prepare('SELECT 1').first(); checks.database = true } catch { checks.database = false }
  try { await c.env.CACHE.get('health-check'); checks.kv = true } catch { checks.kv = false }
  try { await c.env.REPORTS.head('health-check'); checks.r2 = true } catch { checks.r2 = false }
  const allHealthy = Object.values(checks).every(Boolean)
  return c.json({ status: allHealthy ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() }, allHealthy ? 200 : 503)
})

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
app.route('/api/user', gdpr)

// ============================================
// 404 Handler
// ============================================
app.notFound((c) => c.json({ success: false, error: 'Endpoint nicht gefunden' }, 404))

// ============================================
// Global Error Handler
// ============================================
app.onError((err, c) => {
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
        // Daily backup at 02:00 UTC (cron: 0 2 * * *)
        await performBackup([env.DB], env.REPORTS)
        await cleanupOldBackups(env.REPORTS)

        // GDPR audit log cleanup (90 days)
        await cleanupAuditLogs(env.DB)

        // GDPR data retention cleanup
        await cleanupExpiredData(env.DB)

        // Weekly learning cycle (cron: 0 3 * * 1 - Monday 03:00 UTC)
        const trigger = new Date(event.scheduledTime)
        if (trigger.getUTCDay() === 1 && trigger.getUTCHours() === 3) {
          // Learning cycle runs weekly - placeholder for bafa_learnings analysis
          // TODO: Implement full learning cycle against BAFA_CONTENT D1 binding
          console.log('Weekly learning cycle triggered at', trigger.toISOString())
        }
      } catch {
        // cron failure - errors surface via Cloudflare dashboard
      }
    })())
  },
}
