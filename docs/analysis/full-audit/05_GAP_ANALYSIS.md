# Phase 5 — Dead / Orphan / Gap Analysis

**Branch:** `audit/phase-5-gap-analysis`
**Generated:** 2026-04-15
**Cross-references:** Phase 1 (pages), Phase 2 (CTAs+routing), Phase 3 (API), Phase 4 (DB)

---

## Executive Summary

| Category | Count | Leftmost source |
|---|---|---|
| Dead files in `lib/` + `components/` | **5** | static import scan |
| Dead frontend wrapper exports | **10** | Phase 3 agent |
| Dead worker endpoints (no caller) | **50** (of 151) | Phase 3 `03_api_backend.json` |
| Unmatched frontend calls (real-dead after worker-check cross-check) | **40** | Phase 3 |
| Orphan pages (unreachable via any scanned nav/link) | **9** | Phase 2 |
| Orphan-table candidates | **97** | Phase 4 |
| Confidently-dead tables | **18** | manual triage of Phase 4 list |
| Feature gaps (Coming Soon vs. live; unimplemented buttons) | **12** | grep |
| Env-var / dependency gaps | 2 + 2 | `.env.example` + `package.json` vs. code |
| Phase 5 findings total | **15** | aggregated |

**Bottom line:** The codebase carries two generations of schemas, two workers with overlapping surfaces, and a Q2-2026 "Coming Soon" narrative pasted over features that actually ship. 50 worker endpoints have no caller, 40 frontend wrappers point at paths that don't resolve on either worker, and 18 database tables have no reader or writer anywhere. The live UX is frictioned by false banners that tell users their functional dashboard is "still in development."

---

## 1. Dead Files in `lib/` + `components/` (5)

Not imported by any scanned `.ts`/`.tsx` in `app/`, `lib/`, `components/`, `middleware.ts`, or `sentry.*.config.ts`:

| File | Notes |
|---|---|
| `components/ui/tabs.tsx` | shadcn primitive |
| `components/ui/sheet.tsx` | shadcn primitive |
| `components/ui/separator.tsx` | shadcn primitive |
| `components/ui/dropdown-menu.tsx` | shadcn primitive |
| `components/shared/EmptyState.tsx` | Unused shared placeholder |

**Recommendation:** Keep shadcn primitives (may be pulled in by future pages); delete `EmptyState.tsx` if no near-term use case.

---

## 2. Dead Frontend Wrapper Exports (10)

Surfaced by Phase 3 frontend-calls agent. Not imported by any page/component:

```
lib/api/fund24.ts     → getStats, verifyEmail, deleteDokument, deleteAdminNews, addFavorit (variant)
lib/api/berater.ts    → listExpertise, listDienstleistungen
lib/api/unternehmen.ts → getUnternehmen
lib/api/check.ts      → createTrackerVorgang, deleteTrackerVorgang
```

Delete after confirming no dynamic-import usage.

---

## 3. Dead Worker Endpoints (50 of 151)

From Phase 3. Top examples ready for removal or audit:

| Endpoint | Route file | Likely reason |
|---|---|---|
| `GET /api/me/dashboard` | `worker/src/routes/me.ts` | Superseded by `GET /api/dashboard/:rolle` on worker-check |
| `GET /api/branchen/tree` | `worker/src/routes/branchen.ts` | Deprecated — not called |
| Several `/api/gdpr/*` utilities | `worker/src/routes/gdpr.ts` | Admin-panel features never shipped |
| `/api/oa/*` read helpers | `worker/src/routes/oa.ts` | Diagnostic; likely kept intentionally |
| `/api/reports/*` variants | `worker/src/routes/reports.ts` | Legacy paths alongside active ones |

**Full list** in `05_gap_analysis.json → dead_endpoints_sample` (top 30). Remaining 20 in `03_api_backend.json → dead_endpoints_sample[30:]`.

Manual triage needed — some are admin-only, some are cron-adjacent, some are wrapper-unused-but-hit-via-fetch. Remove only after a grep-by-path.

---

## 4. Unmatched Frontend Calls (40 real-dead, 6 handled by worker-check)

40 wrapper functions in `lib/api/*` call endpoints that don't appear on either worker via literal grep. Confirmed genuine mismatches:

