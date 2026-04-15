# Fund24 Fix Log

Chronological record of audit-driven fixes. Cross-ref: `docs/analysis/audit_findings.json`.

| ID | Severity | Status | PR | Commit | Notes |
|---|---|---|---|---|---|
| F-002 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/11 | `8d3a996` | hono 4.12.8 → 4.12.14 (defensive bump; CVEs were not in npm audit DB for 4.12.8, but GHSA entries recommend 4.12.12+). Smoke test + build green. |
| F-001 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/12 | _tbd_ | Sentry DSGVO: PII-scrubber `lib/sentry/scrubber.ts` + `sendDefaultPii: false` + `tracesSampleRate 1.0 → 0.1` in all 3 frontend inits + worker Toucan. 5 scrubber unit tests green. |
| GAP-001 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/13 | _tbd_ | Admin BAFA Cert-Queue: 3 handlers in `worker/src/routes/admin.ts` (GET pending, POST approve, POST reject) + migration 027 adds `bafa_cert_status`/`_uploaded_at`/`_berater_nr` columns on `users`. 6 vitest cases green. Wrapper `listPendingCerts` unwraps `.certs`. Also unblocks F-009 by removing stale `tsconfig.json` extends. Remote migration applied 2026-04-15. |
| F-006 | MED | DONE | _tbd_ | _tbd_ | Removed all 12 `console.*` from prod frontend (`app/`, `lib/`). Error paths now go through `Sentry.captureException` with `tags: {area, op}`. Client-side `requireEnv` fallback removed (API errors already cascade). |
| F-010 | MED | DONE | _tbd_ | _tbd_ | `worker/src/routes/check.ts:72` silent catch replaced with Toucan capture (`tags: route=check, op=scrape-company`). Comment documents that the fallback is intentional (best-effort enrichment). |
| F-013 | MED | DONE | _tbd_ | _tbd_ | `app/error.tsx` useEffect now calls `Sentry.captureException(error, { tags: { boundary: 'app' }, contexts: { digest } })`. |
| F-015 | LOW | DONE | _tbd_ | _tbd_ | SupportWidget: real phone (+49 1512 9617192) + email (support@fund24.io) + hours were already in place — dropped the leftover TODO comment. |
| F-018 | LOW | DONE | _tbd_ | _tbd_ | `worker/src/middleware/cors.ts`: DEV origins, Vercel preview pattern (`fund24-*.vercel.app`), and v0.dev domains now gated behind `env !== "production"`. Also dropped legacy `v0-bafa-creator-ai.vercel.app` fallback. |
