// Cron-status KV writer.
//
// Each scheduled handler calls `recordCronRun(env, name, started)` when it
// finishes (ok or error). The value lands in KV under `cron:last:{name}`
// with a 7-day TTL and is read by `/api/admin/cron-status`.
//
// Keeps the write ~1 KB and doesn't touch D1 on the hot path — cron already
// does enough DB work.

export interface CronStatusRecord {
  name: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ok: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

const CRON_STATUS_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function clip(message: string): string {
  return message.length > 500 ? `${message.slice(0, 497)}…` : message;
}

export async function recordCronRun(
  kv: KVNamespace,
  name: string,
  startedAt: Date,
  outcome:
    | { ok: true; meta?: Record<string, unknown> }
    | { ok: false; error: unknown; meta?: Record<string, unknown> },
): Promise<void> {
  const finishedAt = new Date();
  const record: CronStatusRecord = {
    name,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    ok: outcome.ok,
    meta: outcome.meta,
  };
  if (!outcome.ok) {
    const err = outcome.error;
    record.error = clip(
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
  }
  try {
    await kv.put(`cron:last:${name}`, JSON.stringify(record), {
      expirationTtl: CRON_STATUS_TTL_SECONDS,
    });
  } catch {
    // never let a KV hiccup break the cron itself — observability is best-effort
  }
}

export async function readAllCronStatus(
  kv: KVNamespace,
): Promise<CronStatusRecord[]> {
  const { keys } = await kv.list({ prefix: "cron:last:" });
  const records: CronStatusRecord[] = [];
  for (const key of keys) {
    const raw = await kv.get(key.name);
    if (!raw) continue;
    try {
      records.push(JSON.parse(raw) as CronStatusRecord);
    } catch {
      // Skip malformed entries; the TTL will clear them eventually.
    }
  }
  records.sort((a, b) => a.name.localeCompare(b.name));
  return records;
}

// List of cron jobs we expect to see. Used by the admin UI to show
// "MISSING — never ran" rows for jobs that have no status yet.
export const EXPECTED_CRON_JOBS: readonly string[] = [
  "oa-cp",
  "oa-va",
  "onboarding-dispatch",
  "audit-cleanup",
  "retention-cleanup",
  "nightly-backup",
] as const;
