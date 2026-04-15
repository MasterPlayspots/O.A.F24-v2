// fund24 API — Hono Worker
import { Hono } from "hono";
import { Toucan } from "toucan-js";
import type { Bindings, Variables } from "./types";
import { securityHeaders, csrfProtection } from "./middleware/security";
import { corsMiddleware, strictCorsCheck } from "./middleware/cors";
import { globalRateLimit } from "./middleware/rateLimit";
import { auth } from "./routes/auth";
import { reports } from "./routes/reports";
import { branchen } from "./routes/branchen";
import { promo } from "./routes/promo";
import { orders } from "./routes/orders";
import { payments } from "./routes/payments";
import { verifyPayment } from "./routes/verify-payment";
import { admin } from "./routes/admin";
import { gdpr } from "./routes/gdpr";
import { foerdermittel } from "./routes/foerdermittel";
import { nachrichten } from "./routes/nachrichten";
import { netzwerk } from "./routes/netzwerk";
import { check } from "./routes/check";
import { beratungen } from "./routes/beratungen";
import { vorlagen } from "./routes/vorlagen";
import { me } from "./routes/me";
import { berater } from "./routes/berater";
import { unternehmen as unternehmenRoutes } from "./routes/unternehmen";
import { antraege } from "./routes/antraege";
import { tracker } from "./routes/tracker";
import { news, adminNews } from "./routes/news";
import { checks } from "./routes/checks";
import { oa } from "./routes/oa";
import { runCP } from "./services/oa-cp";
import { runVA } from "./services/oa-va";
import { runOnboardingDispatch } from "./services/onboarding";
import { performBackup, cleanupOldBackups } from "./services/backup";
import { cleanupAuditLogs } from "./services/audit";
import { cleanupExpiredData } from "./services/retention";
import { log } from "./services/logger";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ============================================
// Global Middleware
// ============================================
// Sprint 18: normalize trailing slashes (Hono routes don't auto-match
// /api/foo/ when only /api/foo is registered). 301 to the canonical URL.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
    return c.redirect(url.toString(), 301);
  }
  return next();
});

app.use("/*", securityHeaders);
app.use("/*", corsMiddleware);
app.use("/api/*", strictCorsCheck);
app.use("/api/*", csrfProtection);
app.use("/api/*", globalRateLimit);

// ============================================
// Health Check
// ============================================
app.get("/", (c) =>
  c.json({ status: "ok", service: "zfbf-api", version: c.env.API_VERSION || "v1" })
);

// /health — only reachable if Worker route covers root (currently doesn't for api.fund24.io)
app.get("/health", async (c) => {
  const checks: Record<string, boolean> = {};
  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.database = true;
  } catch {
    checks.database = false;
  }
  try {
    await c.env.BAFA_DB.prepare("SELECT 1").first();
    checks.bafa_db = true;
  } catch {
    checks.bafa_db = false;
  }
  try {
    await c.env.CACHE.get("health-check");
    checks.kv = true;
  } catch {
    checks.kv = false;
  }
  try {
    await c.env.REPORTS.head("health-check");
    checks.r2 = true;
  } catch {
    checks.r2 = false;
  }
  const allHealthy = Object.values(checks).every(Boolean);
  return c.json(
    { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    allHealthy ? 200 : 503
  );
});

