# Phase 3 — API + Backend Layer

**Branch:** `audit/phase-3-api-backend`
**Generated:** 2026-04-15
**Builds on:** Phase 1 page index (01_pages.json) + Phase 2 CTA graph (02_cta_routing.json)

---

## Executive Summary

| Metric | Count |
|---|---|
| Workers (Cloudflare) | **2** — main + legacy shadow |
| Next.js API routes (`app/api/`) | 1 (session cookie helper) |
| Worker endpoints catalogued (main worker) | **151** across 23 route files + 6 sub-modules + 3 root |
| Frontend wrapper calls (`lib/api/*`) | **114** + 6 direct fetches |
| Matched endpoints (≥1 caller) | 68 |
| **Dead worker endpoints** (no frontend caller found) | **83** |
| **Unmatched frontend calls** (no matching main-worker endpoint) | **46** (6 appear in worker-check, 40 real-dead or handled by dual-worker routing) |
| Findings — worker | 20 |
| Findings — frontend | 15 |

**Bottom line:**
1. **Two workers host the platform.** `bafa-creator-ai-worker` on `api.fund24.io` is the primary surface; `foerdermittel-check-api` (`worker-check/`, 5.2 kLOC plain JS) is still live at `NEXT_PUBLIC_CHECK_API_URL` and the frontend actively calls it for dashboard/tracker/news/matching flows.
2. **Endpoint↔caller drift is substantial.** 83 worker endpoints are uncalled and 40+ frontend calls hit endpoints that don't exist on either worker. The single highest-severity instance is `getProgramm()`/`getProgramme()` (H-P1-01, now re-confirmed).
3. **Auth surface has 3 structural gaps.** `/api/check/*` wizard is entirely unauthenticated while it consumes AI+R2 quota; `/api/checks/*` is a blind proxy to worker-check with no signed forwarding; `/api/admin/check-foerdermittel` accepts arbitrary URLs from a table and fetches them with `redirect: follow` (SSRF surface).

---

## Workers Inventory

### Worker 1 — `bafa-creator-ai-worker` (production)

