# Fund24 — Monitoring Runbook

**Scope:** the 4 observability surfaces set up by PR `ops/monitoring-hardening`. Each has a purpose, a failure mode, and a remediation path.

---

## Quick map

| Block | Surface | Where to look | Configured in |
|---|---|---|---|
| **A** | Sentry alerts | Slack `#fund24-alerts` (when wired) · Sentry UI · email fallback | Sentry UI — mirror doc in [`SENTRY_ALERTS.md`](./SENTRY_ALERTS.md) |
| **B** | Uptime probe | GitHub Actions tab → `Uptime` workflow · every 5 min | [`.github/workflows/uptime.yml`](../../.github/workflows/uptime.yml) |
| **C** | Weekly health report | `docs/ops/HEALTH_REPORTS/YYYY-MM-DD.md` committed every Monday 07:00 UTC | [`.github/workflows/weekly-health.yml`](../../.github/workflows/weekly-health.yml) |
| **D** | Cron-status dashboard | `https://fund24.io/admin/cron-status` (role=admin) | `worker/src/services/cron-status.ts` + `worker/src/routes/admin.ts` + `app/admin/cron-status/page.tsx` |

---

## A · Sentry alerts

See [`SENTRY_ALERTS.md`](./SENTRY_ALERTS.md) for the 3 rules and the test
procedure. Rules are configured **in the Sentry UI**, not in this repo — the
doc is the source-of-truth if the rules ever diverge.

**Triage when one fires:** runbook table at the bottom of `SENTRY_ALERTS.md`.

**Slack wiring (one-time):** Sentry → Settings → Integrations → Slack → install
into `#fund24-alerts`. Until then, alerts go to the account-holder's email.

---

## B · Uptime probe

- **Cadence:** GitHub cron `*/5 * * * *` (every 5 min; expect ±15 min drift during GH Actions peak).
- **Probes:**
  - `https://api.fund24.io/api/health` → must be HTTP 200 with `"status":"healthy"`.
  - `https://fund24.io/` → must be HTTP 200.
  - `https://fund24.io/login` → must be HTTP 200 (client-page sanity).
- **Failure mode:** workflow run is marked `failure` in the GH Actions tab.
  - If `SLACK_WEBHOOK_URL` secret is set: Slack ping with run URL.
  - If not: you'll see it on the next `gh pr list` / GH email digest.

### Tighter SLA (optional upgrades)

- **Cloudflare Health Checks** (CF dashboard → Traffic → Health Checks): 10 s
  interval, paid plan. Can auto-page on failure. Not wired today.
- **BetterStack free tier:** 10 monitors at 3-min interval, with phone call on
  failure. Free plan, 5-min setup.
- **Checkly:** better for multi-step Playwright flows, paid.

### Manual probe

```bash
curl -s https://api.fund24.io/api/health | jq
curl -sI https://fund24.io | head -3
```

---

## C · Weekly health report

- **Cadence:** Monday 07:00 UTC (~09:00 CEST). Manually triggerable via
  GitHub Actions tab → `Weekly Health Report` → **Run workflow**.
- **What it gathers:**
  - D1 size + table count per bound database (5 DBs).
  - `npm audit --production` summary for root + worker.
  - CI fail rate on `main` for the last 7 days.
  - Last 5 Deploy-Workers runs (conclusion + title + date).
- **Output:** commits `docs/ops/HEALTH_REPORTS/YYYY-MM-DD.md` back to `main`
  (using `github-actions[bot]` identity). Also appears in the workflow run
  summary (no clone needed to read it).
- **Slack:** posts a link to the committed report if `SLACK_WEBHOOK_URL` is set.

### What to do if a Monday report shows a regression

1. Open the latest report in `docs/ops/HEALTH_REPORTS/`.
2. Compare to prior week (same directory, previous file).
3. Common patterns:
   - **npm audit HIGH appeared** → run the fix described in
     `docs/analysis/POST_PHASE2_AUDIT.md#N-002` and file a security PR.
   - **CI fail rate > 20 %** → look at recent runs; usually one flaky test.
   - **D1 size jumped > 50 % in a week** → possible unbounded table
     (audit_logs? cron-status KV leak?). Check retention cron output in
     block **D**.

### Secrets required

- `CLOUDFLARE_API_TOKEN` (already wired, used by deploy-workers).
- `GITHUB_TOKEN` (auto-provided by the runner).
- `SLACK_WEBHOOK_URL` *(optional — only for the Slack ping)*.

---

## D · Cron-status dashboard

- **URL (prod):** `https://fund24.io/admin/cron-status`
- **Linked from:** admin dashboard home (quick-links block).
- **Backend:** `GET /api/admin/cron-status` (auth: blanket `requireAuth + requireRole('admin')` on the whole `admin` router).
- **Data source:** KV `CACHE` namespace, keys `cron:last:{job}`, 7-day TTL. Each
  value is a `CronStatusRecord` written by
  [`worker/src/services/cron-status.ts`](../../worker/src/services/cron-status.ts) at the end of every scheduled handler.

### Expected jobs

| Job | Cron | Writer |
|---|---|---|
| `oa-cp` | 02:30 daily | `services/oa-cp.ts` |
| `oa-va` | 02:30 daily (runs right after `oa-cp`) | `services/oa-va.ts` |
| `onboarding-dispatch` | 10:00 daily | `services/onboarding.ts` |
| `nightly-backup` | 02:00 daily | `services/backup.ts` |
| `audit-cleanup` | Monday 03:00 | `services/audit.ts` |
| `retention-cleanup` | Monday 03:00 | `services/retention.ts` |

The list lives in `EXPECTED_CRON_JOBS` in `services/cron-status.ts` — add new
crons there if you add triggers to `wrangler.toml`.

### Reading the UI

- **Green "OK":** last run finished without throwing. `meta` column has job-specific counters.
- **Red "FAILED":** last run threw; `error` column has the message (first 500 chars).
- **Grey "MISSING":** no KV entry in the last 7 days. Either the job hasn't run
  yet after a redeploy, or the cron isn't firing at all — check CF dashboard →
  Worker → Triggers.

### Testing after deploy

```bash
# Trigger any admin user's JWT
curl -s -H "Authorization: Bearer <admin-jwt>" \
  https://api.fund24.io/api/admin/cron-status | jq
# Expect: { success: true, jobs: [{name:"oa-cp", status:"ok"|"missing", …}, …] }
```

Then visit `/admin/cron-status` in the browser.

---

## What is *not* covered

These would be nice-to-haves. Each is scoped small enough to pick up in a
~30-min PR when needed:

- **Release-tagged Sentry events** — wire `SENTRY_AUTH_TOKEN` into the worker deploy workflow to post release markers. Makes "regression since release N" alerts possible.
- **Synthetic Playwright flows** (register → login → foerder-check → logout) — no visual regression catch today. Uptime probes are shallow; a v0.dev redesign could silently break the login form and uptime would still be green.
- **D1 row-count anomaly alerts** — `users.count` dropping > 5 % week-over-week should page. Currently only visible in the weekly report; not an alert.
- **Worker CPU time budget** — Cloudflare Observability has the data but no
  alert rule configured. Add one via the CF dashboard once we have 2-3 weeks
  of baseline.
- **R2 object-count trend** — `bafa-reports` + `fund24-bafa-certs` buckets. If
  upload traffic stops suddenly (object count flat for 48 h) that's a signal.

---

## History / change log

| Date | Change |
|---|---|
| 2026-04-15 | Initial setup — all 4 blocks in one PR (`ops/monitoring-hardening`). |
