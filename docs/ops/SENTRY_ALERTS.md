# Fund24 — Sentry Alert Rules

**Project:** `o4511178666016768.ingest.de.sentry.io/4511178667065424`
**Status:** Alert rules are configured **in the Sentry UI**, not in repo (Sentry doesn't support
YAML/JSON rule-sync on the free tier). This doc is the **source of truth** for which rules
should be active. Any change in Sentry → update this file in the same PR.

---

## Design principle

**Start with 3 rules, iterate.** Anti-pattern: 20 rules on day 1 → alert fatigue → mute-all →
back to no signal. Add a rule only when it would have caught a real problem in the past.

Channel for all 3 rules: Slack `#fund24-alerts` (set via Sentry Integrations → Slack). If the
Slack integration isn't set up yet, the fallback is the account-holder's email
(`froeba.kevin@gmail.com`) — already the default on the project.

---

## Rule 1 · Error-Rate Spike

**Trigger:** `events.count()` is above `5` in the last `1 minute` (environment = production).
**Why:** Catches noisy new deploys + outage-level issue storms.
**Tune later:** If P95 baseline is 0 errors/min, drop threshold to `3`. If baseline is >5
errors/min (legitimate background noise), raise to `10`.

**Sentry UI path:**
```
Alerts → Create Alert → Number of errors → Custom conditions
 ├─ When: An event is seen
 ├─ If: The issue's environment is 'production'
 ├─ Filter: event.count() > 5 in 1m
 ├─ Then: Send notification to #fund24-alerts
 └─ Rate limit: 1 per 10 min (avoid repeat spam)
```

## Rule 2 · New Issue Group

**Trigger:** A **new** issue group is created (environment = production, level >= error).
**Why:** First-time errors deserve human triage. Repeat errors are handled by Rule 1.
**Tune later:** If v0.dev generated UI spams "React hydration" noise, filter by
`issue.type != hydration_error` when that pattern appears.

**Sentry UI path:**
```
Alerts → Create Alert → Issues → A new issue is created
 ├─ Filter: level >= error · environment = production
 └─ Action: Notify #fund24-alerts
```

## Rule 3 · p95 Performance Regression

**Trigger:** Transaction p95 latency > `2000ms` for 15 consecutive minutes on any
transaction in production.
**Why:** Frontend pages or worker routes that silently double their latency = cache gone,
DB query gone sideways, or worker cold-start issues. 15-min window avoids flapping.
**Tune later:** Per-transaction threshold if `/api/foerdermittel/match` (AI-heavy) is
legitimately slow. Start coarse, narrow once we see the baseline.

**Sentry UI path:**
```
Alerts → Create Alert → Number of events > p95(measurements.lcp)
 ├─ Window: 15 minutes
 ├─ Threshold: > 2000ms
 ├─ Environment: production
 └─ Action: Notify #fund24-alerts
```

---

## Not yet enabled (deliberate)

These would be useful but **not at launch**:

- **Regression on specific transaction** — needs per-route baseline; add in ~4 weeks.
- **Crash-free session rate < 99 %** — needs more traffic than we have at launch.
- **Release-based alert** (new release → error spike) — hooks up once Sentry-CLI releases
  are wired into the deploy workflow. Tracked as a follow-up.

---

## Test procedure (run after enabling each rule)

### Rule 1 — force error spike
```ts
// Temporarily wire a /api/debug/sentry-spike route (not committed)
for (let i = 0; i < 10; i++) Sentry.captureException(new Error('alert-test'))
```
Hit it once. Expect Slack ping within 2 min.

### Rule 2 — force new issue
```ts
Sentry.captureException(new Error(`alert-test-unique-${Date.now()}`))
```
Unique message = new group. Expect Slack ping within 2 min.

### Rule 3 — synthetic slow transaction
```ts
const tx = Sentry.startTransaction({ name: 'alert-test-slow' })
await new Promise(r => setTimeout(r, 3000))
tx.finish()
```
Wait 15 min after 3 such slow tx. Expect Slack ping.

**Delete the debug route after testing.** Committing it is a recipe for real-world alert
fatigue.

---

## Runbook: what to do when an alert fires

| Alert | First check | Escalation |
|---|---|---|
| Rule 1 Error-Rate | Sentry issue detail → stack trace + breadcrumbs | Rollback latest deploy if new release correlates |
| Rule 2 New Issue | Same — but also check if it's a Sentry scrubber false positive | If bot/scan noise, add to `ignoreErrors` in `instrumentation-client.ts` |
| Rule 3 p95 Regression | Cloudflare Observability → request latency breakdown | Check if a cron is competing; worker cold-start? D1 slow query? |

If in doubt, check [`docs/AUDIT.md`](../AUDIT.md) Part V.1.1 (topology) — almost every
regression is traceable to one of the labelled edges.
