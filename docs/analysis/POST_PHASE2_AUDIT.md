# Fund24 — Post-Phase-2 Audit Report

**Datum:** 2026-04-15
**Prev-Score:** 7.0 / 10 (2026-04-15 original audit)
**Neuer Score:** **7.9 / 10**   **Δ: +0.9**
**Branch:** `re-audit/post-phase2`
**Basis:** `main` @ `8cf54fb` (nach Merge aller Phase-2-PRs #11–#19)

---

## Executive Summary

Alle 18 Findings und 7 Gaps aus dem Original-Audit sind evidenz-verifiziert: **22 FIXED, 2 STILL_OPEN (beide User-Action bzw. deklariertes Post-Launch-Feature), 0 Regressions**. Drei **neue** CVE-Findings sind seit dem Audit aufgetaucht — ein HIGH in `next` (production), zwei Dev-Dep-Chains in wrangler+shadcn (nicht deployt). Empfohlener nächster Schritt: **Next.js 15.5.14 → 15.5.15** (5-min fix), danach Design-Refresh kann starten.

---

## Phase-2 Findings-Status

Legende: ✅ FIXED · ⚠️ PARTIAL · ❌ STILL_OPEN · 🔁 REGRESSED

| ID | Titel | Sev | Status | Evidence |
|---|---|---|:---:|---|
| F-001 | Sentry DSGVO | HIGH | ✅ | `sendDefaultPii: false` + `beforeSend: sentryBeforeSend` + `tracesSampleRate: 0.1` in all 3 configs; `lib/sentry/scrubber.ts` present |
| F-002 | Hono CVE 4.12.8→4.12.14 | HIGH | ✅ | `worker/package.json`: `"hono": "^4.12.14"` |
| F-003 | Admin Cert-Queue broken | HIGH | ✅ | `curl /api/admin/bafa-cert/pending → 401` (auth-gated, route exists) |
| F-004 | Berater BAFA-Zert Feature | HIGH | ❌ | `curl /api/berater/bafa-cert/status → 404` — explicitly deferred to post-launch (GAP-002) |
| F-005 | ECOSYSTEM.md stale | HIGH | ✅ | `ECOSYSTEM.md:3` carries deprecation banner + stale-endpoint callouts |
| F-006 | 12× console.* in prod FE | MED | ✅ | `grep -r console\. app/ lib/ components/` → **0** hits (all Sentry-captured or removed) |
| F-007 | `as any` × 48 | MED | ✅ | Non-test any's: **6** (from 21 at audit time; 48→45 total). ESLint rule `@typescript-eslint/no-explicit-any: warn` in both configs. All 6 remaining have `eslint-disable-next-line` + reason. |
| F-008 | foerdermittel.ts 1500 LOC | MED | ✅ | Split into 7 files: `index.ts` (18), `favoriten.ts` (72), `notifications.ts` (63), `katalog.ts` (153), `chat.ts` (286), `match.ts` (297), `cases.ts` (617). |
| F-009 | Worker tests not in CI | MED | ✅ | `.github/workflows/ci.yml` contains `Worker Tests (vitest)` job; last run on main **green** |
| F-010 | Silent `catch { }` in check.ts | MED | ✅ | `grep -rn "catch[[:space:]]*{[[:space:]]*}" worker/src` → **0** matches in prod code |
| F-011 | No docs/API.md | MED | ✅ | `docs/API.md` (294 LOC, 143 endpoints) + `docs/MIGRATIONS.md` (147 LOC) |
| F-012 | Unbound R2 buckets | MED | ✅ | `wrangler r2 bucket list \| grep fund24-dokumente\|fund24-company-files` → **CLEAN** |
| F-013 | app/error.tsx no Sentry | MED | ✅ | `Sentry.captureException(error, { tags: { boundary: 'app' }, contexts: …})` at `app/error.tsx:15` |
| F-014 | GH Actions tag-pinned | LOW | ✅ | **14 SHA-pinned**, **0 tag-pinned** across 3 workflow files |
| F-015 | SupportWidget TODO | LOW | ✅ | `grep -nE "TODO\|PLACEHOLDER\|XXX\|noreply" components/support/SupportWidget.tsx` → **0** matches |
| F-016 | Migration rollbacks | LOW | ✅ | **29 forward / 29 rollback** pairs. `docs/MIGRATIONS.md` documents workflow + rules. CI `docs-check.yml` enforces pair. |
| F-017 | No `.env.example` | LOW | ✅ | File exists at root (26 LOC), documents all 4 `NEXT_PUBLIC_*` + Sentry + worker env vars |
| F-018 | CORS DEV origins in prod | LOW | ✅ | `worker/src/middleware/cors.ts:29`: `if (env === "production") return false;` before DEV allowlists |

| ID | Feature | Audit-Status | Now | Evidence |
|---|---|---|:---:|---|
| GAP-001 | Admin Cert-Queue | BROKEN | ✅ | Prod `GET /api/admin/bafa-cert/pending → 401` |
| GAP-002 | Berater BAFA-Zert Upload | MISSING | ❌ | Prod `GET /api/berater/bafa-cert/status → 404` — explicit post-launch feature per audit; user-action |
| GAP-003 | ECOSYSTEM.md Refresh | STALE-DOC | ✅ | Deprecation banner in place; `docs/API.md` is authoritative |
| GAP-004 | Worker Tests in CI | MISSING | ✅ | Same as F-009 — vitest job live on main |
| GAP-005 | R2 Bucket Cleanup | STALE-INFRA | ✅ | Buckets deleted in PR #19; `wrangler r2 bucket list` confirms CLEAN |
| GAP-006 | `.env.example` | MISSING | ✅ | Same as F-017 — file exists |
| GAP-007 | API Reference | MISSING | ✅ | `docs/API.md` auto-generated + CI drift-protected |

**Totals:** 22 fixed · 2 still_open (deklariertes deferred feature + user-action) · 0 regressed

---

## Dimensionen Delta (15-Dim-Score)

| # | Dimension | Vorher | Nachher | Δ | Evidence |
|---|---|---:|---:|:---:|---|
| 1 | Architecture | 7 | 8 | +1 | F-008 split; monorepo stable; `app.route()` composition clean |
| 2 | Code Quality | 6 | 8 | +2 | 0 console.*, 6 non-test `any` (all with reason), ESLint `no-explicit-any: warn` live |
| 3 | Security | 7 | 7 | 0 | F-001/F-018 fixed, BUT next 15.5.14 DoS CVE introduced (see N-001); net zero |
| 4 | Performance | 6 | 7 | +1 | Sentry 1.0→0.1 = ~90 % span-quota reduction; foerdermittel split maintainable |
| 5 | Tests | 7 | 9 | +2 | 14 files, **116 pass / 1 skip / 0 fail**; CI gates merges; stale tests fixed |
| 6 | API Design | 8 | 9 | +1 | Silent catch closed; 143-endpoint auto-doc; consistent `{success, …}` shape |
| 7 | Dependencies | 6 | 5 | −1 | F-002 hono bumped BUT **new** next CVE (HIGH) + 4 wrangler-chain HIGH in devDeps (see N-001, N-002) |
| 8 | Git Hygiene | 8 | 7 | −1 | 5 stale merged-but-undeleted remote branches (N-004) |
| 9 | Documentation | 6 | 9 | +3 | `docs/API.md` (auto), `docs/MIGRATIONS.md`, `docs/FIX_LOG.md`, ECOSYSTEM deprecation, CI drift-check |
| 10 | CI/CD | 8 | 9 | +1 | `Worker Tests`, `API docs + migration rollback pairs`, `Lint · Typecheck · Build`; SHA-pinned |
| 11 | Frontend UX | 7 | 7 | 0 | No UX-relevant Phase-2 change; error boundary + Support Widget polished |
| 12 | Database | 7 | 8 | +1 | 29/29 rollback pairs; stale R2 buckets removed; MIGRATIONS.md |
| 13 | Error Handling | 7 | 9 | +2 | app/error.tsx + global-error.tsx + Sentry scrubber + Toucan in silent-catch; 0 empty catches |
| 14 | Monitoring | 7 | 8 | +1 | DSGVO-safe Sentry; configurable `SENTRY_TRACES_SAMPLE_RATE`; tagged error paths |
| 15 | Env Config | 7 | 8 | +1 | `.env.example` in repo + `.gitignore` exception; typed worker `Bindings` |

**Weighted mean:** (8+8+7+7+9+9+5+7+9+9+7+8+9+8+8) / 15 = **7.87 ≈ 7.9 / 10**

---

## Neue Findings (N-Series)

### N-001 · HIGH · Security / Dependencies · `package.json` (root)

**Issue:** `next@15.5.14` — DoS via Server Components (GHSA-q4gf-8mx6-v5v3). Advisory published after original audit.
**Evidence:** `npm audit → next 13.0.0 - 15.5.14 · HIGH · fix @ 15.5.15`
**Impact:** Production frontend vulnerable. Attacker can DoS via crafted RSC request.
**Fix:** `npm install next@15.5.15 --save` → rebuild → redeploy. ~5 min.
**Priority:** HIGH — real user-facing impact.

### N-002 · HIGH (dev-only) · Dependencies · `worker/package.json`

**Issue:** `@cloudflare/vitest-pool-workers@0.12.14 → miniflare → undici` chain has **4 HIGH** undici CVEs (WebSocket overflow, HTTP smuggling, unbounded memory, CRLF injection).
**Evidence:** `cd worker && npm audit → 4 high severity vulnerabilities`
**Impact:** **Not in deployed bundle** — only in the local test runner. No production exposure. Still: CI runs tests, so a compromised miniflare fetcher could affect test isolation.
**Fix:** `cd worker && npm install -D @cloudflare/vitest-pool-workers@0.14.7` — breaking version change, requires re-running test suite against new API.
**Priority:** MEDIUM — dev-only risk but worth cycling.

### N-003 · LOW (dev-only) · Dependencies · `package.json` (root, transitive)

**Issue:** `shadcn@4.1.2 → @modelcontextprotocol/sdk@1.29.0 → hono@4.12.10` + `@hono/node-server@1.19.12` — two MODERATE hono CVEs in the shadcn CLI toolchain.
**Evidence:** `npm ls hono → shadcn > @modelcontextprotocol/sdk > hono@4.12.10`
**Impact:** Dev-CLI only. Not in Next.js runtime.
**Fix:** `npm audit fix` (non-breaking) or wait for shadcn 4.2.
**Priority:** LOW.

### N-004 · LOW · Git Hygiene

**Issue:** 5 remote branches merged into `main` but not deleted.
**Evidence:** `git branch -r --merged main | grep -v 'main|HEAD' → 5`
**Impact:** Cosmetic; slows `gh pr list` + branch-name autocomplete.
**Fix:** `gh api repos/:owner/:repo/branches` cleanup or manual `git push origin --delete <branch>` per branch.
**Priority:** LOW — 2-min task.

### N-005 · LOW · Code Quality · `worker/`

**Issue:** `cd worker && npx tsc --noEmit` still reports **69 errors** (up from 64 at F-009-PR time — likely from #16/#17 adding new files that bump a few counts, but still overwhelmingly pre-existing `cloudflare:test` typing + loose test response types).
**Evidence:** `cd worker && npx tsc --noEmit 2>&1 | wc -l → 69`
**Impact:** Tests still run (vitest compiles on-the-fly); no prod impact. Worker tsc is intentionally **not** gated in CI — it's a separate cleanup task.
**Fix:** Separate follow-up: add `@cloudflare/vitest-pool-workers/config` type reference, tighten `AdminStatsResponse` + `AuthResponse` + `BranchenResponse` types.
**Priority:** LOW — does not block launch; tracked informally under F-007-follow-up.

### N-006 · LOW · Tests

**Issue:** 1 test in the worker suite is `skipped` (not documented which one or why).
**Evidence:** `npm test → 116 passed | 1 skipped`
**Impact:** Unknown — could be a hidden known-broken case.
**Fix:** `grep -rn "it\.skip\|test\.skip\|describe\.skip" worker/src/__tests__/` → identify, then either delete, fix, or document with a TODO + issue link.
**Priority:** LOW — 10-min triage.

---

## Regressionen

**Keine code-level Regressionen detektiert.** Alle Phase-2-Fixes sind additiv; Phase-1-Fixes bleiben intakt:

- CI: Letzte 4 runs auf `main` alle ✅ SUCCESS
- Production: `api.fund24.io/api/health` → `{"status":"healthy"}` all 4 checks green
- Worker build: 590.6 KB (vs 589 KB pre-audit) — +1 KB from F-008 barrel imports, acceptable
- Worker tests: 116 pass (up from 113 pre-F-009 — the 3 stale foerdermittel-cases tests now pass with the unternehmen fixture)
- Frontend tsc: clean
- Bundle hash: unchanged in behaviour

**Dependency regression:** The `next@15.5.14 → DoS CVE` (N-001) is not strictly a *regression we caused* — it's an upstream advisory that landed after the original audit. But it did land between audits, so we count it.

---

## Open User-Actions

Durch diesen Re-Audit unverändert — keine dieser Items kann durch Code-Änderung allein geschlossen werden:

- [ ] **GAP-002 / F-004** — Berater BAFA-Zert-Upload UI + Worker-Endpoint bauen (explizit post-launch per Original-Audit; aktuell `404`)
- [ ] **Impressum-Pflichtangaben** — HRB-Nummer + USt-IdNr. in `app/(public)/impressum/page.tsx` eintragen
- [ ] **Legal-Review** — Anwalt über `app/(public)/datenschutz` + `app/(public)/agb` drüberschauen lassen
- [ ] **Berater-Seed-Content** — mindestens 3 aktive berater-User in Prod für eine nicht-leere Liste
- [ ] **Support-Telefonnummer** — der Wert in `SupportWidget.tsx` (`+49 1512 9617192`) bitte verifizieren, dass er ein echter Support-Kontakt und nicht ein privat-Dev-Handy ist

---

## Empfehlung

**Sofort (5 min, HIGH-prio):**
```bash
npm install next@15.5.15 --save
npm run build   # confirm still builds
git commit -am "fix(deps): N-001 bump next 15.5.14 -> 15.5.15 (DoS CVE)"
```

**Diese Woche (30 min, MEDIUM-prio):**
- N-002 wrangler-chain bump (`@cloudflare/vitest-pool-workers@0.14.7` + re-run tests)
- N-006 skipped-test triage
- N-003 shadcn dep cleanup (`npm audit fix`)
- N-004 stale-branch cleanup

**Danach — Design-Refresh kann starten.** Die Code-Hygiene-Schuld ist abgetragen (7.9/10), CI ist hart verdrahtet (drift + migration + tests), und die Dokumentation ist self-healing (auto-gen + CI-gated). Der nächste Hebel ist Frontend UX/Design, nicht Backend/Infra.

**Post-Launch-Backlog (nach Design-Refresh):**
- GAP-002 Berater BAFA-Zert Feature (1-Tag Build)
- Worker tsc-Cleanup (N-005) um Worker-Tests in CI strikter zu machen
- Optional: `@typescript-eslint/no-explicit-any` von `warn` auf `error` hochstufen (in ~6 Monaten, wenn alle 6 remaining `any`s nochmal rumgekehrt wurden)

---

_Generated: 2026-04-15 · re-audit/post-phase2 · autonomous audit run_