| Call | Wrapper | Expected worker | Issue |
|---|---|---|---|
| `GET /api/stats` | `fund24.ts:getStats` | fund24 | No route handler exists |
| `GET /api/filter-options` | `fund24.ts:getFilterOptions` | fund24 | No handler — page likely falls back |
| `GET /api/foerderprogramme` / `.../:id` | `fund24.ts:getProgramme(1-level list) / getProgramm(detail)` | fund24 | **H-P1-01 — dead endpoint.** |
| `POST /api/me/notifications/:id/read` + read-all | `fund24.ts:markNotificationRead` etc. | fund24 | Handler probably on `/api/me/*` agent missed |
| `GET/POST/PATCH /api/berichte` | `fund24.ts:listBerichte / createBericht / updateBericht / finalizeBericht` | fund24 | Route file may not exist (no `berichte.ts` in Phase-3 inventory) — **potential broken backend feature** |
| `GET /api/berater/me/kunden` | `fund24.ts:listBeraterKunden` | fund24 | Needs verification |
| `DELETE /api/dokumente/:id` | `fund24.ts:deleteDokument` | fund24 | Same |

Full list: `05_gap_analysis.json → unmatched_frontend_calls`.

**Most important finding inside this category:** `lib/api/fund24.ts` implements a full `berichte` CRUD (GET list, GET/:id, POST, PATCH/:id, PATCH/:id/finalize) but Phase 3's worker scan found **no `berichte.ts`** route file. The `/dashboard/berater/berichte/[id]` page wires `autosave` to `PATCH /api/berichte/:id` and `finalize` to `PATCH .../finalize`. **Very likely broken backend feature** — to verify on Phase-6 landing check.

---

## 5. Orphan Pages (9)

From Phase 2 (after Footer + Navbar + admin quickLinks edges added):

| Route | Real orphan? |
|---|---|
| `/passwort-reset` | no — reached via email |
| `/antraege/[id]` | **yes** — no page links, also has auth leak (H-P1-02) |
| `/dashboard/unternehmen/tracker` | **yes** |
| `/dashboard/berater/{berichte, profil, tracker, vorlagen}` | **yes** — 4 sub-pages missing from berater-dashboard quickLinks |
| `/admin/{audit-logs, email-outbox}` | **yes** — missing from admin `quickLinks` array |

**Fix:** add links to `app/dashboard/berater/page.tsx` + `app/admin/page.tsx` + a real sidebar component.

---

## 6. Orphan Tables (18 confidently dead, 97 candidates)

| Table | DB | Reason |
|---|---|---|
| `call_log`, `caller_sessions`, `password_reset_tokens` | foerdermittel-checks | Phone/voice flow leftover |
| `rechtsrahmen`, `kombinationsregeln`, `foerder_kombinationen` | bafa_antraege | Kombinationsregeln feature never wired |
| `bafa_custom_templates`, `bafa_phasen`, `bafa_vorlagen` | bafa_antraege | Superseded by `vorlagen` (12 cols) |
| `forum_antworten`, `forum_threads`, `forum_upvotes` | bafa_antraege | Forum feature shelved |
| `forum_posts`, `forum_threads` | zfbf-db | Forum feature (second copy) |
| `antraege` (legacy) | bafa_antraege | Replaced by `antraege_v2` |
| `businessplaene`, `foerderkonzepte`, `foerderplaene` | foerderprogramme | No reader or writer in any route |

Full orphan-candidate list in `05_gap_analysis.json → orphan_tables`. The other 79 candidates are admin-only or cron-only — needs per-endpoint grep before deletion.

---

## 7. Feature Gaps (12)

### Features *marked* Coming Soon but *actually functional*

| Feature | Location | Note |
|---|---|---|
| **Admin-Bereich** | `app/admin/layout.tsx` eta "intern, ohne ETA" | BAFA-cert queue + users + provisionen endpoints live; admin can operate |
| **Berater-Dashboard (whole subtree)** | `app/dashboard/berater/layout.tsx` eta Q2 2026 | All 10 sub-pages have working CRUD; PR-merged |
| **Favoriten (unternehmen)** | `app/dashboard/unternehmen/favoriten/layout.tsx` eta Q2 2026 | Endpoint + table live |
| **Antrags-Tracker** | `app/dashboard/unternehmen/tracker/layout.tsx` eta Q2 2026 | `/api/tracker` + tracker_* tables live |
| **Anfragen-Verwaltung** | `app/dashboard/unternehmen/anfragen/layout.tsx` eta Q2 2026 | `netzwerk_anfragen` table + endpoints live |
| **Berater-Verzeichnis** | `app/(public)/berater/layout.tsx` eta Q2 2026 | 16 seeded berater profiles; 16 sitemap URLs |
| **Aktuelles / News-Blog** | `app/(public)/aktuelles/layout.tsx` eta Q2 2026 | **0 articles** in DB — blanket banner reflects reality for now |

