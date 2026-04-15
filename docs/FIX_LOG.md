# Fund24 Fix Log

Chronological record of audit-driven fixes. Cross-ref: `docs/analysis/audit_findings.json`.

| ID | Severity | Status | PR | Commit | Notes |
|---|---|---|---|---|---|
| F-002 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/11 | `8d3a996` | hono 4.12.8 → 4.12.14 (defensive bump; CVEs were not in npm audit DB for 4.12.8, but GHSA entries recommend 4.12.12+). Smoke test + build green. |
| F-001 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/12 | _tbd_ | Sentry DSGVO: PII-scrubber `lib/sentry/scrubber.ts` + `sendDefaultPii: false` + `tracesSampleRate 1.0 → 0.1` in all 3 frontend inits + worker Toucan. 5 scrubber unit tests green. |
| GAP-001 | HIGH | DONE | https://github.com/MasterPlayspots/O.A.F24-v2/pull/13 | _tbd_ | Admin BAFA Cert-Queue: 3 handlers in `worker/src/routes/admin.ts` (GET pending, POST approve, POST reject) + migration 027 adds `bafa_cert_status`/`_uploaded_at`/`_berater_nr` columns on `users`. 6 vitest cases green. Wrapper `listPendingCerts` unwraps `.certs`. Also unblocks F-009 by removing stale `tsconfig.json` extends. Remote migration applied 2026-04-15. |
