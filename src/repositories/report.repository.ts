// Report Repository - Data access layer for reports (zfbf-db) and antraege (bafa_antraege)
import type { AntragRow, AntragBausteinRow } from "../types";

// ============================================
// Row types for query results
// ============================================

export interface ReportListItem {
  id: string;
  status: string;
  company_name: string | null;
  branche: string | null;
  unterbranche: string | null;
  is_unlocked: number;
  created_at: string;
  updated_at: string;
}

export interface AntragEnrichment {
  id: string;
  unternehmen_name: string;
  branche_id: string | null;
  antrag_status: string;
  qualitaetsscore: number;
  wortanzahl: number;
  erstellt_am: string | null;
  aktualisiert_am: string | null;
}

export interface AntragExportRow {
  id: string;
  unternehmen_name: string;
  branche_id: string | null;
  status: string;
  qualitaetsscore: number;
  wortanzahl: number;
  erstellt_am: string | null;
}

export interface ReportStatsRow {
  total: number;
  generated: number;
  unlocked: number;
}

export interface AntragStatsRow {
  total: number;
  generated: number;
  paid: number;
}

// ============================================
// Ownership table (zfbf-db / DB)
// ============================================

export interface ReportOwnership {
  id: string;
  user_id: string;
  status: string;
  company_name: string | null;
  branche: string | null;
  unterbranche: string | null;
  is_unlocked: number;
  unlock_payment_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function findByOwner(
  db: D1Database,
  userId: string,
  limit: number,
  offset: number
): Promise<{ reports: ReportListItem[]; total: number }> {
  const [countResult, reportsResult] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) as total FROM reports WHERE user_id = ?")
      .bind(userId)
      .first<{ total: number }>(),
    db
      .prepare(
        "SELECT id, status, company_name, branche, unterbranche, is_unlocked, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?"
      )
      .bind(userId, limit, offset)
      .all<ReportListItem>(),
  ]);
  return {
    reports: reportsResult.results || [],
    total: countResult?.total || 0,
  };
}

export async function findById(
  db: D1Database,
  reportId: string,
  userId?: string
): Promise<ReportOwnership | null> {
  if (userId) {
    return db
      .prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?")
      .bind(reportId, userId)
      .first<ReportOwnership>();
  }
  return db.prepare("SELECT * FROM reports WHERE id = ?").bind(reportId).first<ReportOwnership>();
}

export async function findByIdWithUnlockStatus(
  db: D1Database,
  reportId: string
): Promise<{ id: string; user_id: string; is_unlocked: number } | null> {
  return db
    .prepare("SELECT id, user_id, is_unlocked FROM reports WHERE id = ?")
    .bind(reportId)
    .first<{ id: string; user_id: string; is_unlocked: number }>();
}