| Attribute | Value |
|---|---|
| Wrangler | `worker/wrangler.toml` |
| Prod route | `api.fund24.io/api/*` |
| Entry | `worker/src/index.ts` (Hono) |
| Compat | `2024-01-01` + `nodejs_compat` |
| Global middleware | trailing-slash redirect → `securityHeaders` → `corsMiddleware` → `strictCorsCheck` (api) → `csrfProtection` (api) → `globalRateLimit` (api) |
| D1 (5) | `DB`→zfbf-db · `BAFA_DB`→bafa_antraege · `BAFA_CONTENT`→bafa_learnings · `FOERDER_DB`→foerderprogramme · `CHECK_DB`→foerdermittel-checks |
| KV (4) | `SESSIONS` · `RATE_LIMIT` · `CACHE` · `WEBHOOK_EVENTS` |
| R2 (1) | `REPORTS`→bafa-reports |
| AI | `AI` → Workers-AI (llama-3.1-8b-instruct used in `reports.ts`, `check.ts`) |
| Crons | `0 2 * * *` (backup) · `30 2 * * *` (OA-CP + OA-VA) · `0 3 * * 1` (weekly learning) · `0 10 * * *` (onboarding dispatch) |
| Secrets | `JWT_SECRET`, `UNLOCK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `RESEND_API_KEY` |
| Preview env | `bafa-creator-ai-worker-preview` inherits all bindings |

### Worker 2 — `foerdermittel-check-api` (legacy / shadow)

| Attribute | Value |
|---|---|
| Wrangler | `worker-check/wrangler.toml` |
| Prod route | `NEXT_PUBLIC_CHECK_API_URL` (currently `foerdermittel-check-api.froeba-kevin.workers.dev`) |
| Entry | `worker-check/src/index.js` (plain JS, 4 691 LOC) + `matching.js` (523 LOC) |
| D1 (3) | `CHECK_DB`→foerdermittel-checks · `FOERDER_DB`→foerderprogramme · `PLATFORM_DB`→bafa_antraege |
| R2 (1) | `DOCS_BUCKET`→foerdermittel-check-docs |
| AI | `AI` → Workers-AI |
| Shared DBs | 3 of 3 D1 bindings are also bound to the main worker — same data, two code paths, two auth regimes. |

**Architectural observation.** The two workers **share D1** (`bafa_antraege`, `foerderprogramme`, `foerdermittel-checks`) and expose **overlapping endpoints** (notably `/api/admin/dashboard`, `/api/admin/users`, `/api/admin/provisionen`, `/api/admin/news`, `/api/berater/provision-vertraege`, `/api/berater/abwicklung/upload`, `/api/tracker`, `/api/news`). The frontend picks a worker per-call via `API.FUND24` vs `API.CHECK` in `lib/api/config.ts` — the choice is historical, not functional. Consolidation to the TypeScript worker is the cleanest path; until then, any admin logic change must be ported in both places.

---

## Next.js API Routes

| Path | File | Methods | Auth | Notes |
|---|---|---|---|---|
| `/api/session` | `app/api/session/route.ts` | POST, DELETE | none | POST stores a client-provided token as `fund24-token` HttpOnly cookie. Only validates `length >= 10` — does not verify the JWT signature before storing. OK in practice because `middleware.ts:jwtVerify()` rejects invalid tokens, but a defence-in-depth improvement is to verify here too. |

The Sentry tunnel route (`/monitoring`) is configured in `next.config.ts` and intercepted by the Sentry webpack plugin; no app-router handler file.

---

## Next.js Middleware

`middleware.ts` — JWT verification via `jose` HS256.

| Bucket | Paths |
|---|---|
| `PUBLIC_PATHS` (exact) | `/`, `/programme`, `/berater`, `/preise`, `/aktuelles`, `/support`, `/foerder-schnellcheck`, `/login`, `/registrieren`, `/verifizieren`, `/passwort-vergessen`, `/passwort-reset`, `/datenschutz`, `/impressum`, `/agb` |
| `PUBLIC_PREFIXES` | `/programme/`, `/berater/`, `/aktuelles/`, `/foerder-schnellcheck/` |
| `PROTECTED_PREFIXES` | `/foerdercheck`, `/onboarding`, `/dashboard`, `/admin` |
| `ADMIN_PREFIX` | `/admin` (role=admin or redirect to `/dashboard/unternehmen`) |

**Gap:** `/antraege` is neither public nor protected → Phase-1 H-P1-02 auth leak on `/antraege/[id]`. Fix is a one-line addition to `PROTECTED_PREFIXES`.

---

## High-Signal Findings

### Critical (1)

| ID | File:Line | Finding |
|---|---|---|
| C-P3-01 | `lib/api/fund24.ts:36` | **Dead endpoint called by production page.** `getProgramm(id)` → `/api/foerderprogramme/:id` which the worker never mounts. Sibling code in `app/(public)/programme/[id]/opengraph-image.tsx:15` already uses the correct path `/api/foerdermittel/katalog/:id`. Every `/programme/[id]` request 404s. Same pattern on `lib/api/fund24.ts:32` for the list (`getProgramme`) — listing works on the current UI only because a different wrapper (`listKatalog` in `check.ts`) is used by the active list page. Re-confirmation of Phase-1 H-P1-01. |

### High (7)

| ID | File:Line | Finding |
|---|---|---|
| H-P3-01 | `worker/src/routes/check.ts:54-…` | **/api/check/* wizard is unauthenticated.** All 5 `check` handlers (`POST /analyse`, `POST /:session/antwort`, `POST /:session/scoring`, `GET /:session/fragen`, `GET /:session/status`) have no `requireAuth`. They write to `BAFA_DB`, upload to R2, and invoke Workers-AI llama-3.1. A simple loop drains AI/R2 quota and inflates bill. |
| H-P3-02 | `worker/src/routes/checks.ts:33` | **Blind proxy, no signed forwarding.** `/api/checks/*` forwards to `foerdermittel-check-api.froeba-kevin.workers.dev` with the caller's `Authorization` header + body, adding only the global rate limit. No HMAC/mTLS between workers — anyone who discovers the target URL can hit it directly, and if the two workers drift on schema validation, the caller-facing one adds no safety net. |
| H-P3-03 | `worker/src/routes/admin.ts:261` | **SSRF surface.** `/api/admin/check-foerdermittel` reads up to 50 `foerderprogramme.url` rows and does `fetch(url, { method:'HEAD', redirect:'follow' })` in parallel. No host allowlist, no internal-address filter. A poisoned row in `foerderprogramme` (the table is populated by an external scraper, see `worker/src/services/scraper.ts`) can direct the fetch to internal Cloudflare-metadata URLs. |
| H-P3-04 | `lib/api/fund24.ts:23-33` | **Listing endpoint drift.** `getProgramme()` hits `/api/foerderprogramme` while sitemap + OG image generator both use `/api/foerdermittel/katalog`. Two shapes in parallel, at least one always wrong. |
| H-P3-05 | `app/sitemap.ts:34, 52` | **Sitemap shape mismatches (×2).** `fetchProgrammIds()` reads `data.results` but API returns `{ success, data, pagination }`; `fetchBeraterIds()` reads `data.profiles` but `check.ts:getBeraterListe` types response as `{ berater: [...] }`. Sitemap emits 0 programme URLs and 16 berater URLs only because the `berater`/`profiles` shape drift partially matches. Phase-1 H-P1-03. |
| H-P3-06 | `lib/api/check.ts` (entire file) | **Legacy `API.CHECK` calls still active in production paths.** `getDashboard()` is consumed by `/dashboard/unternehmen` and `/dashboard/berater`; `getNachrichten`/`sendeNachricht` by `/dashboard/berater/nachrichten`. If `NEXT_PUBLIC_CHECK_API_URL` is ever pointed at a newer worker that doesn't implement these, multiple dashboards go blank. Consolidation blocked on parity. |
| H-P3-07 | `lib/api/auth.ts:125` | **logout() is a no-op on the real cookie.** Tries to clear `fund24-auth` via `document.cookie`; the actual HttpOnly cookie is `fund24-token` and JS can't clear HttpOnly cookies regardless. The `DELETE /api/session` call next to it does the real work — but the `document.cookie` statement is dead code that suggests incomplete migration. |

### Medium (7)

| ID | File:Line | Finding |
|---|---|---|
| M-P3-01 | `worker/src/routes/reports.ts:204` | AI-generated HTML served as `text/html` from `/api/reports/preview/:id` and `/api/reports/download/:token` with no explicit CSP response header. Relies entirely on `report-html` for escaping — one unescaped AI output string = stored XSS. |
| M-P3-02 | `worker/src/routes/payments.ts:100-114` | Stripe webhook returns HTTP 200 on amount-mismatch and missing-payment. Stripe treats this as "accepted" and will not retry; only an audit-log row survives. Should respond 4xx on unrecoverable mismatch so Stripe retries or alerts. |
| M-P3-03 | `lib/api/fund24.ts:createAntrag` | Normalises **three** different response shapes (`{data:{caseId}}`, `{case:{id}}`, `{id}`) with chained `??`. Silently hides API drift; next shape change will null-out the returned id. |
| M-P3-04 | `app/api/session/route.ts:17-40` | POST accepts any 10-char string as `token` and stores it as `fund24-token` HttpOnly cookie without verifying the JWT signature. Middleware ultimately rejects invalid tokens, but verifying here too would avoid an unnecessary cookie write and a round-trip. |
| M-P3-05 | `worker/src/routes/verify-payment.ts` | Single route, public: receives a payment id and marks report as paid. Depends on caller honesty or external idempotency — if the UI is ever instrumented to retry, duplicate unlocks are possible. |
| M-P3-06 | `worker/src/routes/admin.ts` (cert handlers) | `/api/admin/bafa-cert/pending` and `.../:userId/approve|reject` exist (merged via PR #13). The counterpart **upload** endpoint is still in PR #26 (open) — berater cannot supply a certificate yet, so the admin queue always reads empty for new uploads. |
| M-P3-07 | `worker/src/routes/nachrichten.ts` + `lib/api/check.ts:getNachrichten` | Two nachrichten implementations (main worker `/api/nachrichten` + legacy `/api/netzwerk/nachrichten` on worker-check). Frontend uses the second via `check.ts`. If the main worker's rate limiter or CSRF policy differs from worker-check, users hit inconsistent limits. |

### Low (9 — representative subset)

| ID | File:Line | Finding |
|---|---|---|
| L-P3-01 | multiple frontend calls | **46 unmatched calls.** 6 appear in worker-check explicitly; 40 match neither worker via literal grep. Most are shape-normalisation false positives (`:id` vs `${id}`, querystring handling). Candidates worth verifying manually: `GET /api/stats`, `GET /api/filter-options`, `GET /api/berichte`, `POST /api/me/notifications/:id/read`. |
| L-P3-02 | `worker/src/routes/**` | **83 dead endpoints** (no frontend caller found). Include some admin-only utility endpoints; the count also inflates when the caller is dynamic string concat. Top candidates for removal after manual verification: `GET /api/me/dashboard` (superseded by `/api/admin/dashboard` for admins), several `/api/gdpr/*` utilities, `GET /api/branchen/tree` paths. |
| L-P3-03 | `lib/api/fund24.ts` + `lib/api/check.ts` | **Dead frontend exports (10+).** `getStats`, `verifyEmail`, `deleteDokument`, `deleteAdminNews`, `listExpertise`, `listDienstleistungen`, `getUnternehmen`, `createTrackerVorgang`, `deleteTrackerVorgang`, `addFavorit` (fund24 variant) — none imported by any page/component. Feeds Phase 5 dead-code list. |
| L-P3-04 | `worker/src/routes/oa.ts` | Public KV-read endpoint, no auth. Intentional per comment, but worth double-checking that no PII ever lands in `oa:*` KV keys. |
| L-P3-05 | `worker/src/routes/checks.ts:33` | Proxy preserves `Authorization` header verbatim. If token is revoked mid-flight, worker-check is the source of truth for validity — single-point-of-failure if caches diverge. |
| L-P3-06 | `worker/src/routes/gdpr.ts` | User delete flow touches 2 D1 + R2. Not wrapped in a transaction (D1 doesn't support cross-DB tx anyway) — partial-failure state possible. |
| L-P3-07 | Cron triggers | Four crons defined; three in one handler, one dedicated (`0 2 * * *` backup). The handler if-else tree on hour/minute is brittle — a wrangler cron schedule change without code sync silently no-ops. |
| L-P3-08 | `worker/src/routes/me.ts` + `admin.ts` | Both implement an audit-log endpoint; the admin one at `/api/admin/audit-logs` is the canonical one, `me.ts` flow exposes `/api/me/activity` with overlapping columns. Minor duplication. |
| L-P3-09 | `next.config.ts` | CSP `connect-src` lists `https://*.workers.dev` and `https://*.vercel.app` — fine for prod, but also allowed in dev/preview which means a forked preview deploy could connect to any workers.dev host. Tighten with `NEXT_PUBLIC_CHECK_API_URL` host specifically if possible. |

---

## Frontend ↔ Backend Map

See `03_api_backend.json → endpoints[]` for the full table. Each endpoint has a `called_by` array naming the wrapper function + the page/component that consumes it (sourced from `01_pages.json`). Because 83 endpoints are "dead" and 46 calls are "unmatched", the map is deliberately non-transitive — a page appearing under `called_by` for an endpoint does not guarantee the wrapper is live in prod.

### Routing recap

```
Browser
  │
  ├─► fund24.io            → Vercel / Next.js
  │     │
  │     ├─ middleware.ts    (JWT verify, redirect rules)
  │     ├─ app/**           (RSC + client components)
  │     └─ app/api/session  (set/clear HttpOnly cookie)
  │
  ├─► api.fund24.io/api/*   → Worker 1 (bafa-creator-ai-worker)
  │                            151 endpoints, JWT + HMAC auth, 5 D1, 1 R2, AI
  │
  └─► foerdermittel-check-api.workers.dev/api/*   → Worker 2 (legacy)
                                 frontend calls via NEXT_PUBLIC_CHECK_API_URL
                                 overlapping endpoints on shared D1s
```

---

## JSON Sidecar

[`03_api_backend.json`](./03_api_backend.json) — endpoints, bindings, middleware, frontend calls, unmatched/dead lists, and all findings. Feeds Phase 5 (gap analysis) and Phase 6 (HTML sitemap).

---

_End of Phase 3._
