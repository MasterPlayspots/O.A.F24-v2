// OA-VA — OurArk Verteiler Agent
// Runs after OA-CP in the same cron trigger. Validates CP report,
// generates a health verdict, tracks trends, and exposes the combined
// status via GET /api/oa/status.
import type { Bindings } from "../types";

interface VAReport {
  timestamp: string;
  cp_alive: boolean;
  cp_timestamp: string | null;
  verdict: "healthy" | "degraded" | "critical";
  issues: string[];
  growth_trend: {
    total_rows: number;
    total_delta: number;
    direction: "growing" | "stable" | "shrinking";
  };
  uptime_pct: number; // based on endpoint checks
}

export async function runVA(env: Bindings): Promise<VAReport> {
  // 1. Read latest CP report
  const cpRaw = await env.CACHE.get("oa:cp:latest", "json");

  if (!cpRaw) {
    const report: VAReport = {
      timestamp: new Date().toISOString(),
      cp_alive: false,
      cp_timestamp: null,
      verdict: "critical",
      issues: ["OA-CP report not found in KV — CP may not have run"],
      growth_trend: { total_rows: 0, total_delta: 0, direction: "stable" },
      uptime_pct: 0,
    };
    await env.CACHE.put("oa:va:latest", JSON.stringify(report), {
      expirationTtl: 60 * 60 * 48,
    });
    return report;
  }

  const cp = cpRaw as {
    timestamp: string;
    summary: {
      endpoints_total: number;
      endpoints_ok: number;
      endpoints_failed: number;
      db_total_rows: number;
    };
    growth: Array<{ table: string; count: number; delta: number }>;
    endpoints: Array<{ url: string; ok: boolean; ms: number }>;
  };

  // 2. Validate CP is recent (within 2h)
  const cpAge = Date.now() - new Date(cp.timestamp).getTime();
  const cpFresh = cpAge < 2 * 60 * 60 * 1000;
  const issues: string[] = [];

  if (!cpFresh) {
    issues.push(
      `CP report is ${Math.round(cpAge / 3600000)}h old — expected <2h`
    );
  }

  // 3. Check endpoint health
  const uptime =
    cp.summary.endpoints_total > 0
      ? (cp.summary.endpoints_ok / cp.summary.endpoints_total) * 100
      : 0;

  if (cp.summary.endpoints_failed > 0) {
    const failed = cp.endpoints
      .filter((e) => !e.ok)
      .map((e) => e.url);
    issues.push(`${cp.summary.endpoints_failed} endpoint(s) down: ${failed.join(", ")}`);
  }

  // 4. Check for slow endpoints (>3s)
  const slow = cp.endpoints.filter((e) => e.ok && e.ms > 3000);
  if (slow.length > 0) {
    issues.push(
      `${slow.length} endpoint(s) slow (>3s): ${slow.map((e) => `${e.url} ${e.ms}ms`).join(", ")}`
    );
  }

  // 5. Growth trend
  const totalDelta = cp.growth.reduce((s, g) => s + g.delta, 0);
  const direction: "growing" | "stable" | "shrinking" =
    totalDelta > 0 ? "growing" : totalDelta < 0 ? "shrinking" : "stable";

  // 6. Check for tables with -1 count (query error)
  const brokenTables = cp.growth.filter((g) => g.count === -1);
  if (brokenTables.length > 0) {
    issues.push(
      `DB query failed for: ${brokenTables.map((t) => t.table).join(", ")}`
    );
  }

  // 7. Determine verdict
  let verdict: "healthy" | "degraded" | "critical" = "healthy";
  if (cp.summary.endpoints_failed > 0 || !cpFresh) verdict = "degraded";
  if (
    cp.summary.endpoints_failed > cp.summary.endpoints_total / 2 ||
    uptime < 50
  ) {
    verdict = "critical";
  }

  const report: VAReport = {
    timestamp: new Date().toISOString(),
    cp_alive: cpFresh,
    cp_timestamp: cp.timestamp,
    verdict,
    issues,
    growth_trend: {
      total_rows: cp.summary.db_total_rows,
      total_delta: totalDelta,
      direction,
    },
    uptime_pct: Math.round(uptime * 10) / 10,
  };

  // 8. Store
  const dateKey = new Date().toISOString().slice(0, 10);
  await env.CACHE.put("oa:va:latest", JSON.stringify(report), {
    expirationTtl: 60 * 60 * 48,
  });
  await env.CACHE.put(`oa:va:history:${dateKey}`, JSON.stringify(report), {
    expirationTtl: 60 * 60 * 24 * 90,
  });

  return report;
}
