// Admin Routes - Audit Logs, Users, Stats
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { AUDIT_EVENTS } from "../types";
import { requireAuth, requireRole } from "../middleware/auth";
import { queryAuditLogs, cleanupAuditLogs, writeAuditLog } from "../services/audit";
import * as UserRepo from "../repositories/user.repository";
import * as ReportRepo from "../repositories/report.repository";
import * as OrderRepo from "../repositories/order.repository";

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();
admin.use("/*", requireAuth, requireRole("admin"));

// GET /audit-logs
admin.get("/audit-logs", async (c) => {
  const q = c.req.query();
  const result = await queryAuditLogs(c.env.DB, {
    userId: q.userId,
    eventType: q.eventType,
    from: q.from,
    to: q.to,
    page: q.page ? parseInt(q.page) : undefined,
    limit: q.limit ? parseInt(q.limit) : undefined,
  });
  return c.json({ success: true, ...result });
});

// POST /audit-logs/cleanup
admin.post("/audit-logs/cleanup", async (c) => {
  const deleted = await cleanupAuditLogs(c.env.DB);
  return c.json({ success: true, deletedCount: deleted });
});

// GET /users
admin.get("/users", async (c) => {
  const page = Math.min(10000, Math.max(1, parseInt(c.req.query("page") || "1") || 1));
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50") || 50), 100);
  const offset = (page - 1) * limit;
  const { users, total } = await UserRepo.listUsers(c.env.DB, limit, offset);
  return c.json({ success: true, users, total, page, limit });
});

// PATCH /users/:id (profile update)
admin.patch("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const body = await c.req.json();
  const allowed: (keyof UserRepo.UpdateProfileParams)[] = [
    "first_name",
    "last_name",
    "company",
    "phone",
    "email",
  ];
  const params: UserRepo.UpdateProfileParams = {};
  for (const key of allowed) {
    if (key in body) {
      (params as Record<string, unknown>)[key] = body[key];
    }
  }
  if (Object.keys(params).length === 0) {
    return c.json({ success: false, error: "Keine Felder zum Aktualisieren" }, 400);
  }
  await UserRepo.updateProfile(c.env.DB, userId, params);
  await writeAuditLog(c.env.DB, {
    userId: c.get("user").id,
    eventType: AUDIT_EVENTS.ROLE_CHANGE,
    detail: `profile update ${userId}: ${Object.keys(params).join(", ")}`,
  });
  return c.json({ success: true });
});

// PATCH /users/:id/role
admin.patch("/users/:id/role", async (c) => {
  const { role } = await c.req.json();
  if (!["user", "admin"].includes(role))
    return c.json({ success: false, error: "Ungültige Rolle" }, 400);
  await UserRepo.updateRole(c.env.DB, c.req.param("id"), role);
  await writeAuditLog(c.env.DB, {
    userId: c.get("user").id,
    eventType: AUDIT_EVENTS.ROLE_CHANGE,
    detail: `${c.req.param("id")} → ${role}`,
  });
  return c.json({ success: true });
});

// DELETE /users/:id (soft-delete: anonymize + set deleted_at)
admin.delete("/users/:id", async (c) => {
  const targetId = c.req.param("id");
  const adminUser = c.get("user");

  // Prevent self-deletion
  if (targetId === adminUser.id) {
    return c.json({ success: false, error: "Eigenen Account kann man nicht loeschen" }, 400);
  }

  // Check target user exists
  const target = await UserRepo.findById(c.env.DB, targetId);
  if (!target) {
    return c.json({ success: false, error: "Benutzer nicht gefunden" }, 404);
  }

  // Soft-delete via anonymization (GDPR-compliant)
  const deletedEmail = `deleted+${targetId.slice(0, 8)}@removed.local`;
  await UserRepo.anonymizeUser(c.env.DB, targetId, deletedEmail);

  await writeAuditLog(c.env.DB, {
    userId: adminUser.id,
    eventType: AUDIT_EVENTS.USER_DELETE,
    detail: `soft-deleted user ${targetId} (was: ${target.email})`,
  });

  return c.json({ success: true });
});

// GET /stats
admin.get("/stats", async (c) => {
  const [userStats, reportStats, paymentStats, activePromos, antragStats, bausteinCount] =
    await Promise.all([
      UserRepo.getUserStats(c.env.DB),
      ReportRepo.getReportStats(c.env.DB),
      OrderRepo.getPaymentStats(c.env.DB),
      OrderRepo.getActivePromoCount(c.env.DB),
      ReportRepo.getAntragStats(c.env.BAFA_DB),
      ReportRepo.getBausteinCount(c.env.BAFA_DB),
    ]);

  return c.json({
    success: true,
    stats: {
      users: userStats,
      reports: reportStats,
      antraege: antragStats,
      bausteine: { total: bausteinCount },
      payments: paymentStats,
      activePromos,
    },
  });
});

