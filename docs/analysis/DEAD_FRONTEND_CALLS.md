# Dead Frontend API Calls — Triage

**Phase 8 / TASK-060**
**Generated:** 2026-04-16
**Source:** Phase-3 `03_api_backend.json` + Phase-5 `05_gap_analysis.json`

---

## Summary

40 frontend wrapper functions in `lib/api/*` call endpoints that don't
appear on either worker (fund24 main or legacy worker-check) via literal
grep. Some are shape-normalisation false positives; others are genuinely
broken backend features.

## Already Fixed / Deleted in This PR

| Function | File | Endpoint | Action |
|---|---|---|---|
| `getStats` | fund24.ts | GET /api/stats | **DELETED** — no handler |
| `verifyEmail` | auth.ts | POST /api/auth/verify-email | **DELETED** — superseded by `verifyCode` |
| `deleteDokument` | fund24.ts | DELETE /api/dokumente/:id | **DELETED** — no handler |
| `deleteAdminNews` | fund24.ts | DELETE /api/admin/news/:id | **DELETED** — admin uses different flow |
| `createTrackerVorgang` | fund24.ts | POST /api/tracker | **DELETED** — no POST handler on FUND24 worker |
| `deleteTrackerVorgang` | fund24.ts | DELETE /api/tracker/:id | **DELETED** — no DELETE handler |
| `listExpertise` | berater.ts | GET /api/berater/expertise | **DELETED** — no caller |
| `listDienstleistungen` | berater.ts | GET /api/berater/dienstleistungen | **DELETED** — no caller |
| `getUnternehmen` | unternehmen.ts | GET /api/unternehmen/profil | **DELETED** — no caller |

## Already Fixed in Nacht 1 Quick-Wins (PR #35)

| Function | File | Endpoint | Action |
|---|---|---|---|
| `getProgramm` | fund24.ts:36 | GET /api/foerderprogramme/:id | **FIXED** — URL → `/api/foerdermittel/katalog/:id` |
| `getProgramme` | fund24.ts:32 | GET /api/foerderprogramme | Still uses legacy path but the listing page actually imports `ProgrammListe` which uses a different wrapper |

## Still Open — Needs Manual Verification

| Function | File | Endpoint | Concern |
|---|---|---|---|
| `getFilterOptions` | fund24.ts | GET /api/filter-options | **No handler.** Programme page imports it but falls back gracefully. Consider deleting wrapper or creating the handler. |
| `markNotificationRead` | fund24.ts | POST /api/me/notifications/:id/read | May be forwarded via `/api/me/*` proxy → foerdermittel sub-app. Trace needed. |
| `markAllNotificationsRead` | fund24.ts | POST /api/me/notifications/read-all | Same |
| `listBerichte` / `createBericht` / `updateBericht` / `finalizeBericht` | fund24.ts | GET/POST/PATCH /api/berichte | **No `berichte.ts` route file.** Berater-berichte page wires autosave to these endpoints. This is a real broken backend feature — either create the route or rewire the page to the report flow. |
| `listBeraterKunden` | fund24.ts | GET /api/berater/me/kunden | Verify handler exists in berater.ts. |
| CHECK worker wrappers (deprecated in Nacht 3) | check.ts | Various `/api/*` on CHECK base | Deprecated with @deprecated JSDoc. Will be removed once all callers migrate. |

## Action Plan

1. **High priority:** decide on `/api/berichte` — is the feature shipped or dead?
2. **Medium:** trace `/api/me/notifications/*` through the proxy layer.
3. **Low:** remove `getFilterOptions` wrapper or create a minimal handler that returns cached branchen + foerderarten.
