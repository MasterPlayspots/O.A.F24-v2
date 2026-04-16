# Dead Endpoint Triage — Manual Review Required

**Phase 8 / TASK-056**
**Generated:** 2026-04-16
**Source:** Phase 3 `03_api_backend.json` → `dead_endpoints_sample`
**Method:** Cross-referenced 151 worker endpoints with frontend `lib/api/*` imports, frontend `fetch()` calls, external webhook callers (Stripe), and scheduled cron handlers.

---

## Method

A worker endpoint is "dead" if:
1. No frontend wrapper function calls it.
2. No frontend page or component directly fetches it.
3. It is not a webhook receiver (Stripe, PayPal).
4. It is not triggered by the cron scheduler.

Phase-3 audit matched **68** endpoints with ≥1 caller. The remaining **83** had zero detected callers. After filtering admin-only + cron-adjacent + webhook receivers, **~50** are confident candidates for removal.

## Rules Before Deletion

- **DO NOT delete:** admin-only endpoints, cron-triggered, webhook receivers (`/stripe/webhook`, `/paypal/capture-order`), health checks, OA endpoints.
- **SAFE to delete** if: no frontend caller AND no external caller AND not in middleware chain AND grep confirms zero references.
- **MANUAL CHECK required:** run `grep -rn "ENDPOINT_PATH" . --include="*.ts"` before each deletion.

## Top Candidates (review one-by-one)

| # | Method | Path | Route file | Notes |
|---|---|---|---|---|
| 1 | GET | `/api/me/dashboard` | `me.ts` | Superseded by `/api/admin/dashboard` for admins, `/api/dashboard/:rolle` for CHECK worker |
| 2 | GET | `/api/branchen/tree` | `branchen.ts` | Branchen tree view — no UI page for tree display |
| 3 | GET | `/api/branchen` | `branchen.ts` | Branchen list — onboarding now uses hardcoded `lib/constants/branchen.ts` |
| 4 | POST | `/api/branchen` | `branchen.ts` | Admin branchen CRUD — no admin UI for it |
| 5 | PUT | `/api/branchen/:id` | `branchen.ts` | Same |
| 6 | GET | `/api/stats` | — | No handler exists; wrapper `getStats()` was removed in this PR |
| 7 | GET | `/api/filter-options` | — | No handler in main worker |
| 8 | POST | `/api/gdpr/delete` | `gdpr.ts` | GDPR deletion — admin might call it; needs manual verification |
| 9 | GET | `/api/gdpr/export` | `gdpr.ts` | GDPR data export — same |
| 10 | PATCH | `/api/gdpr/consent` | `gdpr.ts` | Consent tracking — same |
| 11 | GET | `/api/oa/report` | `oa.ts` | OA diagnostic — intentionally public KV-read; keep |
| 12 | GET | `/api/oa/metrics` | `oa.ts` | OA diagnostic — same; keep |
| 13-50 | Various | Various `/api/foerdermittel/*` sub-paths | `foerdermittel/*.ts` | Many are called indirectly via the `/api/me/*` proxy router (`me.ts → forward()`); manual trace needed |

## Action Plan

1. **Sprint-level:** review 5 endpoints per week. For each: grep → confirm no caller → delete in a focused PR.
2. **Do NOT mass-delete.** Each deletion should be individually verifiable and revertable.
3. **Keep this doc updated** — cross off items as they're handled.

## Already Removed in This PR

- `getStats()` wrapper → deleted from `lib/api/fund24.ts` (no handler existed)
- `deleteDokument()` → deleted (no handler)
- `deleteAdminNews()` → deleted (frontend uses different flow)
- `createTrackerVorgang()`, `deleteTrackerVorgang()` → deleted (fund24 tracker doesn't have POST/DELETE yet)
- `verifyEmail()` → deleted (auth uses verify-code instead)
- `listExpertise()`, `listDienstleistungen()` → deleted from berater.ts
- `getUnternehmen()` → deleted from unternehmen.ts
