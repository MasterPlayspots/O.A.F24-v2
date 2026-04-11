// OA-CP — OurArk Connection Pflege Agent
// Runs daily via cron. Checks all fund24.io endpoints + DB growth metrics.
// Stores structured report in CACHE KV under oa:cp:latest + oa:cp:history:<date>.
import type { Bindings } from "../types";

interface EndpointCheck {
  url: string;
  expected: number;
  actual: number;
  ok: boolean;
  ms: number;
}

interface GrowthMetric {
  table: string;
  count: number;
  delta: number; // vs previous day
}

interface CPReport {
  timestamp: string;
  endpoints: EndpointCheck[];
  growth: GrowthMetric[];
  summary: {
    endpoints_total: number;
    endpoints_ok: number;
    endpoints_failed: number;
    db_total_rows: number;
  };
}

const FRONTEND_CHECKS = [
  "https://fund24.io/",
  "https://fund24.io/programme",
  "https://fund24.io/berater",
  "https://fund24.io/login",
  "https://fund24.io/foerder-schnellcheck",
];

const API_CHECKS: Array<{ url: string; expected: number }> = [
  { url: "https://api.fund24.io/api/foerdermittel/katalog?limit=1", expected: 200 },
  { url: "https://api.fund24.io/api/netzwerk/berater?pageSize=1", expected: 200 },
];

const GROWTH_TABLES = [
  "berater_profiles",
  "berater_dienstleistungen",
  "berater_foerder_expertise",
  "netzwerk_anfragen",
  "bafa_beratungen",
  "unternehmen",
  "foerdermittel_cases",
  "foerdermittel_profile",
  "bafa_vorlagen",
];

async function checkEndpoint(
  url: string,
  expected: number
): Promise<EndpointCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "OA-CP/1.0" },
      redirect: "follow",
    });
    const ms = Date.now() - start;
    return { url, expected, actual: res.status, ok: res.status === expected, ms };
  } catch {
    return {
      url,
      expected,
      actual: 0,
      ok: false,
      ms: Date.now() - start,
    };
  }
}

async function getGrowthMetrics(
  db: D1Database,
  cache: KVNamespace,
  tables: string[]
): Promise<GrowthMetric[]> {
  const metrics: GrowthMetric[] = [];
  // Load yesterday's counts from KV
  const prevRaw = await cache.get("oa:cp:counts:prev", "json");
  const prev: Record<string, number> = (prevRaw as Record<string, number>) ?? {};

  const current: Record<string, number> = {};
  for (const table of tables) {
    try {
      const row = await db
        .prepare(`SELECT COUNT(*) AS n FROM ${table}`)
        .first<{ n: number }>();
      const count = row?.n ?? 0;
      current[table] = count;
      metrics.push({
        table,
        count,
        delta: count - (prev[table] ?? 0),
      });
    } catch {
      metrics.push({ table, count: -1, delta: 0 });
    }
  }

  // Save today's counts as next day's baseline
  await cache.put("oa:cp:counts:prev", JSON.stringify(current), {
    expirationTtl: 60 * 60 * 48, // 48h TTL
  });

  return metrics;
}

export async function runCP(env: Bindings): Promise<CPReport> {
  // 1. Endpoint health checks
  const endpointResults = await Promise.all([
    ...FRONTEND_CHECKS.map((url) => checkEndpoint(url, 200)),
    ...API_CHECKS.map((c) => checkEndpoint(c.url, c.expected)),
  ]);

  // 2. DB growth metrics
  const growth = await getGrowthMetrics(env.BAFA_DB, env.CACHE, GROWTH_TABLES);

  // 3. Build report
  const ok = endpointResults.filter((e) => e.ok).length;
  const report: CPReport = {
    timestamp: new Date().toISOString(),
    endpoints: endpointResults,
    growth,
    summary: {
      endpoints_total: endpointResults.length,
      endpoints_ok: ok,
      endpoints_failed: endpointResults.length - ok,
      db_total_rows: growth.reduce((s, g) => s + Math.max(0, g.count), 0),
    },
  };

  // 4. Store in KV
  const dateKey = new Date().toISOString().slice(0, 10);
  await env.CACHE.put("oa:cp:latest", JSON.stringify(report), {
    expirationTtl: 60 * 60 * 48,
  });
  await env.CACHE.put(
    `oa:cp:history:${dateKey}`,
    JSON.stringify(report),
    { expirationTtl: 60 * 60 * 24 * 90 } // 90 day retention
  );

  return report;
}
