# Migration Checklist — Nacht 4 Schema Consolidation

Runbook for applying migrations **033** and **034** in production. Do not
skip steps. Expected wall-clock time: 15-25 min (5 min per DB backup,
5 min apply, 10 min smoke-test).

---

## Pre-Migration (before any `wrangler d1 migrations apply`)

- [ ] SCHEMA_CONSOLIDATION_PLAN.md reviewed and agreed on
- [ ] PR merged to `main`
- [ ] `cd worker/ && wrangler deploy` has shipped the main worker with
      no code changes to user/foerdermittel code paths (confirm
      deploy SHA matches PR head)
- [ ] Sentry alert rules for "no such table" errors enabled
      (see `docs/ops/SENTRY_ALERTS.md` if that runbook exists)
- [ ] Announce a 15 min maintenance window on #fund24-ops

## Backup (mandatory)

```bash
cd worker/

# Two backups, independent. Keep them for 30 days minimum.
wrangler d1 export bafa_antraege --output backup-bafa-$(date -u +%Y%m%dT%H%M%S).sql --remote
wrangler d1 export zfbf-db       --output backup-zfbf-$(date -u +%Y%m%dT%H%M%S).sql --remote

# Verify file sizes are non-zero and reasonable (tens of MB expected).
ls -lah backup-*.sql
```

## Schema migration — apply 033 + 034

```bash
# 033: drop phantom users from bafa_antraege
wrangler d1 execute bafa_antraege \
  --file worker/db/migrations/033-drop-phantom-users-bafa.sql \
  --remote

# 034: drop 8 phantom foerdermittel_* tables from zfbf-db
wrangler d1 execute zfbf-db \
  --file worker/db/migrations/034-drop-phantom-foerdermittel-zfbf.sql \
  --remote
```

Each command should return `Rows written: 0` with a `[✓]` symbol and no
error — these are pure DDL.

## Smoke test (within 10 min of apply)

Run each of the following against production. If any one fails, see
**Rollback** below.

- [ ] **Auth cycle.** Sign up with a new email → verify → log in → open
      `/dashboard/unternehmen`. Expected: dashboard loads without errors.
- [ ] **Existing users log in.** Pick two known accounts (one unternehmen,
      one berater), log in. Expected: both land on their role dashboard.
- [ ] **Admin dashboard.** Log in as admin, open `/admin`. The "Nutzer"
      KPI card should render a non-null integer. The "Checks heute" card
      should also render (that reads CHECK_DB, unrelated to our drops).
- [ ] **Fördercheck.** Start a new check at `/foerdercheck`, submit the
      form. Expected: redirects to `/foerdercheck/:sessionId/chat`. Rows
      land in `foerdermittel_profile` + `foerdermittel_cases` on
      `BAFA_DB`.
- [ ] **Anträge.** Open `/dashboard/unternehmen/antraege` (or the
      `/antraege/:id` detail). Expected: list loads, detail loads.
- [ ] **Sentry:** watch for any new errors in the 10 min window,
      especially with the string `no such table: users` or
      `no such table: foerdermittel_`. Neither should appear.
- [ ] **Worker logs (Cloudflare dashboard):** no new 500s above baseline.

## 48 h monitoring

- [ ] Day 1: quick Sentry check at T+3 h, T+12 h
- [ ] Day 2: full audit — any "table" errors in Sentry?
- [ ] Open fix/nacht5-cleanup for the follow-up drops (legacy `antraege`,
      forum tables, phone/voice leftovers) only after a clean 48 h.

## Rollback (if smoke test fails)

```bash
# The backups from the "Backup" step above contain the full DB. Restore
# by re-executing the backup SQL against the same DB.

# Example for bafa_antraege:
wrangler d1 execute bafa_antraege --file backup-bafa-YYYYMMDDTHHMMSS.sql --remote

# Example for zfbf-db:
wrangler d1 execute zfbf-db --file backup-zfbf-YYYYMMDDTHHMMSS.sql --remote
```

**Important:** `wrangler d1 execute --file` runs the SQL as-is. A backup
export includes `CREATE TABLE` for every existing table — running it
against the DB that wasn't dropped will error (`table already exists`).
The dropped phantom tables will get recreated; the rest will no-op on
the `CREATE TABLE IF NOT EXISTS` lines. If the backup doesn't include
`IF NOT EXISTS`, do a targeted restore by extracting only the
`CREATE TABLE` + `INSERT` blocks for `users` (from backup-bafa) and the
8 `foerdermittel_*` tables (from backup-zfbf), then execute those.

After restoring, revert the merged commit:
```bash
git revert <merge-sha> --no-edit
git push origin main
# Vercel + worker auto-deploy will pick it up.
```

## Out of scope for this checklist (future cleanup)

These are called out in SCHEMA_CONSOLIDATION_PLAN.md but not safe to
bundle with the phantom-drops:

- `berater_profile` singular/plural merge
- `antraege` legacy / `antraege_v2` rename
- Forum tables (never launched)
- `audit_logs` unification (prep landed in Nacht 3 / migration 032)
- `CHECK_DB` unbinding (blocked on worker-check retirement)