export async function findOwnershipCompact(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<{ id: string; is_unlocked: number } | null> {
  return db
    .prepare("SELECT id, is_unlocked FROM reports WHERE id = ? AND user_id = ?")
    .bind(reportId, userId)
    .first<{ id: string; is_unlocked: number }>();
}

export async function findOwnershipForPayment(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<{ id: string; company_name: string } | null> {
  return db
    .prepare("SELECT id, company_name FROM reports WHERE id = ? AND user_id = ?")
    .bind(reportId, userId)
    .first<{ id: string; company_name: string }>();
}

export async function findUserIdByReportId(
  db: D1Database,
  reportId: string
): Promise<{ user_id: string } | null> {
  return db
    .prepare("SELECT user_id FROM reports WHERE id = ?")
    .bind(reportId)
    .first<{ user_id: string }>();
}

export async function createOwnership(
  db: D1Database,
  id: string,
  userId: string,
  status: string,
  companyName?: string | null,
  branche?: string | null,
  unterbranche?: string | null
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO reports (id, user_id, status, company_name, branche, unterbranche) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, userId, status, companyName || null, branche || null, unterbranche || null)
    .run();
}

export async function updateOwnershipStatus(
  db: D1Database,
  reportId: string,
  status: string
): Promise<void> {
  await db
    .prepare("UPDATE reports SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(status, reportId)
    .run();
}

export async function unlockReport(
  db: D1Database,
  reportId: string,
  paymentId: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE reports SET is_unlocked=1, unlock_payment_id=?, updated_at=datetime('now') WHERE id=?"
    )
    .bind(paymentId, reportId)
    .run();
}

export async function lockReport(db: D1Database, reportId: string): Promise<void> {
  await db.prepare("UPDATE reports SET is_unlocked = 0 WHERE id = ?").bind(reportId).run();
}

export async function finalizeReport(
  db: D1Database,
  reportId: string,
  userId: string
): Promise<void> {
  await db
    .prepare("UPDATE reports SET status = 'finalisiert' WHERE id = ? AND user_id = ?")
    .bind(reportId, userId)
    .run();
}

// ============================================
// Antrag table (bafa_antraege / BAFA_DB)
// ============================================

export async function findAntragName(
  bafaDb: D1Database,
  antragId: string
): Promise<{ unternehmen_name: string } | null> {
  return bafaDb
    .prepare("SELECT unternehmen_name FROM antraege WHERE id = ?")
    .bind(antragId)
    .first<{ unternehmen_name: string }>();
}

export async function loadAntragWithBausteine(
  bafaDb: D1Database,
  antragId: string
): Promise<{ antrag: AntragRow; bausteine: AntragBausteinRow[] } | null> {
  const [antragResult, bausteineResult] = await bafaDb.batch([
    bafaDb.prepare("SELECT * FROM antraege WHERE id = ?").bind(antragId),
    bafaDb.prepare("SELECT * FROM antrag_bausteine WHERE antrag_id = ? ORDER BY id").bind(antragId),
  ]);
  const antrag = antragResult?.results?.[0] as AntragRow | undefined;
  if (!antrag) return null;
  return { antrag, bausteine: (bausteineResult?.results ?? []) as AntragBausteinRow[] };
}

export async function createAntrag(
  bafaDb: D1Database,
  id: string,
  brancheId: string,
  companyName: string,
  companyData?: {
    unternehmen_typ?: string | null;
    unternehmen_mitarbeiter?: number | null;
    unternehmen_umsatz?: string | null;
    unternehmen_hauptproblem?: string | null;
  },
  beratungsschwerpunkte?: string | null
): Promise<void> {
  await bafaDb
    .prepare(
      `INSERT INTO antraege (id, branche_id, unternehmen_name, unternehmen_typ, unternehmen_mitarbeiter,
      unternehmen_umsatz, unternehmen_hauptproblem, beratungsschwerpunkte, status, erstellt_am, aktualisiert_am)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'vorschau', datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      brancheId,
      companyName,
      companyData?.unternehmen_typ || null,
      companyData?.unternehmen_mitarbeiter || null,
      companyData?.unternehmen_umsatz || null,
      companyData?.unternehmen_hauptproblem || null,
      beratungsschwerpunkte || null
    )
    .run();
}

export async function createDraftAntrag(bafaDb: D1Database, id: string): Promise<void> {
  await bafaDb
    .prepare(
      "INSERT INTO antraege (id, unternehmen_name, status, erstellt_am, aktualisiert_am) VALUES (?, '', 'vorschau', datetime('now'), datetime('now'))"
    )
    .bind(id)
    .run();
}

export async function updateAntragStatus(
  bafaDb: D1Database,
  antragId: string,
  status: string,
  extra?: { bezahlt?: boolean; wortanzahl?: number }
): Promise<void> {
  if (extra?.bezahlt) {
    await bafaDb
      .prepare(
        "UPDATE antraege SET status = ?, bezahlt_am = datetime('now'), aktualisiert_am = datetime('now') WHERE id = ?"
      )
      .bind(status, antragId)
      .run();
  } else if (extra?.wortanzahl !== undefined) {
    await bafaDb
      .prepare(
        "UPDATE antraege SET status = ?, wortanzahl = ?, aktualisiert_am = datetime('now') WHERE id = ?"
      )
      .bind(status, extra.wortanzahl, antragId)
      .run();
  } else {
    await bafaDb
      .prepare("UPDATE antraege SET status = ?, aktualisiert_am = datetime('now') WHERE id = ?")
      .bind(status, antragId)
      .run();
  }
}

export async function resetAntragPayment(bafaDb: D1Database, antragId: string): Promise<void> {
  await bafaDb
    .prepare(
      "UPDATE antraege SET status = 'vorschau', bezahlt_am = NULL, aktualisiert_am = datetime('now') WHERE id = ?"
    )
    .bind(antragId)
    .run();
}

export async function enrichReportsWithAntraege(
  bafaDb: D1Database,
  reportIds: string[]
): Promise<Map<string, AntragEnrichment>> {
  if (reportIds.length === 0) return new Map();
  const placeholders = reportIds.map(() => "?").join(",");
  const result = await bafaDb
    .prepare(
      `SELECT id, unternehmen_name, branche_id, status as antrag_status, qualitaetsscore, wortanzahl, erstellt_am, aktualisiert_am FROM antraege WHERE id IN (${placeholders})`
    )
    .bind(...reportIds)
    .all<AntragEnrichment>();
  return new Map((result.results || []).map((a) => [a.id, a]));
}

// ============================================
// Report IDs for user (GDPR)
// ============================================

export async function findReportIdsByUser(db: D1Database, userId: string): Promise<string[]> {
  const result = await db
    .prepare("SELECT id FROM reports WHERE user_id = ?")
    .bind(userId)
    .all<{ id: string }>();
  return (result.results || []).map((r) => r.id);
}

// ============================================
// GDPR export data
// ============================================

export async function findAntraegeForExport(
  bafaDb: D1Database,
  reportIds: string[]
): Promise<AntragExportRow[]> {
  if (reportIds.length === 0) return [];
  const placeholders = reportIds.map(() => "?").join(",");
  const result = await bafaDb
    .prepare(
      `SELECT id, unternehmen_name, branche_id, status, qualitaetsscore, wortanzahl, erstellt_am FROM antraege WHERE id IN (${placeholders})`
    )
    .bind(...reportIds)
    .all<AntragExportRow>();
  return result.results || [];
}

export async function invalidateDownloadTokens(
  bafaDb: D1Database,
  reportIds: string[]
): Promise<void> {
  if (reportIds.length === 0) return;
  const placeholders = reportIds.map(() => "?").join(",");
  await bafaDb
    .prepare(
      `UPDATE download_tokens SET gueltig_bis = datetime('now') WHERE antrag_id IN (${placeholders})`
    )
    .bind(...reportIds)
    .run();
}

// ============================================
// Admin stats
// ============================================

export async function getReportStats(db: D1Database): Promise<ReportStatsRow> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='generiert' THEN 1 ELSE 0 END) as generated, SUM(CASE WHEN is_unlocked=1 THEN 1 ELSE 0 END) as unlocked FROM reports"
    )
    .first<ReportStatsRow>();
  return row || { total: 0, generated: 0, unlocked: 0 };
}

export async function getAntragStats(bafaDb: D1Database): Promise<AntragStatsRow> {
  const row = await bafaDb
    .prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='generiert' THEN 1 ELSE 0 END) as generated, SUM(CASE WHEN status='bezahlt' THEN 1 ELSE 0 END) as paid FROM antraege"
    )
    .first<AntragStatsRow>();
  return row || { total: 0, generated: 0, paid: 0 };
}

export async function getBausteinCount(bafaDb: D1Database): Promise<number> {
  const row = await bafaDb
    .prepare("SELECT COUNT(*) as total FROM antrag_bausteine")
    .first<{ total: number }>();
  return row?.total || 0;
}
