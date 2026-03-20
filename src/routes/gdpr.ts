// GDPR Routes - DSGVO Art. 15 Export, Art. 17 Deletion
// Uses BAFA_DB for antraege and download_tokens
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";
import { requireAuth } from "../middleware/auth";
import { writeAuditLog } from "../services/audit";
import * as UserRepo from "../repositories/user.repository";
import * as ReportRepo from "../repositories/report.repository";

const gdpr = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// GET /export - DSGVO Art. 15: Right of access (Auskunftsrecht)
gdpr.get("/export", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const db = c.env.DB;
  const bafaDb = c.env.BAFA_DB;

  const gdprData = await UserRepo.getGdprExportData(db, userId);

  // Enrich with antrag data from BAFA_DB
  const reportIds = gdprData.reports.map((r) => r.id);
  const antraegeData = await ReportRepo.findAntraegeForExport(bafaDb, reportIds);

  const exportData = {
    exportedAt: new Date().toISOString(),
    dsgvoArticle: "Art. 15 DSGVO - Auskunftsrecht",
    user: gdprData.user,
    reports: gdprData.reports,
    antraege: antraegeData,
    payments: gdprData.payments,
    orders: gdprData.orders,
    promoRedemptions: gdprData.promoRedemptions,
    recentAuditLogs: gdprData.auditLogs,
  };

  await writeAuditLog(db, {
    userId,
    eventType: "gdpr_export",
    ip: c.req.header("CF-Connecting-IP"),
  });

  return c.json({ success: true, data: exportData }, 200, {
    "Content-Disposition": `attachment; filename="dsgvo-export-${new Date().toISOString().slice(0, 10)}.json"`,
  });
});

// DELETE /account - DSGVO Art. 17: Right to erasure (Recht auf Löschung)
gdpr.delete("/account", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const db = c.env.DB;
  const bafaDb = c.env.BAFA_DB;

  const deletedEmail = `deleted-${crypto.randomUUID().slice(0, 8)}@deleted.local`;

  // Get user's report IDs for BAFA_DB cleanup
  const reportIds = await ReportRepo.findReportIdsByUser(db, userId);

  // Soft-delete user and anonymize PII in zfbf-db
  // Keep payment records for HGB 10-year retention (Handelsgesetzbuch §257)
  await UserRepo.anonymizeUser(db, userId, deletedEmail);

  // Invalidate download tokens in BAFA_DB for user's antraege
  await ReportRepo.invalidateDownloadTokens(bafaDb, reportIds);

  await writeAuditLog(db, {
    userId,
    eventType: "gdpr_deletion",
    detail: "Account anonymized per Art. 17 DSGVO",
  });

  return c.json({
    success: true,
    message:
      "Ihr Konto wurde gelöscht und Ihre Daten anonymisiert. Zahlungsdaten werden gemäß HGB §257 aufbewahrt.",
  });
});

// POST /privacy-consent - Record privacy policy acceptance
gdpr.post("/privacy-consent", requireAuth, async (c) => {
  const userId = c.get("user").id;
  await UserRepo.acceptPrivacy(c.env.DB, userId);
  return c.json({ success: true, message: "Datenschutzerklärung akzeptiert" });
});

export { gdpr };
