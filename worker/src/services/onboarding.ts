// Onboarding email sequence dispatcher.
// Triggered daily via cron. For each verified user registered N days
// ago (N ∈ {0, 3, 7}), send the role-specific sequence mail unless
// already sent (tracked in users.onboarding_emails_sent as JSON array).
//
// The DB ALTER was applied out-of-band; if the column is missing the
// dispatcher logs and exits cleanly so a missed migration doesn't
// break the cron handler.
import type { Bindings } from "../types";
import { sendOnboardingEmail } from "./email";

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  role: string;
  created_at: string;
  onboarding_emails_sent: string | null;
}

const TARGET_DAYS = [0, 3, 7] as const;
type Day = (typeof TARGET_DAYS)[number];

function dayOffset(now: Date, target: Day): { start: string; end: string } {
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startDate = new Date(startOfToday);
  startDate.setUTCDate(startOfToday.getUTCDate() - target);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 1);
  return { start: startDate.toISOString(), end: endDate.toISOString() };
}

function parseSentArray(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

interface DispatchReport {
  ranAt: string;
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  perDay: Record<string, number>;
}

export async function runOnboardingDispatch(
  env: Pick<Bindings, "DB" | "RESEND_API_KEY">,
  opts: { dryRun?: boolean; now?: Date } = {}
): Promise<DispatchReport> {
  const now = opts.now ?? new Date();
  const dryRun = !!opts.dryRun;
  const report: DispatchReport = {
    ranAt: now.toISOString(),
    scanned: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    perDay: { "0": 0, "3": 0, "7": 0 },
  };

  if (!env.RESEND_API_KEY && !dryRun) return report;

  for (const day of TARGET_DAYS) {
    const { start, end } = dayOffset(now, day);
    const result = await env.DB
      .prepare(
        `SELECT id, email, first_name, role, created_at, onboarding_emails_sent
           FROM users
          WHERE email_verified = 1
            AND deleted_at IS NULL
            AND created_at >= ?
            AND created_at < ?`
      )
      .bind(start, end)
      .all<UserRow>()
      .catch(() => null);

    if (!result?.results) continue;

    for (const u of result.results) {
      report.scanned++;
      const sent = parseSentArray(u.onboarding_emails_sent);
      if (sent.includes(day)) {
        report.skipped++;
        continue;
      }
      if (!u.email || (u.role !== "unternehmen" && u.role !== "berater")) {
        report.skipped++;
        continue;
      }
      if (dryRun) {
        report.sent++;
        report.perDay[String(day)]++;
        continue;
      }
      const ok = await sendOnboardingEmail(
        env.RESEND_API_KEY,
        u.role,
        day,
        u.email,
        u.first_name || "",
      );
      if (ok) {
        sent.push(day);
        await env.DB
          .prepare("UPDATE users SET onboarding_emails_sent = ? WHERE id = ?")
          .bind(JSON.stringify(sent), u.id)
          .run()
          .catch(() => null);
        report.sent++;
        report.perDay[String(day)]++;
      } else {
        report.failed++;
      }
    }
  }

  return report;
}