### Features *not* marked Coming Soon but *not actually working*

| Feature | Evidence |
|---|---|
| **Programm-Detail-Seite** | `/programme/[id]` 404 for all IDs — `getProgramm()` calls dead endpoint (H-P1-01) |
| **PDF-Export Fördercheck-Ergebnisse** | `/foerdercheck/[sessionId]/ergebnisse` button is disabled + onClick is `alert("wird in Kürze implementiert")` |
| **BAFA-Cert Upload (Berater-seitig)** | Designed in PR #26 — not merged. Admin queue (merged PR #13) reads but nobody writes. |
| **Forum** | Tables exist across 2 DBs; no UI pages, no endpoints — feature decided but not built |
| **Kombinationsregeln** | Tables exist; no endpoint writes/reads |

### Features only partially implemented

| Feature | Evidence |
|---|---|
| **Phone/voice flow (leads → call_log)** | foerdermittel-checks DB has `call_log`/`caller_sessions` but no handler or UI |
| **Legacy antraege** | `antraege` + `antraege_v2` both migrated — `_v2` used, legacy left behind |

---

## 8. Env-Var Gaps (2)

| Gap | Detail |
|---|---|
| `JWT_SECRET` missing from frontend `.env.example` | `middleware.ts:34` reads `process.env.JWT_SECRET` to verify the HttpOnly `fund24-token` cookie. `.env.example` lists JWT_SECRET only in the "Worker secrets" commented block. On Vercel, a new engineer onboarding the frontend could fail to set it — middleware fails closed (good) but all protected routes reject (bad). Add to the Frontend section of `.env.example`. |
| `NEXT_PUBLIC_SUPPORT_PHONE` / `_EMAIL` / `_HOURS` (PR #24 design) | Not on main. If PR #24 merges, update `.env.example`. |

No `in_example_but_not_used` gaps — every var in `.env.example` is consumed somewhere.

---

## 9. Dependency Gaps (2 unused)

Unused in source code anywhere:

- **`@tailwindcss/typography`** — no `@plugin` in `globals.css`, no config import
- **`@tanstack/react-query-devtools`** — no component imports it (not even under `lib/providers.tsx`)

False positives worth noting: `react-dom`, `tw-animate-css`, `jose` were initially flagged by naive grep but are all actually used (peer dep, `globals.css @import`, `middleware.ts` import).

---

## 10. Phase 5 Findings (15 ready for Phase 6 aggregation)

| ID | Severity | Summary |
|---|---|---|
| G-P5-01 | medium | ComingSoonBanner over functional subtrees (admin, berater dashboard, unternehmen favoriten/tracker/anfragen, aktuelles, berater directory) |
| G-P5-02 | medium | PDF-Export double-broken (disabled + mock alert) |
| G-P5-03 | medium | BAFA-Cert Upload (Berater) designed in PR #26, not merged |
| G-P5-04 | medium | `JWT_SECRET` not in frontend .env.example |
| G-P5-05 | low | Forum tables in 2 DBs — no UI, no endpoints |
| G-P5-06 | low | Kombinationsregeln feature designed in schema, never wired |
| G-P5-07 | low | Phone/voice flow tables leftover |
| G-P5-08 | low | Legacy `antraege` table superseded by `antraege_v2`, not dropped |
| G-P5-09 | low | 10 dead frontend wrapper exports in `lib/api/*` |
| G-P5-10 | low | 5 unused component files (4 shadcn primitives + EmptyState) |
| G-P5-11 | low | 2 unused npm deps: `@tailwindcss/typography`, `@tanstack/react-query-devtools` |
| G-P5-12 | low | 50 worker endpoints have no frontend caller — some admin, some dead |
| G-P5-13 | low | 40 frontend calls don't match any worker endpoint (incl. confirmed H-P1-01) |
| G-P5-14 | low | 8 protected pages have no in-app nav entry (real orphans) |
| G-P5-15 | low | PR #24 plans `NEXT_PUBLIC_SUPPORT_*` env-vars; not on main |

---

## JSON Sidecar

[`05_gap_analysis.json`](./05_gap_analysis.json) — dead-code, dead-endpoints, orphan-pages, orphan-tables, feature-gaps, env-gaps, dep-gaps. Feeds Phase 6 (final aggregation + HTML sitemap).

---

_End of Phase 5._
