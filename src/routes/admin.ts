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

export { admin };
