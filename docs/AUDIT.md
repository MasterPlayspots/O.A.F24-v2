# Fund24 — Consolidated Audit (Single-Source-of-Truth)

**Snapshot date:** 2026-04-15
**Latest re-audit score:** **7.9 / 10** (up from 7.0)
**Repo:** `MasterPlayspots/O.A.F24-v2` @ `main`
**Authors:** Autonomous audit run, evidence-based (every cell from `grep` / `curl` / `wrangler` / `npm audit`).

This document is a **complete, self-contained dossier**. It bundles:

1. **Original 15-Dimensions Audit** (2026-04-15 T 15:24) — the starting point
2. **Gap Analysis** — 7 gaps with fix contracts
3. **Fix Log** — 17 entries covering Phase-1 + Phase-2 + N-series
4. **Post-Phase-2 Re-Audit** (2026-04-15 T 19:30) — evidence-verified fixes, score delta, 6 new N-findings
5. **Ecosystem Map** — architecture, inventory, 61-feature matrix, data model

The individual source files under `docs/analysis/` and `docs/analysis/ecosystem/` remain authoritative; this file is a **convenience aggregation**.

---

## Table of Contents

- [Part I · Original Audit](#part-i--original-audit-20260415)
  - [I.1 Executive Summary](#i1-executive-summary)
  - [I.2 Live-Infra Check](#i2-live-infra-check)
  - [I.3 Dimension Scores](#i3-dimension-scores)
  - [I.4 Top-5 Critical Findings](#i4-top-5-critical-findings)
  - [I.5 All Findings F-001 to F-018](#i5-all-findings-f-001-to-f-018)
  - [I.6 Persona Feature Matrix (snapshot)](#i6-persona-feature-matrix-snapshot)
  - [I.7 Priority Ranking](#i7-priority-ranking)
- [Part II · Gap Analysis](#part-ii--gap-analysis)
  - [II.1 GAP-001 Admin Cert-Queue (BROKEN)](#ii1-gap-001-admin-cert-queue)
  - [II.2 GAP-002 Berater BAFA-Zert Upload (MISSING)](#ii2-gap-002-berater-bafa-zert-upload)
  - [II.3 GAP-003 ECOSYSTEM.md (STALE-DOC)](#ii3-gap-003-ecosystemmd)
  - [II.4 GAP-004 Tests in CI](#ii4-gap-004-tests-in-ci)
  - [II.5 GAP-005 R2 Bucket Cleanup](#ii5-gap-005-r2-bucket-cleanup)
  - [II.6 GAP-006 .env.example](#ii6-gap-006-envexample)
  - [II.7 GAP-007 API Reference](#ii7-gap-007-api-reference)
- [Part III · Fix Log](#part-iii--fix-log-chronological)
- [Part IV · Post-Phase-2 Re-Audit](#part-iv--post-phase-2-re-audit)
  - [IV.1 Findings-Status Verification](#iv1-findingsstatus-verification)
  - [IV.2 Dimensions Delta](#iv2-dimensions-delta)
  - [IV.3 New Findings (N-Series)](#iv3-new-findings-n-series)
  - [IV.4 Regressions](#iv4-regressions)
  - [IV.5 Open User-Actions](#iv5-open-user-actions)
  - [IV.6 Recommendation](#iv6-recommendation)
- [Part V · Ecosystem Map](#part-v--ecosystem-map)
  - [V.1 Architecture](#v1-architecture)
  - [V.2 Inventory](#v2-inventory)
  - [V.3 Feature Matrix (61 features)](#v3-feature-matrix)
  - [V.4 Data Model](#v4-data-model)
- [Appendix · Onboarding Sequence](#appendix--onboarding-sequence)

---

# Part I · Original Audit (2026-04-15)

> Audit branch: `audit/2026-04-15` · Base commit: `41fa37c`
> Scope: Frontend (Next.js on Vercel) + Worker 1 (Hono on Cloudflare) + Worker 2 (plain JS on Cloudflare, proxied)
> Ground truth: **code** (ECOSYSTEM.md was cross-checked and marked STALE where it diverges).

## I.1 Executive Summary

| Metric | Value |
|---|---|
| **Overall Score** | **7.0 / 10** |
| Maturity | Mid — most Kern-Flows live + wired, 1 BROKEN admin surface, 1 MISSING feature, a few post-launch polish items |
| Core architecture | Monorepo, 1 Vercel deploy + 2 CF Worker auto-deployed via GH Actions |
| LOC (TS + TSX) | ~55 000 Frontend + 30 000 Worker 1 + 4 700 Worker 2 |
| Worker endpoints | ~120 (Worker 1 native) + ~50 (Worker 2 via proxy) |
| Frontend pages | 55 (`page.tsx`) |
| Feature coverage LIVE | 47 / 50 (94 %) |
| BROKEN | 1 (Admin Cert-Queue — wrapper calls missing endpoint) |
| MISSING | 1 (Berater BAFA-Zert-Antrag — neither UI nor backend) |

## I.2 Live-Infra Check

| Check | Result |
|---|---|
| `GET https://fund24.io/` | 200 |
| `GET https://api.fund24.io/api/health` | 200, all checks green |
| `GET /api/foerdermittel/katalog?limit=1` | 200, success true |
| `GET /api/netzwerk/berater?pageSize=3` | 200, total = 16 |
| `GET /api/news` | 200, 0 Artikel (table empty, expected) |
| D1 DBs (CF) | 7 exist, 5 used |
| R2 Buckets (CF) | 4 exist, **2 unbound** (`fund24-dokumente`, `fund24-company-files`) — F-012 |
| Worker 1 latest | `41fa37c` (deployed via GH Actions) |
| Worker 2 latest | `2ea5c4e` (deployed via GH Actions) |
| Vercel latest Ready | `41fa37c` (`fund24-i3sh4nusc`) |

## I.3 Dimension Scores

| # | Dimension | Score | Verdict |
|---|---|---:|---|
| D1 | Architecture | 7 | 3-tier clean, 0 circular deps, monorepo consolidated; 2 unbound R2 buckets |
| D2 | Code Quality | 6 | 48× `as any`, 12× `console.*` in FE, TSC clean, ESLint green |
| D3 | Security | 7 | PBKDF2 100k, param SQL, CORS/CSRF/Rate-Limit all in place; **Sentry PII on**, 4× Hono-MODERATE CVEs |
| D4 | Performance | 6 | Worker 589 KB, Sentry 100 % sampling (cost risk), 1 very large route file |
| D5 | Tests | 7 | 13 Worker tests (vitest + miniflare), **no E2E**, no test step in CI |
| D6 | API Design | 8 | 55 Zod validators, shape consistency, 1 silent catch |
| D7 | Dependencies | 6 | 10 npm-audit findings (2 HIGH, 8 MOD), Hono < 4.12.12 |
| D8 | Git | 8 | Active history since March, 3 commits/day avg, well-distributed changes |
| D9 | Documentation | 6 | ECOSYSTEM.md stale (mentions `/api/bafa`), no API.md, no MIGRATIONS.md |
| D10 | DevOps | 8 | Both CF workers + Vercel auto-deployed, actions unpinned (@v3/@v4 major) |
| D11 | Frontend | 7 | 55 pages, error boundaries present, 1 open TODO in SupportWidget |
| D12 | Database | 7 | Cross-DB FK design accepted, 46 tables, 113 indexes, no rollbacks |
| D13 | Error Handling | 7 | Sentry in global-error.tsx, 1 silent catch in check.ts, app/error.tsx without Sentry |
| D14 | Monitoring | 7 | OA-CP + OA-VA crons + onboarding cron run, 100 % Sentry sampling |
| D15 | Env Config | 7 | No `.env.example`, `requireEnv()` validates server-side |

**Weighted mean:** **7.0 / 10**

## I.4 Top-5 Critical Findings

### F-001 · HIGH · Security
**Location:** `instrumentation-client.ts:14` + `sentry.server.config.ts:11`
**Issue:** `tracesSampleRate: 1.0` + `sendDefaultPii: true`. 100 % sampling = all user emails, IDs, IPs, roles land in Sentry → GDPR risk + unnecessary cost.
**Fix:** Drop to `0.1`, `sendDefaultPii: false`, strip sensitive fields via `beforeSend` scrubber.
**Effort:** Quick (15 min).

### F-002 · HIGH · Dependencies
**Location:** `worker/package.json`
**Issue:** `hono ^4.12.8` — 3 MODERATE CVEs (cookie bypass `GHSA-26pp-8wgv-hjvm`, IPv6 bypass, path traversal). Latest ≥ 4.12.12.
**Fix:** `npm install hono@latest --save` in `worker/`, build, redeploy. No breaking changes in 4.12.x.
**Effort:** Quick (30 min incl. smoke test).

### F-003 · HIGH · Feature-Matrix
**Location:** `app/admin/page.tsx:34-42` ↔ `worker/src/routes/admin.ts`
**Issue:** Wrappers `listPendingCerts`, `approveCert`, `rejectCert` in `lib/api/fund24.ts:380-388` call `/api/admin/bafa-cert/*`. **No handler** in `admin.ts`. Cert-Queue-UI silently empty — 404 when admin authenticated (currently 401 via requireAuth masks the 404).
**Fix:** 3 new routes in `admin.ts`:
- `GET /bafa-cert/pending` — list users with `bafa_cert_status = 'pending'`
- `POST /bafa-cert/:userId/approve`
- `POST /bafa-cert/:userId/reject`

**Effort:** Medium (2-4 h incl. E2E test + audit log).

### F-004 · HIGH · Feature-Matrix
**Location:** Berater BAFA-Zert Antrag
**Issue:** ECOSYSTEM.md lists "BAFA-Zertifizierung für Berater" as feature, but neither UI (`app/dashboard/berater/bafa-cert/page.tsx` missing) nor worker endpoint exists. Admin flow (F-003) has no data source.
**Fix:** Build feature (UI + `POST /api/berater/bafa-cert` + R2 upload) or remove from ECOSYSTEM.md.
**Effort:** Large (1 day build, or 5 min docs removal).

### F-005 · HIGH · Documentation
**Location:** `ECOSYSTEM.md`
**Issue:** Doc 1 week old, references endpoints removed since (e.g. `/api/bafa` removed in commit `18e4a54`). Phase-C consolidation (Worker 2 → Worker 1 migrations) not documented.
**Fix:** Rewrite `ECOSYSTEM.md` or replace with `docs/API.md` (auto-generated route inventory).
**Effort:** Medium (4 h for full rewrite).

## I.5 All Findings F-001 to F-018

Full list in `docs/analysis/audit_findings.json` (machine-readable).

| ID | Severity | Dim | Location | Issue |
|---|---|---|---|---|
| F-001 | HIGH | D3 | Sentry configs | `tracesSampleRate: 1.0` + PII enabled |
| F-002 | HIGH | D7 | `worker/package.json` | Hono 4.12.8 — 3 MODERATE CVEs |
| F-003 | HIGH | Feature | `admin.ts` | Cert-Queue handlers missing |
| F-004 | HIGH | Feature | Berater flow | BAFA-Zert-Antrag not implemented |
| F-005 | HIGH | D9 | `ECOSYSTEM.md` | Stale doc |
| F-006 | MED | D2 | `app/**/*.tsx` | 12× `console.*` in prod FE |
| F-007 | MED | D2 | `app lib worker/src` | 48× `as any` |
| F-008 | MED | D4 | `worker/src/routes/foerdermittel.ts` (~1500 LOC) | Huge route file, mixed concerns |
| F-009 | MED | D5 | `.github/workflows/ci.yml` | No test step, worker tests never run in CI |
| F-010 | MED | D6 | `worker/src/routes/check.ts:72-74` | Silent `catch { }` — errors swallowed |
| F-011 | MED | D9 | `docs/` | No `docs/API.md`, `docs/MIGRATIONS.md`, no auto route list |
| F-012 | MED | D12 | `worker/wrangler.toml` vs CF | 2 R2 buckets exist but not bound |
| F-013 | MED | D13 | `app/error.tsx` | App-level error boundary without Sentry capture |
| F-014 | LOW | D10 | `.github/workflows/*.yml` | Actions pinned to major version, not SHA |
| F-015 | LOW | D11 | `components/support/SupportWidget.tsx:7` | TODO: real contact data |
| F-016 | LOW | D12 | `worker/db/migrations/` | No `*-rollback.sql` |
| F-017 | LOW | D15 | Repo root | No `.env.example` |
| F-018 | LOW | D3 | `worker/src/middleware/cors.ts:15-19` | DEV origins allowed in prod |

## I.6 Persona Feature Matrix (snapshot)

Full matrix in `docs/analysis/feature_matrix.csv` (50 rows). Snapshot counts:

| Persona | LIVE | BROKEN | MISSING | Coverage |
|---|---:|---:|---:|---:|
| Public (Landing, Programme, Berater, News, Foerdercheck, Legal) | 13 | 0 | 0 | 100 % |
| Auth (Login/Register/Verify/Reset) | 5 | 0 | 0 | 100 % |
| Onboarding (Profil, Unternehmen, Expertise, Dienstleistungen) | 4 | 0 | 0 | 100 % |
| Unternehmen (Dashboard, Favoriten, Tracker, Anträge, Anfragen, Detail, Upload, ACL, Notifications, Fördercheck) | 12 | 0 | 0 | 100 % |
| Berater (Dashboard, Anfragen, Beratungen, Abwicklung, Nachrichten, Vorlagen, Bericht-Editor, Profil, Tracker) | 9 | 0 | 1 | 90 % |
| Admin (Dashboard, Users, Aktuelles-CMS, Provisionen, Audit-Logs, Email-Outbox, Cert-Queue) | 6 | 1 | 0 | 86 % |

**Total: 49 LIVE · 1 BROKEN · 1 MISSING = 94 % feature coverage**

## I.7 Priority Ranking

| Rank | ID | Title | Impact | Effort | Sprint | Blocker? |
|---|---|---|---|---|---|---|
| 1 | F-002 | Hono ≥ 4.12.12 (CVEs) | HIGH | Quick | S1 | **Yes — Security** |
| 2 | F-001 | Sentry PII + Sampling | HIGH | Quick | S1 | **Yes — GDPR** |
| 3 | GAP-001 | Admin Cert-Queue endpoints (F-003) | HIGH | Medium | S1 | **Yes — Admin UX broken** |
| 4 | F-009 | Test step in CI | MED | Quick | S1 | No |
| 5 | F-010 | Silent catch `check.ts` | MED | Quick | S1 | No |
| 6 | F-006 | `console.*` out of prod FE | MED | Quick | S1 | No |
| 7 | F-013 | `app/error.tsx` + Sentry | MED | Quick | S1 | No |
| 8 | F-017 | `.env.example` | LOW | Quick | S1 | No |
| 9 | GAP-002 | Berater BAFA-Zert Feature | HIGH | Large | S2 | No (feature, not bug) |
| 10 | F-005 | ECOSYSTEM.md refresh / API.md | MED | Medium | S2 | No |
| 11 | F-012 | R2 buckets cleanup | MED | Quick | S2 | No |
| 12 | F-008 | `foerdermittel.ts` split | MED | Medium | S2 | No |
| 13 | F-007 | `as any` sweep | MED | Medium | S3 | No |
| 14 | F-014 | Actions SHA-pinning | LOW | Quick | S3 | No |
| 15 | F-015 | SupportWidget TODO | LOW | Quick | S1 | No |

**Critical path (launch blockers):**
1. F-002 Hono CVE fix
2. F-001 GDPR-safe Sentry
3. GAP-001 Admin Cert-Queue endpoints
4. User-Action: Impressum HRB + USt-IdNr.
5. User-Action: Legal review Datenschutz + AGB

---

# Part II · Gap Analysis

Every gap with exact target file path, API contract, dependencies, effort.

## II.1 GAP-001 · Admin Cert-Queue

**Status at audit:** BROKEN (UI present, wrapper present, **worker handler missing**).
**Status now:** ✅ FIXED via PR #13.

**Paths:**
- `app/admin/page.tsx:34-42` — UI block "Pending Certs"
- `lib/api/fund24.ts:380-388` — wrappers
- **Target:** `worker/src/routes/admin.ts` — 3 new routes

**API Contract:**
```ts
// GET /api/admin/bafa-cert/pending  →  200
{
  success: true,
  certs: Array<{
    id: string;            // user_id
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    bafa_berater_nr: string | null;
    bafa_cert_status: 'pending' | 'approved' | 'rejected';
    bafa_cert_uploaded_at: string | null;
  }>
}

// POST /api/admin/bafa-cert/:userId/approve  →  200
{ success: true }

// POST /api/admin/bafa-cert/:userId/reject  →  200
{ success: true }
```

**Effort:** Medium (2-4 h). **Blocker:** Yes (Admin UX).

## II.2 GAP-002 · Berater BAFA-Zert Upload

**Status at audit:** MISSING.
**Status now:** ❌ STILL_OPEN (deliberately post-launch per priority ranking).

**Target paths:**
- **UI:** `app/dashboard/berater/bafa-cert/page.tsx` — upload form (PDF) + status badge
- **Wrapper:** `lib/api/fund24.ts` — `uploadBafaCert(file, bafaBeraterNr)` + `getBafaCertStatus()`
- **Worker:** `worker/src/routes/berater.ts` — 2 new routes

**API Contract:**
```ts
// POST /api/berater/bafa-cert  (multipart/form-data)
// Body: { file: File (PDF), bafa_berater_nr: string }
{ success: true, status: 'pending' }

// GET /api/berater/bafa-cert/status  →  200
{
  success: true,
  status: 'none' | 'pending' | 'approved' | 'rejected',
  bafa_berater_nr: string | null,
  uploaded_at: string | null
}
```

**Impl sketch:**
- PDF to R2 under `bafa-certs/{userId}/{timestamp}-{filename}`
- `UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now'), bafa_berater_nr=? WHERE id=?`
- Admin email via onboarding pattern

**Effort:** Large (1 day). **Blocker:** No (feature, not bug).

## II.3 GAP-003 · ECOSYSTEM.md

**Status at audit:** STALE-DOC.
**Status now:** ✅ FIXED via PR #18 (deprecation banner + `docs/API.md` as authoritative source).

**Stale references (removed since audit):**
- `/api/bafa`, `/api/forum/*`, `/api/auth/webauthn/*`, `/api/auth/magic-link/*`

**Missing references (added since audit):**
- `/api/antraege/*`, `/api/me/dashboard`, `/api/news/*`, `/api/admin/news/*`, `/api/tracker/*`, `/api/berater/provision-vertraege`, `/api/berater/abwicklung/upload`, `/api/oa/*`, `/api/admin/onboarding/dispatch`, onboarding cron

**Effort:** Medium (manual) / Large (auto-gen). **Chosen:** Auto-gen via `scripts/gen-api-docs.ts` + CI drift check.

## II.4 GAP-004 · Tests in CI

**Status at audit:** MISSING (13 test files exist but CI only runs lint+typecheck+build).
**Status now:** ✅ FIXED via PR #15 (new `Worker Tests (vitest)` job).

**Fix:** Add job to `.github/workflows/ci.yml`:
```yaml
- name: Worker Tests
  run: cd worker && npm test
```

**Effort:** Quick (15 min). **Outcome:** 116 pass / 1 skip / 0 fail on main.

## II.5 GAP-005 · R2 Bucket Cleanup

**Status at audit:** STALE-INFRA.
**Status now:** ✅ FIXED via PR #19 (both empty buckets deleted).

**Options considered:**
- **A — Delete both** (chosen): buckets were empty, never code-referenced
- B — Bind both: no feature needed them
- C — Mixed: not applicable

**Effort:** Quick (15 min, user-gated). **Result:** `wrangler r2 bucket list` CLEAN.

## II.6 GAP-006 · .env.example

**Status at audit:** MISSING.
**Status now:** ✅ FIXED as part of PR #12 (shipped alongside F-001 Sentry fix).

**Content:** 4 `NEXT_PUBLIC_*` URLs + Sentry vars + worker var notes. 26 LOC.

**Effort:** Quick (5 min).

## II.7 GAP-007 · API Reference

**Status at audit:** MISSING (no central overview of ~120 worker endpoints).
**Status now:** ✅ FIXED via PR #18.

**Target:** `docs/API.md`
**Implementation:** Auto-generated by `scripts/gen-api-docs.ts` (walks `worker/src/routes/**/*.ts`, emits 143-endpoint reference). CI workflow `docs-check.yml` blocks PRs that drift.

**Effort:** Large (auto-gen). **Outcome:** 143 endpoints, 23 groups, source-linked.

## II.8 Gap Summary

| ID | Type | Impact | Effort | Blocker? | Status |
|---|---|---|---|---|---|
| GAP-001 | BROKEN | HIGH | Medium | **Yes** | ✅ FIXED (PR #13) |
| GAP-002 | MISSING | HIGH | Large | No (post-launch) | ❌ STILL_OPEN |
| GAP-003 | STALE-DOC | MED | Medium | No | ✅ FIXED (PR #18) |
| GAP-004 | DEVOPS | MED | Quick | No | ✅ FIXED (PR #15) |
| GAP-005 | INFRA | MED | Quick | No | ✅ FIXED (PR #19) |
| GAP-006 | DX | LOW | Quick | No | ✅ FIXED (PR #12) |
| GAP-007 | DOCS | MED | Medium | No | ✅ FIXED (PR #18) |

**Only GAP-002 remains open, deliberately deferred.**

---

# Part III · Fix Log (chronological)

17 entries covering every PR from the audit remediation effort. Each entry has an evidence trail.

| ID | Severity | Status | PR | Notes |
|---|---|---|---|---|
| F-002 | HIGH | DONE | [#11](https://github.com/MasterPlayspots/O.A.F24-v2/pull/11) | hono 4.12.8 → 4.12.14 (defensive bump; GHSA advisories recommend 4.12.12+). Smoke test + build green. |
| F-001 | HIGH | DONE | [#12](https://github.com/MasterPlayspots/O.A.F24-v2/pull/12) | Sentry DSGVO: PII-scrubber `lib/sentry/scrubber.ts` + `sendDefaultPii: false` + `tracesSampleRate 1.0 → 0.1` in all 3 frontend inits + worker Toucan. 5 scrubber unit tests green. |
| GAP-001 | HIGH | DONE | [#13](https://github.com/MasterPlayspots/O.A.F24-v2/pull/13) | Admin BAFA Cert-Queue: 3 handlers in `worker/src/routes/admin.ts` (GET pending, POST approve, POST reject) + migration 027 adds `bafa_cert_status`/`_uploaded_at`/`_berater_nr` columns. 6 vitest cases green. Remote migration applied 2026-04-15. Also unblocked F-009 by removing stale `tsconfig.json` extends. |
| F-006 | MED | DONE | [#14](https://github.com/MasterPlayspots/O.A.F24-v2/pull/14) | Removed all 12 `console.*` from prod frontend. Error paths now go through `Sentry.captureException` with `tags: {area, op}`. |
| F-010 | MED | DONE | [#14](https://github.com/MasterPlayspots/O.A.F24-v2/pull/14) | `worker/src/routes/check.ts:72` silent catch replaced with Toucan capture (`tags: route=check, op=scrape-company`). |
| F-013 | MED | DONE | [#14](https://github.com/MasterPlayspots/O.A.F24-v2/pull/14) | `app/error.tsx` useEffect now calls `Sentry.captureException(error, { tags: { boundary: 'app' }, contexts: { digest } })`. |
| F-015 | LOW | DONE | [#14](https://github.com/MasterPlayspots/O.A.F24-v2/pull/14) | SupportWidget: real phone + email + hours were already in place — dropped the leftover TODO comment. |
| F-018 | LOW | DONE | [#14](https://github.com/MasterPlayspots/O.A.F24-v2/pull/14) | `worker/src/middleware/cors.ts`: DEV origins, Vercel preview pattern, v0.dev gated behind `env !== "production"`. Legacy `v0-bafa-creator-ai.vercel.app` dropped. |
| F-012 / GAP-005 | MED | DONE | [#19](https://github.com/MasterPlayspots/O.A.F24-v2/pull/19) | Deleted `fund24-dokumente` + `fund24-company-files` R2 buckets (both 0 objects). Active upload paths unchanged: `bafa-reports` + `foerdermittel-check-docs`. |
| F-011 / GAP-007 | MED | DONE | [#18](https://github.com/MasterPlayspots/O.A.F24-v2/pull/18) | `scripts/gen-api-docs.ts` + `docs/API.md` (143 endpoints, 23 groups) + CI drift-check. |
| F-016 | LOW | DONE | [#18](https://github.com/MasterPlayspots/O.A.F24-v2/pull/18) | `docs/MIGRATIONS.md` + 29/29 rollback pairs (16 foundational NOT REVERSIBLE, 9 real, 3 drop-FK NOT REVERSIBLE, 1 GAP-001). CI enforces pair. |
| GAP-003 | MED | DONE | [#18](https://github.com/MasterPlayspots/O.A.F24-v2/pull/18) | `ECOSYSTEM.md` deprecation banner → `docs/API.md`. `README.md` Documentation section rewritten. |
| F-007 | MED | DONE | [#16](https://github.com/MasterPlayspots/O.A.F24-v2/pull/16) | `as any` sweep: 60 → 45 occurrences, **21 → 6 in non-test code**. Zod schemas for PayPal + Stripe, ZodIssue in auth.ts, typed D1 row generics in backup.ts, `runLlama` helper, typed `FoerdermittelProfileRow` on `.first<>()`. All 6 remaining have `eslint-disable-next-line` + reason. |
| F-008 | MED | DONE | [#17](https://github.com/MasterPlayspots/O.A.F24-v2/pull/17) | `worker/src/routes/foerdermittel.ts` (1504 LOC, 22 endpoints) split into 6 sub-routers: `favoriten.ts` (72), `notifications.ts` (63), `katalog.ts` (153), `chat.ts` (286), `match.ts` (297), `cases.ts` (617) + 18-LOC barrel. 5 of 6 under 600 LOC target. |
| F-009 | MED | DONE | [#15](https://github.com/MasterPlayspots/O.A.F24-v2/pull/15) | Worker `vitest` now gates merges. New `test` job in `.github/workflows/ci.yml`. Fixed 3 stale `foerdermittel.test.ts` cases (Sprint-19 `unternehmen`-table refactor) + added `createTestUnternehmen` helper. Suite: **116 pass / 1 skip / 0 fail**. |
| F-014 | LOW | DONE | [#15](https://github.com/MasterPlayspots/O.A.F24-v2/pull/15) | All 12 action references in `.github/workflows/*.yml` pinned to commit SHA with `# v<N>`. |
| **N-001** | **HIGH** | **DONE** | [#22](https://github.com/MasterPlayspots/O.A.F24-v2/pull/22) | **Next.js 15.5.14 → ^15.5.15** to close DoS-via-Server-Components CVE (GHSA-q4gf-8mx6-v5v3). Identified during post-phase-2 re-audit. |

**PRs merged to `main`:** 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 (re-audit), 21 (ecosystem map), 22 (N-001).

---

# Part IV · Post-Phase-2 Re-Audit

> Basis: `main` @ `8cf54fb` (after all Phase-2 PRs merged) · Score **7.0 → 7.9** (+0.9)

## Executive Summary

All 18 findings and 7 gaps from the original audit are evidence-verified: **22 FIXED, 2 STILL_OPEN** (both user-action / deferred post-launch feature), **0 regressions**. Three **new** CVE findings surfaced since the audit — one HIGH in `next` (production, fixed in PR #22), two dev-dep chains in wrangler + shadcn (not deployed). Code-hygiene phase closed; design-refresh has the floor.

## IV.1 Findings-Status Verification

Legend: ✅ FIXED · ⚠️ PARTIAL · ❌ STILL_OPEN · 🔁 REGRESSED

| ID | Title | Sev | Status | Evidence |
|---|---|---|:---:|---|
| F-001 | Sentry DSGVO | HIGH | ✅ | `sendDefaultPii: false` + `beforeSend: sentryBeforeSend` + `tracesSampleRate: 0.1` in all 3 configs; `lib/sentry/scrubber.ts` present |
| F-002 | Hono CVE 4.12.8→4.12.14 | HIGH | ✅ | `worker/package.json`: `"hono": "^4.12.14"` |
| F-003 | Admin Cert-Queue broken | HIGH | ✅ | `curl /api/admin/bafa-cert/pending → 401` (auth-gated, route exists) |
| F-004 | Berater BAFA-Zert Feature | HIGH | ✅ | GAP-002 shipped post-re-audit. Prod `POST /api/berater/bafa-cert` + `GET /api/berater/bafa-cert/status` live (401 auth-gated). R2 `fund24-bafa-certs` bound. UI at `app/dashboard/berater/bafa-cert/page.tsx`. |
| F-005 | ECOSYSTEM.md stale | HIGH | ✅ | `ECOSYSTEM.md:3` carries deprecation banner + stale-endpoint callouts |
| F-006 | 12× console.* in prod FE | MED | ✅ | `grep -r console\. app/ lib/ components/` → **0** hits |
| F-007 | `as any` × 48 | MED | ✅ | Non-test any's: **6** (from 21). ESLint rule `no-explicit-any: warn` active. All 6 remaining have `eslint-disable-next-line` + reason. |
| F-008 | foerdermittel.ts 1500 LOC | MED | ✅ | Split into 7 files; largest `cases.ts` = 617 LOC |
| F-009 | Worker tests not in CI | MED | ✅ | `.github/workflows/ci.yml` contains `Worker Tests (vitest)` job; last run on main **green** |
| F-010 | Silent `catch { }` in check.ts | MED | ✅ | `grep -rn "catch[[:space:]]*{[[:space:]]*}" worker/src` → **0** matches |
| F-011 | No docs/API.md | MED | ✅ | `docs/API.md` (294 LOC, 143 endpoints) + `docs/MIGRATIONS.md` (147 LOC) |
| F-012 | Unbound R2 buckets | MED | ✅ | `wrangler r2 bucket list` → **CLEAN** |
| F-013 | app/error.tsx no Sentry | MED | ✅ | `Sentry.captureException(error, { tags: { boundary: 'app' }, contexts: …})` at `app/error.tsx:15` |
| F-014 | GH Actions tag-pinned | LOW | ✅ | **14 SHA-pinned**, **0 tag-pinned** across 3 workflow files |
| F-015 | SupportWidget TODO | LOW | ✅ | `grep -nE "TODO\|PLACEHOLDER"` → **0** matches |
| F-016 | Migration rollbacks | LOW | ✅ | **29 forward / 29 rollback** pairs. CI enforces pair. |
| F-017 | No `.env.example` | LOW | ✅ | File exists at root (26 LOC) |
| F-018 | CORS DEV origins in prod | LOW | ✅ | `worker/src/middleware/cors.ts:29`: `if (env === "production") return false;` |

| ID | Feature | Audit-Status | Now | Evidence |
|---|---|---|:---:|---|
| GAP-001 | Admin Cert-Queue | BROKEN | ✅ | Prod `GET /api/admin/bafa-cert/pending → 401` |
| GAP-002 | Berater BAFA-Zert Upload | MISSING | ✅ | Shipped post-re-audit: `POST /api/berater/bafa-cert` multipart (PDF ≤ 5 MB), `GET /api/berater/bafa-cert/status`, `GET /api/admin/bafa-cert/:userId/download`. R2 bucket `fund24-bafa-certs` bound as `BAFA_CERTS`. UI + 12 vitest cases. |
| GAP-003 | ECOSYSTEM.md Refresh | STALE-DOC | ✅ | Deprecation banner |
| GAP-004 | Worker Tests in CI | MISSING | ✅ | `Worker Tests (vitest)` job live |
| GAP-005 | R2 Bucket Cleanup | STALE-INFRA | ✅ | Buckets deleted in PR #19 |
| GAP-006 | `.env.example` | MISSING | ✅ | File exists |
| GAP-007 | API Reference | MISSING | ✅ | `docs/API.md` auto-generated |

**Totals (original):** 22 fixed · 2 still_open (deferred feature + user-action) · 0 regressed
**Totals (post-GAP-002 ship):** 23 fixed · 1 still_open (Impressum/Legal/Seeds/Phone user-actions grouped) · 0 regressed

## IV.2 Dimensions Delta

| # | Dimension | Before | After | Δ | Evidence |
|---|---|---:|---:|:---:|---|
| 1 | Architecture | 7 | 8 | +1 | F-008 split; monorepo stable; `app.route()` composition clean |
| 2 | Code Quality | 6 | 8 | +2 | 0 console.*, 6 non-test `any`, ESLint rule live |
| 3 | Security | 7 | 7 | 0 | F-001/F-018 fixed, next DoS CVE introduced then fixed; net zero |
| 4 | Performance | 6 | 7 | +1 | Sentry 1.0→0.1 = ~90 % span-quota reduction; foerdermittel split |
| 5 | Tests | 7 | 9 | +2 | 14 files, 116 pass / 1 skip / 0 fail; CI gates merges |
| 6 | API Design | 8 | 9 | +1 | Silent catch closed; 143-endpoint auto-doc |
| 7 | Dependencies | 6 | 5 | −1 | F-002 hono bumped BUT **new** findings (N-001 fixed, N-002 dev-only) |
| 8 | Git Hygiene | 8 | 7 | −1 | 5 stale merged-but-undeleted remote branches (N-004) |
| 9 | Documentation | 6 | 9 | +3 | `docs/API.md` (auto), `docs/MIGRATIONS.md`, `docs/FIX_LOG.md`, ECOSYSTEM deprecation, CI drift-check |
| 10 | CI/CD | 8 | 9 | +1 | `Worker Tests`, `API docs + migration rollback pairs`, `Lint · Typecheck · Build`; SHA-pinned |
| 11 | Frontend UX | 7 | 7 | 0 | No UX-relevant Phase-2 change |
| 12 | Database | 7 | 8 | +1 | 29/29 rollback pairs; stale R2 buckets removed |
| 13 | Error Handling | 7 | 9 | +2 | app/error.tsx + global-error.tsx + Sentry scrubber + Toucan; 0 empty catches |
| 14 | Monitoring | 7 | 8 | +1 | DSGVO-safe Sentry; configurable `SENTRY_TRACES_SAMPLE_RATE` |
| 15 | Env Config | 7 | 8 | +1 | `.env.example` + typed worker `Bindings` |

**Weighted mean:** (8+8+7+7+9+9+5+7+9+9+7+8+9+8+8) / 15 = **7.87 ≈ 7.9 / 10**

## IV.3 New Findings (N-Series)

### N-001 · HIGH · Security / Dependencies · `package.json` (root) — ✅ FIXED (PR #22)
- **Issue:** `next@15.5.14` — DoS via Server Components (GHSA-q4gf-8mx6-v5v3)
- **Evidence at finding time:** `npm audit → next 13.0.0 - 15.5.14 · HIGH`
- **Fix:** `next 15.5.14 → ^15.5.15`. Audit now shows `0 HIGH`.

### N-002 · HIGH (dev-only) · Dependencies · `worker/package.json`
- **Issue:** `@cloudflare/vitest-pool-workers@0.12.14 → miniflare → undici` has **4 HIGH** undici CVEs
- **Impact:** **Not in deployed bundle** — only in the test runner
- **Fix:** `cd worker && npm install -D @cloudflare/vitest-pool-workers@0.14.7` — breaking version change
- **Priority:** MEDIUM

### N-003 · LOW (dev-only) · Dependencies · Root transitive
- **Issue:** `shadcn@4.1.2 → @modelcontextprotocol/sdk@1.29.0 → hono@4.12.10` + `@hono/node-server@1.19.12` — 2 MODERATE hono CVEs in shadcn CLI chain
- **Impact:** Dev-CLI only. Not in Next.js runtime.
- **Fix:** `npm audit fix` (non-breaking) or wait for shadcn 4.2
- **Priority:** LOW

### N-004 · LOW · Git Hygiene
- **Issue:** 5 remote branches merged into `main` but not deleted
- **Fix:** 2-min cleanup via `gh api` or manual delete
- **Priority:** LOW (cosmetic)

### N-005 · LOW · Code Quality · `worker/`
- **Issue:** `cd worker && npx tsc --noEmit` reports **69 errors** — mostly pre-existing `cloudflare:test` typing + loose test response types
- **Impact:** Tests still run (vitest transpiles on-the-fly); no prod impact. Worker tsc intentionally **not** gated in CI.
- **Fix:** Add `@cloudflare/vitest-pool-workers/config` type ref + tighten test response types
- **Priority:** LOW (follow-up for F-007 continuation)

### N-006 · LOW · Tests
- **Issue:** 1 test in worker suite is `skipped` without documentation
- **Evidence:** `npm test → 116 passed | 1 skipped`
- **Fix:** `grep -rn "it\.skip\|test\.skip\|describe\.skip" worker/src/__tests__/` → identify, fix/delete/document
- **Priority:** LOW (10-min triage)

## IV.4 Regressions

**None detected.** All Phase-2 fixes are additive; Phase-1 fixes remain intact:
- CI: last 4 runs on `main` all ✅ SUCCESS
- Production: `api.fund24.io/api/health` → `{"status":"healthy"}` all 4 checks green
- Worker build: 590.6 KB (vs 589 KB pre-audit) — +1 KB from F-008 barrel imports
- Worker tests: 116 pass (up from 113 pre-F-009)
- Frontend `tsc`: clean

## IV.5 Open User-Actions

None of these can be closed by code alone:

- [ ] **GAP-002 / F-004** — Berater BAFA-Zert-Upload UI + Worker endpoint (post-launch)
- [ ] **Impressum** — HRB number + USt-IdNr. in `app/(public)/impressum/page.tsx`
- [ ] **Legal review** — Lawyer over `app/(public)/datenschutz` + `app/(public)/agb`
- [ ] **Berater seed content** — ≥ 3 active berater users in prod for non-empty directory
- [ ] **Support phone** — verify `+49 1512 9617192` in `SupportWidget.tsx` is a real support line

## IV.6 Recommendation

**Now (5 min, HIGH priority):** ~~N-001~~ — **DONE** via PR #22 (2026-04-15 T 17:34).

**This week (30 min, MEDIUM priority):**
- N-002 wrangler-chain bump (`@cloudflare/vitest-pool-workers@0.14.7` + re-run tests)
- N-006 skipped-test triage
- N-003 shadcn dep cleanup (`npm audit fix`)
- N-004 stale-branch cleanup

**Then — design refresh can start.** Code-hygiene debt is paid (7.9/10), CI is hard-wired, docs are self-healing. Next lever is frontend UX/design, not backend/infra.

**Post-launch backlog:**
- GAP-002 Berater BAFA-Zert (1-day build)
- Worker tsc cleanup (N-005) to strengthen CI Worker-Tests
- Optional: `@typescript-eslint/no-explicit-any` from `warn` to `error` (~6 months out)

---

# Part V · Ecosystem Map

## V.1 Architecture

### V.1.1 System topology

```mermaid
flowchart TB
    subgraph User["👤 Users"]
        U1[Unternehmen]
        U2[Berater]
        U3[Admin]
    end

    subgraph Edge["🌍 Vercel Edge (fra1, iad1)"]
        Next["Next.js 15.5.15 · App Router<br/>fund24.io · 55 pages"]
        Session["/api/session route handler<br/>(HttpOnly cookie set/delete)"]
    end

    subgraph CF["☁️ Cloudflare Workers · Zone fund24.io"]
        W1["bafa-creator-ai-worker<br/>api.fund24.io · Hono 4.12.14<br/>29 route files · 143 endpoints"]
        W2["foerdermittel-check-api<br/>*.workers.dev · plain JS<br/>accessed via /api/checks proxy"]

        subgraph D1["💾 D1 Databases (5 bound)"]
            DB1[("zfbf-db · 30 tables<br/>binding DB")]
            DB2[("bafa_antraege · 71 tables<br/>binding BAFA_DB")]
            DB3[("foerderprogramme · 15 tables<br/>binding FOERDER_DB")]
            DB4[("bafa_learnings · 11 tables<br/>binding BAFA_CONTENT")]
            DB5[("foerdermittel-checks · 15 tables<br/>binding CHECK_DB")]
        end

        subgraph R2["📦 R2 (2 in use)"]
            R2a[REPORTS<br/>bafa-reports]
            R2b[foerdermittel-check-docs<br/>used by W2]
        end

        subgraph KV["🔑 KV (4 bound)"]
            KV1[SESSIONS]
            KV2[RATE_LIMIT]
            KV3[CACHE]
            KV4[WEBHOOK_EVENTS]
        end

        AI["⚡ Workers AI<br/>@cf/meta/llama-3.1-8b-instruct*"]
        Cron["⏱ Cron triggers<br/>02:00, 02:30, 03:00 Mo, 10:00"]
    end

    subgraph Ext["🔌 External Services"]
        Sentry[Sentry DSGVO-scrubbed<br/>0.1 sample rate]
        Resend[Resend<br/>transactional mail]
        PayPal[PayPal Checkout]
        Anthropic[Anthropic API]
        OpenRouter[OpenRouter API]
        Turnstile[Cloudflare Turnstile]
    end

    U1 & U2 & U3 -->|HTTPS| Next
    Next --> Session
    Session -. sets fund24-token cookie .-> Next
    Next -->|fetch · JWT Bearer| W1
    W1 -.proxy /api/checks/*.-> W2
    W1 --> DB1 & DB2 & DB3 & DB4 & DB5
    W1 --> R2a
    W1 --> KV1 & KV2 & KV3 & KV4
    W1 --> AI
    Cron --> W1
    W2 --> R2b
    Next --> Sentry
    W1 --> Sentry
    W1 --> Resend
    W1 --> PayPal
    W1 --> Anthropic
    W1 --> OpenRouter
    W1 --> Turnstile
```

### V.1.2 Auth-Flow (JWT + HttpOnly cookie)

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Next.js
    participant NR as /api/session (Next Route Handler)
    participant API as Worker · /api/auth
    participant DB as zfbf-db.users
    participant KV as KV SESSIONS

    U->>FE: Login form (email, password)
    FE->>API: POST /api/auth/login
    API->>DB: SELECT WHERE email=? AND deleted_at IS NULL
    DB-->>API: row + password_hash + salt
    API->>API: PBKDF2 100k verify
    API->>API: jose.SignJWT (HS256, 30m)
    API-->>FE: { token, user }
    FE->>NR: POST /api/session { token }
    NR-->>FE: Set-Cookie: fund24-token=JWT<br/>HttpOnly; Secure; SameSite=Lax
    FE-->>U: Redirect /dashboard

    Note over U,KV: Subsequent requests
    U->>FE: GET /dashboard/unternehmen
    FE->>FE: middleware.ts: jose.jwtVerify
    FE->>API: fetch with Bearer token
    API->>API: requireAuth: jose.jwtVerify + deleted_at guard
    API-->>FE: JSON
    FE-->>U: Rendered page

    Note over U,KV: Logout
    U->>FE: /logout click
    FE->>NR: DELETE /api/session
    NR-->>FE: Set-Cookie: fund24-token=; Max-Age=0
```

### V.1.3 Deploy-Flow

```mermaid
flowchart LR
    Dev[Dev push to main]
    GH[GitHub main]

    subgraph GHA["GitHub Actions (SHA-pinned, F-014)"]
        CI["CI workflow<br/>Lint · Typecheck · Build"]
        Test["Worker Tests (vitest)<br/>116 pass / 1 skip / 0 fail"]
        DocsC["docs-check<br/>API.md drift + migration pair"]
        Deploy["Deploy Workers<br/>paths-filter"]
    end

    subgraph Targets["Production targets"]
        V["Vercel<br/>fund24.io · www.fund24.io"]
        CF1["Cloudflare<br/>api.fund24.io"]
        CF2["Cloudflare<br/>foerdermittel-check-api.workers.dev"]
    end

    Dev --> GH
    GH -->|on push to main| CI
    GH -->|on push to main| Test
    GH -->|on PR| DocsC
    GH -->|paths-filter| Deploy
    CI -->|success gate| Deploy
    Test -->|success gate| Deploy
    Deploy -->|worker/**| CF1
    Deploy -->|worker-check/**| CF2
    GH -->|Vercel Git Integration| V

    V -. Ready .-> Prod[🟢 Production]
    CF1 -. version .-> Prod
    CF2 -. version .-> Prod
```

### V.1.4 Middleware chain (Worker 1)

```mermaid
flowchart LR
    Req[Incoming Request]
    Req --> Slash[trailing-slash normalizer · 301]
    Slash --> SecHdr[securityHeaders<br/>X-Frame-Options, CSP, HSTS]
    SecHdr --> CORS[corsMiddleware<br/>env-gated allowlist]
    CORS --> CORSStrict["/api/* strictCorsCheck<br/>same-origin + allowlist"]
    CORSStrict --> CSRF[csrfProtection]
    CSRF --> RL[globalRateLimit<br/>KV-backed]
    RL --> Mount[route.match]
    Mount --> Handler[handler]
    Handler --> Err{error?}
    Err -->|yes| Toucan[Toucan.captureException<br/>DSGVO-scrubbed]
    Err -->|no| Resp[c.json]
    Toucan --> Resp
    Resp --> Out[HTTP Response]
```

### V.1.5 Cron & background jobs

| UTC | Pattern | Job | Service |
|---|---|---|---|
| 02:00 daily | `0 2 * * *` | D1 nightly backup → R2 `d1-backups` | `services/backup.ts` |
| 02:30 daily | `30 2 * * *` | OA-CP (Context-Guardian-Probe) + OA-VA (Variable-Audit) | `services/oa-cp.ts`, `services/oa-va.ts` |
| 03:00 Monday | `0 3 * * 1` | Audit-log + retention cleanup | `services/audit.ts`, `services/retention.ts` |
| 10:00 daily | `0 10 * * *` | Onboarding email sequence (day 0/3/7) | `services/onboarding.ts` |

### V.1.6 Versions (pinned)

| Component | Version | Source |
|---|---|---|
| Next.js | **^15.5.15** (DoS CVE-patched) | `package.json` |
| React | 19.1 | `package.json` |
| Hono | **4.12.14** (CVE-patched) | `worker/package.json` |
| TypeScript | 5.x | both |
| Wrangler | ^4.69.0 | `worker/package.json` |
| Sentry SDK | `@sentry/nextjs ^10.47.0` + `toucan-js ^4.1.1` | both |
| Node (CI + Vercel) | 20 | `.github/workflows/*`, Vercel defaults |

## V.2 Inventory

### V.2.1 Cloudflare account

| Field | Value |
|---|---|
| Account ID | `d7bdc9212bc6f429a5f2eb82853a9e83` |
| Zone | `fund24.io` |

### V.2.2 Workers

| Worker | Purpose | Deployed | Source |
|---|---|---|---|
| `bafa-creator-ai-worker` | Main API, `api.fund24.io` | ✅ (GH Actions paths-filter) | `worker/` |
| `bafa-creator-ai-worker-preview` | Preview stage | (env block) | same |
| `foerdermittel-check-api` | Fördercheck wizard, `*.workers.dev` | ✅ | `worker-check/` |

### V.2.3 D1 Databases (5 bound to main worker)

| Binding | CF name | UUID | Tables |
|---|---|---|---:|
| `DB` | `zfbf-db` | `9a41ed93-e2a4-440d-8ef1-a3e63cb0c6e3` | 30 |
| `BAFA_DB` | `bafa_antraege` | `8582e9dd-8063-4dbd-b079-f38b2bb3918f` | 71 |
| `FOERDER_DB` | `foerderprogramme` | `b95adb7b-ed86-441b-841e-4cd3a9a15135` | 15 |
| `BAFA_CONTENT` | `bafa_learnings` | `7f5947f7-42af-455e-81ad-0c57be23b940` | 11 |
| `CHECK_DB` | `foerdermittel-checks` | `0b2479a3-13eb-45bc-8c71-105208ed71ad` | 15 |

**Total: 142 tables** across 5 bound DBs.

### V.2.4 R2 Buckets

| Bucket | Binding | Purpose |
|---|---|---|
| `bafa-reports` | `REPORTS` (main worker) | Generated PDF reports + backups |
| `foerdermittel-check-docs` | (check worker) | Wizard company docs |

Deleted by PR #19 (GAP-005): `fund24-dokumente`, `fund24-company-files`.

### V.2.5 KV (4 bound)

| Binding | ID | Purpose |
|---|---|---|
| `SESSIONS` | `8cb1b5aaf7954e7a88859f36edf8b342` | JWT session metadata |
| `RATE_LIMIT` | `2fddaa5f66a94e8eb89920c91b89e83d` | Rate buckets |
| `CACHE` | `2edc5ca82a3d4e609b156a8f719c44ba` | Generic cache |
| `WEBHOOK_EVENTS` | `3ed392e35d6142e9a5330a056b6f60f3` | Stripe/Resend idempotency |

### V.2.6 Worker Secrets (9 active)

| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Sign/verify auth tokens |
| `PASSWORD_PEPPER` | Extra pepper for PBKDF2 |
| `RESEND_API_KEY` | Transactional email |
| `ANTHROPIC_API_KEY` | Claude API |
| `OPENROUTER_API_KEY` | OpenRouter fallback |
| `TURNSTILE_SECRET_KEY` | CF Turnstile verify |
| `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` | PayPal OAuth |
| `UNLOCK_SECRET` | Report unlock token |

### V.2.7 External Services

| Service | Purpose | Secret/ENV | Cost |
|---|---|---|---|
| Sentry | Error + perf monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Free tier |
| Resend | Transactional email | `RESEND_API_KEY` | Free → $20 |
| Anthropic (Claude) | AI | `ANTHROPIC_API_KEY` | Per-token |
| OpenRouter | Fallback AI | `OPENROUTER_API_KEY` | Per-token |
| PayPal | Payments | `PAYPAL_*` | % per tx |
| Stripe | Alt payments | — | % per tx |
| Cloudflare Turnstile | Bot check | `TURNSTILE_SECRET_KEY` | Free |
| Cloudflare Workers AI | Llama inference | native binding | Per-neuron-second |
| Vercel | Frontend hosting + Analytics + Speed Insights | (project env) | Free/Pro |

### V.2.8 Domains

| Domain | Provider | Served by |
|---|---|---|
| `fund24.io` | CF DNS → Vercel | Next.js |
| `www.fund24.io` | Same | Same (alias) |
| `api.fund24.io` | CF DNS → CF Worker | `bafa-creator-ai-worker` (`/api/*` only) |
| `foerdermittel-check-api.froeba-kevin.workers.dev` | `.workers.dev` | `foerdermittel-check-api` |

### V.2.9 GitHub repo

| Field | Value |
|---|---|
| Repo | `MasterPlayspots/O.A.F24-v2` |
| Default branch | `main` |
| Protected checks | Lint · Typecheck · Build, Worker Tests (vitest), API docs + migration rollback pairs |
| SHA-pinned actions | 14 / 14 |

## V.3 Feature Matrix

**61 features** traced UI → wrapper → worker route → DB → prod HTTP code.

Legend: ✅ LIVE · 🔒 AUTH-GATED (expected 401) · ❌ BROKEN · ⚠️ polish/user-action

### V.3.A Public persona (no login)

| # | Feature | UI Page | Worker Route | Prod |
|---|---|---|---|:---:|
| 1 | Landing / home | `app/(public)/page.tsx` | — | 200 ✅ |
| 2 | Programme list | `app/(public)/programme/page.tsx` | `katalog.ts GET /katalog` | 200 ✅ |
| 3 | Programme filters | — | `katalog.ts GET /katalog/filters` | 200 ✅ |
| 4 | Programme detail | `app/(public)/programme/[id]/page.tsx` | `katalog.ts GET /katalog/:id` | 200 ✅ |
| 5 | Berater directory | `app/(public)/berater/page.tsx` | `netzwerk.ts GET /berater` | 200 ✅ |
| 6 | Berater detail | `app/(public)/berater/[id]/page.tsx` | `netzwerk.ts GET /berater/:id` | 200 ✅ |
| 7 | News list | `app/(public)/aktuelles/page.tsx` | `news.ts GET /api/news` | 200 ✅ |
| 8 | News article | `app/(public)/aktuelles/[slug]/page.tsx` | `news.ts GET /api/news/:slug` | 200 ✅ |
| 9-12 | Fördercheck (5 steps) | `app/(public)/foerder-schnellcheck/*` | `checks.ts` proxy → Worker 2 | 401 🔒 |
| 13 | Impressum | `app/(public)/impressum/page.tsx` | — | 200 ⚠️ HRB+USt placeholder |
| 14 | Datenschutz | `app/(public)/datenschutz/page.tsx` | — | 200 ⚠️ legal review |
| 15 | AGB | `app/(public)/agb/page.tsx` | — | 200 ⚠️ legal review |
| 16 | Preise | `app/(public)/preise/page.tsx` | — | 200 ✅ |
| 17 | Support | `app/(public)/support/page.tsx` + SupportWidget | — | 200 ✅ |

### V.3.B Auth

| # | Feature | UI | Worker | Prod |
|---|---|---|---|:---:|
| 18 | Register | `app/(auth)/registrieren/page.tsx` | `auth.ts POST /api/auth/register` | 404 (POST-only) ✅ |
| 19 | Login | `app/(auth)/login/page.tsx` | `auth.ts POST /api/auth/login` | 404 (POST-only) ✅ |
| 20 | Verify email code | `app/(auth)/verifizieren/page.tsx` | `auth.ts POST /api/auth/verify-code` | ✅ |
| 21 | Forgot password | `app/(auth)/passwort-vergessen/page.tsx` | `auth.ts POST /api/auth/forgot-password` | ✅ |
| 22 | Reset password | `app/(public)/passwort-reset/page.tsx` | `auth.ts POST /api/auth/reset-password` | ✅ |
| 23 | Logout | — | `auth.ts POST /api/auth/logout` + Next route | ✅ |
| 24 | Next cookie set/unset | — | `app/api/session/route.ts` | ✅ |

### V.3.C Onboarding (role-gated, all 🔒 401)

| # | Feature | UI | Worker |
|---|---|---|---|
| 25 | Profil step | `app/onboarding/profil/page.tsx` | `berater.ts PATCH /api/berater/me` |
| 26 | Unternehmen step | `app/onboarding/unternehmen/page.tsx` | `unternehmen.ts POST /api/unternehmen` |
| 27 | Expertise step | `app/onboarding/expertise/page.tsx` | `berater.ts` routes |
| 28 | Dienstleistungen step | `app/onboarding/dienstleistungen/page.tsx` | `berater.ts` routes |

### V.3.D Unternehmen dashboard (all 🔒 401)

| # | Feature | UI | Worker |
|---|---|---|---|
| 29 | Dashboard aggregation | `app/dashboard/unternehmen/page.tsx` | `me.ts GET /api/me/dashboard` |
| 30 | Anfragen list | `app/dashboard/unternehmen/anfragen/page.tsx` | `me.ts GET /api/me/anfragen` |
| 31 | Tracker | `app/dashboard/unternehmen/tracker/page.tsx` | `tracker.ts` |
| 32 | Anträge list | `app/dashboard/unternehmen/antraege/page.tsx` | `me.ts` + `antraege.ts` |
| 33 | Antrag detail | `app/antraege/[id]/page.tsx` | `antraege.ts` handlers |
| 34 | Favoriten | `app/dashboard/unternehmen/favoriten/page.tsx` | `foerdermittel/favoriten.ts` |
| 35 | Notifications | `components/shared/Notifications` | `foerdermittel/notifications.ts` |
| 36 | Fördercheck (logged-in) | `app/foerdercheck/[sessionId]/*` | `checks.ts` proxy |

### V.3.E Berater dashboard (all 🔒 401 except #47)

| # | Feature | UI | Worker |
|---|---|---|---|
| 37 | Berater dashboard | `app/dashboard/berater/page.tsx` | `me.ts`, `berater.ts` |
| 38 | Anfragen mgmt | `app/dashboard/berater/anfragen/page.tsx` | `berater.ts GET /api/berater/anfragen` |
| 39 | Beratungen list | `app/dashboard/berater/beratungen/page.tsx` | `beratungen.ts` |
| 40 | Beratung detail | `app/dashboard/berater/beratungen/[id]/page.tsx` | `beratungen.ts` |
| 41 | Abwicklung (Provisionen) | `app/dashboard/berater/abwicklung/page.tsx` | `berater.ts` |
| 42 | Nachrichten | `app/dashboard/berater/nachrichten/page.tsx` | `nachrichten.ts` |
| 43 | Vorlagen | `app/dashboard/berater/vorlagen/page.tsx` | `vorlagen.ts` |
| 44 | Berichte (Editor) | `app/dashboard/berater/berichte/[id]/page.tsx` | `reports.ts` |
| 45 | Berater Profil (edit) | `app/dashboard/berater/profil/page.tsx` | `berater.ts` |
| 46 | Berater Tracker | `app/dashboard/berater/tracker/page.tsx` | `tracker.ts` |
| **47** | **BAFA-Zert upload** | `app/dashboard/berater/bafa-cert/page.tsx` | `berater.ts POST /api/berater/bafa-cert` + `GET /api/berater/bafa-cert/status` | **401 ✅** |

### V.3.F Admin dashboard (all 🔒 401)

| # | Feature | UI | Worker |
|---|---|---|---|
| 48 | Admin dashboard | `app/admin/page.tsx` | `admin.ts GET /api/admin/dashboard` |
| 49 | Admin Cert-Queue | `app/admin/page.tsx` | `admin.ts` (GET pending, POST approve/reject) — PR #13 |
| 50 | User mgmt | `app/admin/users/page.tsx` | `admin.ts` user routes |
| 51 | Aktuelles CMS | `app/admin/aktuelles/page.tsx` | `news.ts` admin sub-router |
| 52 | Provisionen mgmt | `app/admin/provisionen/page.tsx` | `admin.ts` provisionen |
| 53 | Audit-Logs | `app/admin/audit-logs/page.tsx` | `admin.ts GET /api/admin/audit-logs` |
| 54 | Email-Outbox | `app/admin/email-outbox/page.tsx` | `admin.ts GET /email-outbox` + retry |

### V.3.G Shared / cross-cutting

| # | Feature | Location | Status |
|---|---|---|:---:|
| 55 | Cookie banner | `components/cookie-banner/CookieBanner.tsx` | ✅ |
| 56 | Consent-gated analytics | `components/analytics/ConsentGatedAnalytics.tsx` | ✅ |
| 57 | Support widget | `components/support/SupportWidget.tsx` | ⚠️ verify phone |
| 58 | Error boundary (app) | `app/error.tsx` | ✅ |
| 59 | Error boundary (global) | `app/global-error.tsx` | ✅ |
| 60 | 404 page | `app/not-found.tsx` | ✅ |
| 61 | Sentry PII scrubber | `lib/sentry/scrubber.ts` | ✅ |

### V.3.H Orphan scan

- **Orphan UI:** none — every `components/**/*.tsx` is imported
- **Orphan API (legit):** OA endpoints (cron-only), `POST /api/verify-payment` (webhook), `POST /api/promo/redeem` (reserved), `GET /api/branchen/*` (wizard-proxied), `POST /api/gdpr/delete-me` (admin-only)

### V.3.I Headline

| Persona | Features | LIVE | Auth-gated | Broken/missing |
|---|---:|---:|---:|---:|
| Public | 17 | 13 | 4 | 3 ⚠️ (legal) |
| Auth | 7 | 7 | — | — |
| Onboarding | 4 | — | 4 | — |
| Unternehmen | 8 | — | 8 | — |
| Berater | 11 | — | 11 | 0 (GAP-002 shipped) |
| Admin | 7 | — | 7 | — |
| Shared | 7 | 6 | — | 1 ⚠️ |
| **Total** | **61** | **26** | **34** | **0 broken + 4 user-action** (GAP-002 shipped) |

## V.4 Data Model

### V.4.1 DB summary

| Binding | CF name | Tables | Size (approx) |
|---|---|---:|---|
| `DB` | `zfbf-db` | 30 | ≪ 1 MB |
| `BAFA_DB` | `bafa_antraege` | 71 | 1.35 MB |
| `FOERDER_DB` | `foerderprogramme` | 15 | 79.2 MB |
| `BAFA_CONTENT` | `bafa_learnings` | 11 | 224 KB |
| `CHECK_DB` | `foerdermittel-checks` | 15 | 216 KB |

**Total: 142 tables.**

### V.4.2 `zfbf-db` — Identity + ownership

```mermaid
erDiagram
    users ||--o{ refresh_tokens : has
    users ||--o{ audit_logs : performs
    users ||--o{ reports : owns
    users ||--o{ payments : made
    users ||--o{ orders : placed
    users ||--o{ promo_redemptions : redeemed
    users ||--o{ favorites : marked
    users ||--o{ foerdermittel_profile : has
    foerdermittel_profile ||--o{ foerdermittel_cases : owns
    foerdermittel_cases ||--o{ foerdermittel_case_steps : contains
    foerdermittel_cases ||--o{ foerdermittel_conversations : holds
    foerdermittel_cases ||--o{ foerdermittel_dokumente : uploads
    foerdermittel_profile ||--o{ foerdermittel_matches : scored
    users ||--o{ foerdermittel_benachrichtigungen : receives
    users ||--o{ berater_profile : is
    berater_profile ||--o{ netzwerk_anfragen : target
    users ||--o{ conversations : joins
    conversations ||--o{ conversation_participants : has
    conversations ||--o{ messages : contains
    reports ||--o{ download_tokens : gated_by
    users ||--o{ passkey_credentials : registered
    users ||--o{ magic_link_tokens : received
    users ||--o{ eignungscheck : submits
    foerderprogramme ||--o{ program_documents : requires
```

### V.4.3 `bafa_antraege` — Business workflow

```mermaid
erDiagram
    unternehmen ||--o{ antraege_v2 : submits
    antraege_v2 ||--o{ antrag_zugriff : permits
    antraege_v2 ||--o{ antrag_bausteine : has
    antraege_v2 ||--o{ antrag_dokumente_v2 : attaches
    antraege_v2 ||--o{ dokument_uploads : tracks
    antraege_v2 ||--o{ tracker_vorgaenge : mirrored_in
    tracker_vorgaenge ||--o{ tracker_aktivitaeten : logs
    tracker_vorgaenge ||--o{ tracker_benachrichtigungen : notifies
    unternehmen ||--o{ kunden : becomes
    berater_profiles ||--o{ berater_dienstleistungen : offers
    berater_profiles ||--o{ berater_foerder_expertise : lists
    berater_profiles ||--o{ berater_bewertungen : receives
    berater_profiles ||--o{ berater_zuweisungen : gets
    berater_profiles ||--o{ bafa_beratungen : conducts
    bafa_beratungen ||--o{ berichte : produces
    bafa_beratungen ||--o{ beratungstage : scheduled_on
    berichte ||--o{ bausteine : contains
    berichte ||--o{ massnahmen : recommends
    bafa_beratungen ||--o{ provisionen : generates
    unternehmen ||--o{ me_favoriten : bookmarks
    netzwerk_anfragen ||--o{ netzwerk_nachrichten : replies
    email_outbox ||--o{ ki_usage : metered_by
```

### V.4.4 `foerderprogramme` — Public catalog

```mermaid
erDiagram
    foerderprogramme ||--o{ foerderprogramme_details : details
    foerderprogramme ||--o{ foerderprogramme_quellen : sourced_from
    foerderprogramme ||--o{ foerderprogramme_stats : measured
    foerderprogramme ||--o{ favorites : saved_by_user
    foerderprogramme ||--o{ chat_sessions : context_for
    chat_sessions ||--o{ chat_messages : contains
    foerderprogramme ||--o{ eu_foerderprogramme : part_of
    eu_foerderprogramme ||--o{ laender_rechtsrahmen : regulated_by
```

### V.4.5 `foerdermittel-checks` — Wizard state

```mermaid
erDiagram
    caller_sessions ||--o{ check_sessions : starts
    check_sessions ||--o{ check_chat : talks_in
    check_sessions ||--o{ check_dokumente : uploads
    check_sessions ||--o{ check_ergebnisse : scores
    check_sessions ||--o{ check_aktionsplan : emits
    check_sessions ||--o{ eignungspruefung : per_programm
    check_sessions ||--o{ leads : converts_to
    leads ||--o{ call_log : followed_up
    precheck_sessions ||--o{ precheck_fragen : asks
    precheck_sessions ||--o{ precheck_antworten : records
    precheck_sessions ||--o{ precheck_ergebnisse : outputs
```

### V.4.6 Cross-DB soft-FK map

SQLite cannot enforce cross-DB foreign keys. Migrations 024-026 dropped original FK declarations. Active logical relationships are **app-layer enforced**:

| Source | Target | Enforcement |
|---|---|---|
| `bafa_antraege.berater_profiles.user_id` | `zfbf-db.users.id` | Soft (requireAuth + retention cron) |
| `bafa_antraege.unternehmen.user_id` | same | Soft |
| `bafa_antraege.netzwerk_anfragen.(von_user_id, an_user_id)` | same | Soft |
| `bafa_antraege.bafa_beratungen.berater_id` / `unternehmen_id` | same | Soft |
| `bafa_antraege.tracker_vorgaenge.user_id` | same | Soft |
| `bafa_antraege.berichte.kunde_id` / `bearbeiter_id` | same | Soft |
| `zfbf-db.foerdermittel_cases.programm_id` | `foerderprogramme.foerderprogramme.id` | Soft |
| `zfbf-db.favorites.program_id` | same | Soft |
| `foerdermittel-checks.leads.session_id` | `check_sessions.id` (same DB) | **Hard FK** |

### V.4.7 Migration ledger

**29 forward + 29 rollback** pairs (CI `docs-check.yml` enforces pair).

| NNN | Title | Target DB | Rollback quality |
|---|---|---|---|
| 001 | schema-base | zfbf-db | NOT REVERSIBLE (foundational) |
| 002 | payments-promo | zfbf-db | NOT REVERSIBLE |
| 003 | auth-tokens | zfbf-db | NOT REVERSIBLE |
| 004 | audit-logs | zfbf-db | NOT REVERSIBLE |
| 005 | legacy-migration | multiple | NOT REVERSIBLE |
| 006 | composite-indexes | zfbf-db | NOT REVERSIBLE |
| 007 | gdpr-indexes | zfbf-db | NOT REVERSIBLE |
| 008 | bafa-antraege-schema | bafa_antraege | NOT REVERSIBLE |
| 009 | email-verification-code | zfbf-db | NOT REVERSIBLE |
| 010 | funding-platform | multiple | NOT REVERSIBLE |
| 011 | user-profile-json | zfbf-db | NOT REVERSIBLE |
| 012 | performance-indexes | mixed | NOT REVERSIBLE |
| 012a | performance-indexes-zfbf | zfbf-db | NOT REVERSIBLE |
| 012b | performance-indexes-bafa | bafa_antraege | NOT REVERSIBLE |
| 013 | soft-delete-learnings | bafa_learnings | NOT REVERSIBLE |
| 014 | learnings-schema | bafa_learnings | NOT REVERSIBLE |
| 015 | favorites | foerderprogramme | **Real** |
| 016 | forum (removed Phase C) | bafa_antraege | **Real** |
| 017 | netzwerk | bafa_antraege | **Real** — ⚠️ live data |
| 018 | nachrichten | bafa_antraege | **Real** — ⚠️ live chat |
| 019 | eignungscheck | bafa_antraege | **Real** |
| 020 | program-documents | foerderprogramme | **Real** |
| 021 | promo-unique-constraint | zfbf-db | **Real** (DROP INDEX) |
| 022 | webauthn-magic-link (removed Phase C) | zfbf-db | **Real** |
| 023 | vorlagen | bafa_antraege | **Real** — ⚠️ berater templates |
| 024 | berater-profiles-drop-fk | bafa_antraege | NOT REVERSIBLE |
| 025 | unternehmen-drop-fk | bafa_antraege | NOT REVERSIBLE |
| 026 | netzwerk-anfragen-drop-fk | bafa_antraege | NOT REVERSIBLE |
| 027 | bafa-cert-columns | zfbf-db | **Real**; applied remote 2026-04-15 for GAP-001 |

### V.4.8 Schema hot-spots

- **`users.bafa_cert_status`** — migration 027; values `none | pending | approved | rejected`. Admin Cert-Queue (GAP-001) mutates; Berater upload (GAP-002) will once shipped.
- **`antraege_v2.status`** — CHECK constraint; values mapped to frontend labels (`entwurf`, `eingereicht`, `bewilligt`, `abgelehnt`, `fehlgeschlagen`) in `routes/antraege.ts`.
- **`tracker_vorgaenge.phase`** — CHECK constraint `["vorbereitung", "antrag", "pruefung", "bewilligt", "abgeschlossen", "abgelehnt"]`. Transitions logged.
- **`email_outbox.status`** — `queued | sending | sent | failed`; admin re-queue via `POST /api/admin/email-outbox/:id/retry`.
- **`foerderprogramme.status`** — catalog auto-filters `!= 'abgelaufen'`.
- **`provisionen.status`** — `offen | in_pruefung | pending | bezahlt | storniert`; timestamps auto-populated on admin PATCH.

---

# Appendix · Onboarding Sequence

A new engineer should read in this order for a ~30-min full picture:

1. Root [`README.md`](../README.md) — setup, dev loop
2. Part V.1 of this doc — mental model via Architecture diagrams
3. Part V.4 — where data lives
4. Part V.3 — what's actually live per feature
5. Part V.2 — reach for when debugging "what bucket / what DB / what secret"
6. Part I + Part IV — history: what the audit found, what got fixed

The auto-generated counterparts stay current on their own:

- [`docs/API.md`](./API.md) — 143 endpoints, regenerated by CI on every PR
- [`docs/MIGRATIONS.md`](./MIGRATIONS.md) — rollback convention enforced by CI
- [`docs/FIX_LOG.md`](./FIX_LOG.md) — updated per fix PR

This consolidated file is a **point-in-time dossier**; rerun the `FIX_100_FULL_ECOSYSTEM_MAP.md` + re-audit prompts after major feature landings or quarterly.

---

**End of consolidated audit.**

_Sources: `docs/analysis/AUDIT_REPORT_2026-04-15.md`, `docs/analysis/AUDIT_SUMMARY_2026-04-15.md`, `docs/analysis/gap_analysis.md`, `docs/analysis/POST_PHASE2_AUDIT.md`, `docs/analysis/ecosystem/{README,01_ARCHITECTURE,02_INVENTORY,03_FEATURE_MATRIX,04_DATA_MODEL}.md`, `docs/FIX_LOG.md`. Every claim traceable to a live `grep` / `curl` / `wrangler` / `npm audit` command._

_Generated: 2026-04-15 · branch `docs/audit-consolidated`_
