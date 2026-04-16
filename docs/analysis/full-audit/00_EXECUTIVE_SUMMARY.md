# fund24 — Full DIN-ISO Audit · Executive Summary

**Branch:** `audit/phase-6-final-report`
**Generated:** 2026-04-15
**Production:** https://fund24.io + https://api.fund24.io
**Scope:** Phases 1-5 aggregated; this document is the landing page for the audit dossier.

---

## Platform in Numbers

| Layer | Count |
|---|---|
| Frontend pages (Next.js App Router) | **58** |
| CTAs extracted | **206** |
| Cloudflare Workers | **2** — `bafa-creator-ai-worker` + legacy `foerdermittel-check-api` |
| Worker endpoints (main) | **151** across 23 route files + 6 sub-modules |
| Next.js API routes | 1 (`/api/session` cookie helper) |
| D1 databases | **5** |
| Tables (live) | **141** (excluding `_cf_KV` / `schema_migrations`) |
| KV namespaces | 4 |
| R2 buckets | 2 |
| Cron triggers | 4 |

---

## Findings Overall

**121 findings** aggregated across the five phases.

| Severity | Count |
|---|---|
| 🔴 Critical | **2** |
| 🟠 High | **26** |
| 🟡 Medium | **43** |
| ⚪ Low | **50** |

### By phase

| Phase | Theme | Findings |
|---|---|---|
| 1 | Frontend inventory | 27 |
| 2 | CTAs + routing | 29 |
| 3 | API + backend | 35 |
| 4 | DB mapping + data flows | 15 |
| 5 | Gaps + orphans + dead code | 15 |

---

## Top 10 Launch Blockers

Ordered by reach × severity × effort.

| # | ID | Area | Ship-blocker | Fix |
|---|---|---|---|---|
| 1 | **H-P1-01 / C-P3-01** | Programme detail | Every `/programme/[id]` request 404s — 3.408 programme pages invisible | Change URL in `lib/api/fund24.ts:36` to `/api/foerdermittel/katalog/:id`. 1-line patch. |
| 2 | **H-P1-02** | Antraege auth | `/antraege/[id]` served 200 without JWT — only client-side redirect post-hydration | Add `'/antraege'` to `PROTECTED_PREFIXES` in `middleware.ts:23`. 1-line patch. |
| 3 | **H-P1-03 / H-P3-05** | Sitemap | 3.408 programme URLs missing from `sitemap.xml` due to response-shape mismatch | `app/sitemap.ts:34/52` — read `data.data` + `data.berater` (verify live shape). |
| 4 | **H-P2-01** | DSGVO | Single checkbox on `/foerder-schnellcheck/bericht` bundles consent + marketing opt-in | Split into two checkboxes + link to `/datenschutz`. |
| 5 | **H-P3-01** | API abuse | 5 `/api/check/*` handlers unauthenticated; they consume AI + R2 quota | Add `requireAuth` middleware to `worker/src/routes/check.ts`. |
| 6 | **H-P3-03** | SSRF | `/api/admin/check-foerdermittel` does `fetch(url, redirect:"follow")` over DB-sourced URLs | Add host allowlist + `redirect:"error"`. |
| 7 | **C-P4-01** | Schema collision | `users` exists in 2 DBs with different schemas; cross-worker queries pick whichever | Decide canonical DB; multi-week migration. |
| 8 | **H-P1-04** | Silent data loss | Berater profile form drops `spezialisierungen` + `websiteUrl` on save | `app/dashboard/berater/profil/page.tsx` — include both in update payload. |
| 9 | **H-P1-05 / H-P2-02** | Dead link | `/dashboard/unternehmen` "Ansehen" → `/dashboard/checks/[id]` (doesn't exist) | Redirect to existing detail or build the route. Linked to #1 list→detail breakage. |
| 10 | **G-P5-01** | UX noise | `ComingSoonBanner` over admin + berater dashboard + 3 unternehmen sub-pages + aktuelles + berater directory despite features shipping | Remove banner from 5 layouts. |

---

## Recommended Fix Order

### Hour 1 — Quick wins (≤ 1-line patches, no review risk)

- H-P1-01 endpoint URL fix
- H-P1-02 middleware addition
- H-P1-03 / H-P3-05 sitemap shape fix (2 lines)
- G-P5-01 remove 5 ComingSoonBanner lines

**Expected impact:** 3.408 pages become reachable + SEO-visible, auth leak closed, UI feels production-ready.

### Week 1 — Security hardening

- H-P3-01 auth on `/api/check/*` wizard
- H-P3-03 SSRF allowlist on `/api/admin/check-foerdermittel`
- H-P2-01 DSGVO checkbox split + privacy link
- M-P3-02 Stripe webhook 4xx on amount mismatch
- L-P4-05 daily backup covers all 5 D1 DBs (currently 2)

### Week 1-2 — Data correctness

- H-P1-04 berater profile payload
- H-P4-01 favorites consolidation (pick one of 4 implementations)
- H-P4-02 antraege → antraege_v2 dual-write check + legacy drop
- H-P4-05 add indexes: `idx_unternehmen_user_id`, `idx_berater_profiles_user_id` etc.

### Week 2-4 — Schema consolidation

- C-P4-01 canonical `users` table
- H-P4-03 unify `audit_logs`
- M-P4-01 deduplicate 8 `foerdermittel_*` tables
- H-P3-06 port remaining `API.CHECK` wrappers to main worker, retire `worker-check/`

### Week 4+ — Feature completion

- G-P5-03 merge PR #26 (BAFA-Cert upload)
- G-P5-02 build real PDF export for Fördercheck-Ergebnisse
- Decide keep-or-kill: Forum, Kombinationsregeln, phone/voice flow

---

## Dead Code & Orphans at a Glance

| Category | Count |
|---|---|
| Dead worker endpoints (no caller) | 83 reported, 50 shortlisted |
| Unmatched frontend wrapper calls | 40 real-dead |
| Orphan pages (no in-app nav) | 9 |
| Orphan-table candidates | 97 (18 confidently dead) |
| Dead frontend exports | 10 |
| Unused UI component files | 5 |
| Unused npm deps | 2 (`@tailwindcss/typography`, `@tanstack/react-query-devtools`) |

---

## Navigation

- **Phase 1** — [01_FRONTEND_INVENTORY.md](./01_FRONTEND_INVENTORY.md) + [01_pages.json](./01_pages.json) + [pages/](./pages/) (58 per-page detail files)
- **Phase 2** — [02_CTA_ROUTING.md](./02_CTA_ROUTING.md) + [02_cta_routing.json](./02_cta_routing.json)
- **Phase 3** — [03_API_BACKEND.md](./03_API_BACKEND.md) + [03_api_backend.json](./03_api_backend.json)
- **Phase 4** — [04_DB_MAPPING.md](./04_DB_MAPPING.md) + [04_db_mapping.json](./04_db_mapping.json)
- **Phase 5** — [05_GAP_ANALYSIS.md](./05_GAP_ANALYSIS.md) + [05_gap_analysis.json](./05_gap_analysis.json)
- **Phase 6** — this document + [00_all_findings.json](./00_all_findings.json) + [SITEMAP.html](./SITEMAP.html) (interactive)

---

_End of executive summary. See `SITEMAP.html` for the click-through view._