// /api/health — reachable via Worker route (api.fund24.io/api/*)
app.get("/api/health", async (c) => {
  const checks: Record<string, boolean> = {};
  try {
    await c.env.DB.prepare("SELECT 1").first();
    checks.database = true;
  } catch {
    checks.database = false;
  }
  try {
    await c.env.BAFA_DB.prepare("SELECT 1").first();
    checks.bafa_db = true;
  } catch {
    checks.bafa_db = false;
  }
  try {
    await c.env.CACHE.get("health-check");
    checks.kv = true;
  } catch {
    checks.kv = false;
  }
  try {
    await c.env.REPORTS.head("health-check");
    checks.r2 = true;
  } catch {
    checks.r2 = false;
  }
  const allHealthy = Object.values(checks).every(Boolean);
  return c.json(
    { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    allHealthy ? 200 : 503
  );
});

// ============================================
// Route Mounting
// ============================================
app.route("/api/auth", auth);
app.route("/api/reports", reports);
app.route("/api/berichte", reports); // v2 frontend alias for /api/reports
app.route("/api/branchen", branchen);
app.route("/api/promo", promo);
app.route("/api/orders", orders);
app.route("/api/payments", payments);
app.route("/api", verifyPayment); // POST /api/verify-payment
app.route("/api/admin", admin);
app.route("/api/user", gdpr);
app.route("/api/foerdermittel", foerdermittel);
app.route("/api/nachrichten", nachrichten);
app.route("/api/netzwerk", netzwerk);
app.route("/api/check", check);
app.route("/api/beratungen", beratungen);
app.route("/api/vorlagen", vorlagen);
app.route("/api/me", me);
app.route("/api/berater", berater);
app.route("/api/unternehmen", unternehmenRoutes);
app.route("/api/antraege", antraege);
app.route("/api/tracker", tracker);
app.route("/api/news", news);
app.route("/api/admin/news", adminNews);
app.route("/api/checks", checks);
app.route("/api/oa", oa);

// ============================================
// 404 Handler
// ============================================
app.notFound((c) => c.json({ success: false, error: "Endpoint nicht gefunden" }, 404));

// ============================================
// Global Error Handler
// ============================================
app.onError((err, c) => {
  if (c.env.SENTRY_DSN) {
    const sentry = new Toucan({ dsn: c.env.SENTRY_DSN, request: c.req.raw });
    sentry.captureException(err);
  }
  return c.json(
    {
      success: false,
      error: c.env.ENVIRONMENT === "production" ? "Interner Serverfehler" : err.message,
    },
    500
  );
});

// ============================================
// Scheduled Handler (cron triggers)
// ============================================
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const trigger = new Date(event.scheduledTime);
        const triggerHour = trigger.getUTCHours();
        const triggerMinute = trigger.getUTCMinutes();

        // OA-CP + OA-VA: daily at 02:30 UTC
        if (triggerHour === 2 && triggerMinute === 30) {
          try {
            log("info", "oa_cp_start", { scheduledTime: trigger.toISOString() });
            const cpReport = await runCP(env);
            log("info", "oa_cp_complete", {
              endpoints_ok: cpReport.summary.endpoints_ok,
              endpoints_failed: cpReport.summary.endpoints_failed,
              db_total_rows: cpReport.summary.db_total_rows,
            });

            // OA-VA runs immediately after CP
            log("info", "oa_va_start", {});
            const vaReport = await runVA(env);
            log("info", "oa_va_complete", {
              verdict: vaReport.verdict,
              issues: vaReport.issues.length,
              uptime_pct: vaReport.uptime_pct,
              growth_direction: vaReport.growth_trend.direction,
            });
          } catch (err) {
            log("error", "oa_agents_failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return; // OA agents only, don't run backup in this trigger
        }

        // Onboarding email sequence: daily at 10:00 UTC (≈ 11:00/12:00 CET)
        if (triggerHour === 10 && triggerMinute === 0) {
          try {
            log("info", "onboarding_dispatch_start", { scheduledTime: trigger.toISOString() });
            const report = await runOnboardingDispatch(env);
            log("info", "onboarding_dispatch_complete", {
              scanned: report.scanned,
              sent: report.sent,
              skipped: report.skipped,
              failed: report.failed,
              perDay: report.perDay,
            });
          } catch (err) {
            log("error", "onboarding_dispatch_failed", {
              error: err instanceof Error ? err.message : String(err),
            });
          }
          return;
        }

        try {
          // Daily backup at 02:00 UTC
          await performBackup(
            [
              { name: "zfbf-db", db: env.DB },
              { name: "bafa_antraege", db: env.BAFA_DB },
            ],
            env.REPORTS
          );
          await cleanupOldBackups(env.REPORTS);

          // GDPR audit log cleanup (90 days)
          await cleanupAuditLogs(env.DB);

          // GDPR data retention cleanup (pass both DBs)
          await cleanupExpiredData(env.DB, env.BAFA_DB);

          // Weekly learning cycle (cron: 0 3 * * 1 - Monday 03:00 UTC)
          if (trigger.getUTCDay() === 1 && trigger.getUTCHours() === 3) {
            log("info", "weekly_learning_cycle_start", {
              scheduledTime: trigger.toISOString(),
            });

            // Query learnings from the last 7 days, grouped by branche
            const recentLearnings = await env.BAFA_CONTENT.prepare(
              `SELECT branche, outcome, feedback, created_at
               FROM bafa_learnings
               WHERE deleted_at IS NULL
                 AND created_at >= datetime('now', '-7 days')
               ORDER BY branche, created_at DESC`
            ).all<{
              branche: string | null;
              outcome: string;
              feedback: string | null;
              created_at: string;
            }>();

            // Aggregate insights per branche
            const branchenMap = new Map<
              string,
              {
                total: number;
                approved: number;
                rejected: number;
                feedbacks: string[];
              }
            >();

            for (const row of recentLearnings.results || []) {
              const key = row.branche || "_unknown";
              const entry = branchenMap.get(key) || {
                total: 0,
                approved: 0,
                rejected: 0,
                feedbacks: [],
              };
              entry.total++;
              if (row.outcome === "approved") entry.approved++;
              else entry.rejected++;
              if (row.feedback) entry.feedbacks.push(row.feedback);
              branchenMap.set(key, entry);
            }

            // Store aggregated learnings in KV per branche
            let branchenProcessed = 0;
            for (const [branche, stats] of branchenMap) {
              const kvPayload = {
                branche,
                period: {
                  from: new Date(Date.now() - 7 * 86400000).toISOString(),
                  to: trigger.toISOString(),
                },
                total: stats.total,
                approved: stats.approved,
                rejected: stats.rejected,
                approvalRate:
                  stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
                recentFeedbacks: stats.feedbacks.slice(0, 20),
                updatedAt: trigger.toISOString(),
              };
              await env.CACHE.put(
                `learnings:${branche}`,
                JSON.stringify(kvPayload),
                { expirationTtl: 60 * 60 * 24 * 14 } // 14 days TTL
              );
              branchenProcessed++;
            }

            log("info", "weekly_learning_cycle_complete", {
              totalLearnings: (recentLearnings.results || []).length,
              branchenProcessed,
            });
          }
        } catch {
          // cron failure - errors surface via Cloudflare dashboard
        }
      })()
    );
  },
};
