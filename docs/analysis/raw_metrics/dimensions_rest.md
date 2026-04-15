# Raw Metrics — D4, D5, D6, D9, D10, D11, D12, D13, D14, D15

Produced 2026-04-15. Source-of-truth is code (not ECOSYSTEM.md).

## D4 Performance — Score 6/10

- Worker bundle: `worker/dist/index.js` = 589 KB (post-Phase-D)
- Frontend largest source files (top 5):
  - `lib/api/fund24.ts` (~600 LOC)
  - `worker/src/routes/foerdermittel.ts` (~1500 LOC, mixes catalog + search + matching)
- Unoptimized `<img>` scan: `grep -rn "<img " app components --include="*.tsx" | grep -v "next/image"` → confirm manually on next pass
- Sentry: `instrumentation-client.ts:14` + `sentry.server.config.ts:11` have `tracesSampleRate: 1.0` — 100% trace sampling in production, cost risk
- Next.js `revalidate`: used on `app/(public)/page.tsx:6` (3600s) and `app/sitemap.ts` (via `next.revalidate`)

## D5 Tests — Score 7/10

- Worker tests: `worker/src/__tests__/` contains 13 test files (vitest + miniflare)
- No e2e tests for frontend (no `playwright.config.*` found)
- CI: `.github/workflows/ci.yml` runs lint + typecheck + build — **no test step** for worker
- Config: `worker/vitest.config.ts` present; no coverage thresholds enforced in CI

## D6 API Design — Score 8/10

- Route count: ~120 handlers across 20 route files in `worker/src/routes/`
- Zod validators: 55+ `safeParse()` call sites
- Error shape consistency: dominant pattern is `c.json({ success: false, error, details? }, status)` — spot-checked 8 route files, consistent
- Silent catches: 1 found in `worker/src/routes/check.ts:72-74` (`} catch { }`)
- No explicit 404 catch-all; Hono falls through to framework default (`Endpoint nicht gefunden` in index.ts handler at bottom)

## D9 Documentation — Score 6/10

- Top-level docs: `README.md`, `DEPLOY.md`, `ECOSYSTEM.md`, `CLAUDE-CODE-DEPLOY-PROMPT.md`
- `ECOSYSTEM.md` is **stale** — still references `/api/bafa` (removed in commit `18e4a54`)
- No `docs/API.md` with route inventory + request/response shapes
- No `docs/MIGRATIONS.md` for schema history
- Phase A/B/C/D sprint progress not tracked in any long-form doc

## D10 DevOps — Score 8/10

- `.github/workflows/ci.yml`: lint + typecheck + build (dummy env), no test step
- `.github/workflows/deploy-workers.yml`: `cloudflare/wrangler-action@v3`, paths-filter triggers per-worker
- Vercel git integration handles frontend auto-deploy
- Secrets referenced: `CLOUDFLARE_API_TOKEN` only (Account ID hardcoded in workflow)
- Actions pinned to `@v4`/`@v3` major; no SHA pinning for supply-chain defense

## D11 Frontend — Score 7/10

- **55 pages** (`find app -name "page.tsx" | wc -l`)
- Client components: 66 files with `'use client'` directive
- Error boundaries: `app/error.tsx` + `app/global-error.tsx` + `app/not-found.tsx` all present, Architect-Dark styled
- `components/support/SupportWidget.tsx:7` has TODO: "Vor Go-Live echte Kontaktdaten eintragen"
- No dead `onClick={() => {}}` handlers found
- Cookie banner + consent-gated analytics mounted in `app/layout.tsx`

## D12 Database — Score 7/10

- 5 D1 databases bound in `worker/wrangler.toml`: DB (zfbf-db), BAFA_DB (bafa_antraege), BAFA_CONTENT (bafa_learnings), FOERDER_DB (foerderprogramme), CHECK_DB (foerdermittel-checks)
- 29+ migration files in `worker/db/migrations/`
- 46 `CREATE TABLE` statements, 113 `CREATE INDEX`
- Cross-DB design: users in zfbf-db, data in bafa_antraege. Migrations 024/025/026 dropped FK constraints to `users` (SQLite can't enforce cross-DB FKs)
- No `down()` rollback scripts for migrations
- **Orphan CF R2 buckets**: `fund24-dokumente`, `fund24-company-files` exist on Cloudflare account but are **NOT bound** in `worker/wrangler.toml` (only `bafa-reports` and `foerdermittel-check-docs`). Possible stale infra or planned but not wired.

## D13 Error Handling — Score 7/10

- `Sentry.captureException` calls across FE+BE: 2 explicit (global-error.tsx + one other)
- Most errors rely on Sentry auto-capture via middleware
- 1 empty catch in `worker/src/routes/check.ts:72-74` (scraper)
- `app/error.tsx` is Architect-Dark, shows `error.digest` but doesn't call `Sentry.captureException`
- `app/global-error.tsx` does `Sentry.captureException(error)` in useEffect

## D14 Monitoring — Score 7/10

- Sentry init: `instrumentation.ts` conditional on `NEXT_RUNTIME`
- `tracesSampleRate: 1.0` in both server + client — cost risk at scale
- Worker logging via `log()` helper (`worker/src/services/logger.ts`)
- OA-CP + OA-VA agents run daily 02:30 UTC, persisted to KV `oa:*`
- Onboarding-email dispatcher runs daily 10:00 UTC, logs `onboarding_dispatch_{start,complete,failed}`
- Health endpoints: `GET /health` (root, blocked by CF route), `GET /api/health` (primary, returns DB/BAFA/KV/R2 status)

## D15 Env Config — Score 7/10

- **No `.env.example` file** in repo
- Frontend env: `NEXT_PUBLIC_FUND24_API_URL`, `NEXT_PUBLIC_CHECK_API_URL`, `NEXT_PUBLIC_SEMANTIC_API_URL`, `NEXT_PUBLIC_ZFBF_API_URL`
- `lib/api/config.ts:4` validates via `requireEnv()` helper that throws if missing (server-side only)
- Worker env typed in `worker/src/types.ts` under `Bindings` interface
- `wrangler.toml` blocks: `[vars]`, 5× `[[d1_databases]]`, 4× `[[kv_namespaces]]`, 1× `[[r2_buckets]]`, `[ai]`, `[observability.logs]`, `[triggers]`
