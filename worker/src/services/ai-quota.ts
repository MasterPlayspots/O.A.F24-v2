// AI Quota — daily per-user cap on Workers-AI invocations.
//
// Phase-5 audit (TASK-034) found five `/api/check/*` handlers drain
// Workers-AI quota without any user-level cap. This service gives every
// caller-facing AI path a `requireAiQuota()` + `recordAiUsage()` pair so
// a single user cannot burn the shared worker quota.
//
// The middleware is intentionally layered ON TOP of auth — it expects
// `c.get('user')` to be populated by `requireAuth`. Endpoints that must
// call AI without a user (future public paths) should use a separate
// IP-bucketed limiter.
//
// Table: ai_quota_daily (zfbf-db, migration 028).
// Storage: `(user_id, day)` primary key, `calls` counter, `updated_at`
// timestamp. Day is ISO `YYYY-MM-DD` in UTC.
//
// Limit: 50 calls/day/user.
// Exceeded response: 429 + `{ error: 'AI-Tageslimit erreicht', limit, used }`.
//
// Call order in a handler:
//
//   await requireAuth(c, async () => {
//     const quota = await requireAiQuota(c.env, user.id);
//     if (!quota.allowed) return c.json({…}, 429);
//     …AI call…
//     await recordAiUsage(c.env, user.id);
//   });

import type { Bindings } from "../types";

export const AI_QUOTA_PER_DAY = 50;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  limit: number;
  day: string;
}

export async function checkAiQuota(env: Bindings, userId: string): Promise<QuotaCheck> {
  const day = todayUtc();
  const row = await env.DB.prepare(
    "SELECT calls FROM ai_quota_daily WHERE user_id = ? AND day = ?"
  )
    .bind(userId, day)
    .first<{ calls: number }>();
  const used = row?.calls ?? 0;
  return { allowed: used < AI_QUOTA_PER_DAY, used, limit: AI_QUOTA_PER_DAY, day };
}

// Call AFTER the AI invocation succeeded. Uses UPSERT so concurrent calls
// from the same user on the same day don't clobber each other.
export async function recordAiUsage(env: Bindings, userId: string): Promise<void> {
  const day = todayUtc();
  await env.DB.prepare(
    `INSERT INTO ai_quota_daily (user_id, day, calls, updated_at)
     VALUES (?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, day)
     DO UPDATE SET calls = calls + 1, updated_at = datetime('now')`
  )
    .bind(userId, day)
    .run();
}

// Cleanup: delete rows older than 90 days. Called by the daily cron.
export async function cleanupAiQuota(env: Bindings): Promise<number> {
  const res = await env.DB.prepare(
    "DELETE FROM ai_quota_daily WHERE day < date('now', '-90 days')"
  ).run();
  return res.meta?.changes ?? 0;
}