// GET /check-foerdermittel — batch URL check of all aktiv programs
admin.get("/check-foerdermittel", async (c) => {
  const batch = parseInt(c.req.query("batch") || "0");
  const batchSize = 50;
  const offset = batch * batchSize;
  const foerderDb = c.env.FOERDER_DB;

  const programs = await foerderDb
    .prepare(
      "SELECT id, url FROM foerderprogramme WHERE status = 'aktiv' AND url IS NOT NULL ORDER BY id LIMIT ? OFFSET ?"
    )
    .bind(batchSize, offset)
    .all();

  if (!programs.results?.length) {
    const counts = await foerderDb
      .prepare("SELECT status, COUNT(*) as anzahl FROM foerderprogramme GROUP BY status")
      .all();
    return c.json({ done: true, batch, summary: counts.results });
  }

  const results = await Promise.all(
    (programs.results as { id: number; url: string }[]).map(async (p) => {
      try {
        const res = await fetch(p.url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
        });
        return { id: p.id, status: res.status };
      } catch {
        return { id: p.id, status: 0 };
      }
    })
  );

  const dead = results.filter((r) => r.status === 404 || r.status === 410);
  for (const d of dead) {
    await foerderDb
      .prepare("UPDATE foerderprogramme SET status = 'abgelaufen' WHERE id = ?")
      .bind(d.id)
      .run();
  }

  return c.json({
    batch,
    checked: results.length,
    alive: results.filter((r) => r.status === 200).length,
    dead: dead.map((d) => d.id),
    errors: results.filter((r) => r.status !== 200 && r.status !== 404 && r.status !== 410).length,
    nextBatch: batch + 1,
  });
});

// ============================================================
// Email Outbox — list + retry (admin only)
// Table: bafa_antraege.email_outbox (columns: id, to_addr, from_addr,
// subject, status, last_error, sent_at, created_at, attempts, ...)
// ============================================================

interface EmailOutboxRow {
  id: string;
  to_addr: string;
  from_addr: string;
  subject: string;
  status: string;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
  attempts: number;
}

const EMAIL_OUTBOX_STATUSES = new Set(["queued", "sending", "sent", "failed"]);

admin.get("/email-outbox", async (c) => {
  const status = c.req.query("status");
  const limit = Math.min(Math.max(1, parseInt(c.req.query("limit") || "50") || 50), 200);
  const offset = Math.max(0, parseInt(c.req.query("offset") || "0") || 0);

  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (status && EMAIL_OUTBOX_STATUSES.has(status)) {
    conds.push("status = ?");
    params.push(status);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const rows = await c.env.BAFA_DB
    .prepare(
      `SELECT id, to_addr, from_addr, subject, status, last_error, sent_at, created_at, attempts
         FROM email_outbox
         ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all<EmailOutboxRow>();

  const results = (rows.results ?? []).map((r) => ({
    id: r.id,
    to_email: r.to_addr,
    to: r.to_addr,
    from_email: r.from_addr,
    subject: r.subject,
    status: r.status,
    error: r.last_error,
    sent_at: r.sent_at,
    created_at: r.created_at,
    attempts: r.attempts,
  }));

  return c.json({ success: true, results, limit, offset });
});

admin.post("/email-outbox/:id/retry", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.BAFA_DB
    .prepare("SELECT id, status FROM email_outbox WHERE id = ?")
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!row) return c.json({ success: false, error: "Email nicht gefunden" }, 404);
  if (row.status !== "failed") {
    return c.json(
      { success: false, error: "Nur fehlgeschlagene Emails koennen erneut versendet werden" },
      400
    );
  }

  await c.env.BAFA_DB
    .prepare(
      `UPDATE email_outbox
          SET status = 'queued',
              last_error = NULL,
              scheduled_at = datetime('now')
        WHERE id = ?`
    )
    .bind(id)
    .run();

  const user = c.get("user");
  await writeAuditLog(c.env.DB, {
    userId: user.id,
    eventType: "email_outbox_retry",
    detail: id,
    ip: c.req.header("CF-Connecting-IP"),
  });

  return c.json({ success: true, ok: true });
});

export { admin };
