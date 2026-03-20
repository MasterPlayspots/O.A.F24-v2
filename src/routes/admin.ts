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
