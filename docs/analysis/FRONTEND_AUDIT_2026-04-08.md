# Frontend Connection Audit — fund24 v2

**Date:** 2026-04-08
**Scope:** `/Users/our.ark./O.A.F24-v2` (Next.js 15 App Router) vs. worker `apps/worker/src/routes/*`
**API base:** `https://api.fund24.io/api/*`

---

## 1. TL;DR

- **Total pages audited:** 54
- **LIVE (green):** 24
- **PARTIAL (yellow):** 14
- **MOCK (red):** 13
- **DEAD (black):** 3 (legal placeholders)

The biggest structural issue is that **`lib/api/fund24.ts` calls a `/api/me/*` namespace that does not exist in the worker at all.** The worker exposes the same features under `/api/foerdermittel/favorites`, `/api/foerdermittel/notifications`, etc. Every fund24 v2 page that depends on `/api/me/*`, `/api/admin/bafa-cert/*`, `/api/admin/email-outbox/*`, `/api/antraege/:id/dokumente`, `/api/berater/me/kunden`, or `PATCH /api/beratungen/:id` currently throws 404.

Good news: `reports.ts` is mounted at `/api/berichte` and already implements `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/finalize`. The `// TODO` comments on `getBericht`/`listBericht` in `lib/api/fund24.ts` are **stale** — those endpoints exist.

---

## 2. Connection Matrix

| Page (URL) | Wrappers | Backend path | Status | Priority |
|---|---|---|---|---|
| `/` (public home) | `getStats` | `GET /api/stats` | 🟢 LIVE | P1 |
| `/login` | `login` (auth) | `POST /api/auth/login` | 🟢 LIVE | P0 |
| `/registrieren` | `register` | `POST /api/auth/register` | 🟢 LIVE | P0 |
| `/passwort-vergessen` | `forgotPassword` | `POST /api/auth/forgot` | 🟢 LIVE | P1 |
| `/passwort-reset` | `resetPassword` | `POST /api/auth/reset` | 🟢 LIVE | P1 |
| `/verifizieren` | `verifyEmail`, `resendVerification` | `POST /api/auth/verify*` | 🟢 LIVE | P0 |
| `/agb` | — | — | ⚫ DEAD (legal placeholder) | P3 |
| `/datenschutz` | — | — | ⚫ DEAD (legal placeholder) | P3 |
| `/impressum` | — | — | ⚫ DEAD (legal placeholder) | P3 |
| `/preise` | — | — | 🔴 MOCK (static pricing) | P2 |
| `/support` | — | — | 🔴 MOCK | P2 |
| `/aktuelles` | `getNews` | `GET /api/netzwerk/news` (via check) | 🟢 LIVE | P2 |
| `/aktuelles/[slug]` | `getNewsArtikel` | `GET /api/netzwerk/news/:slug` | 🟢 LIVE | P2 |
| `/berater` | `getBeraterListe` | `GET /api/netzwerk/berater` | 🟢 LIVE | P1 |
| `/berater/[id]` | `getBeraterProfil`, `sendeAnfrage` | `GET /api/netzwerk/berater/:id`, `POST /api/anfragen` | 🟢 LIVE | P1 |
| `/programme` | `getFilterOptions`, (client-side `getProgramme`) | `GET /api/filter-options`, `GET /api/foerderprogramme` | 🟢 LIVE | P0 |
| `/programme/[id]` | `getProgramm` | `GET /api/foerderprogramme/:id` | 🟢 LIVE | P0 |
| `/foerder-schnellcheck` | `analysiereWebsite` (precheck) | `POST /api/precheck/website` | 🟢 LIVE | P1 |
| `/foerder-schnellcheck/profil` | `ladeFragen` | `GET /api/precheck/fragen` | 🟢 LIVE | P1 |
| `/foerder-schnellcheck/chat` | `sendeAntwort`, `fuehreScoring` | `POST /api/precheck/*` | 🟢 LIVE | P1 |
| `/foerder-schnellcheck/analyse` | `ladeStatus` | `GET /api/precheck/status` | 🟢 LIVE | P1 |
| `/foerder-schnellcheck/ergebnis` | — | — | 🔴 MOCK (renders passed state) | P2 |
| `/foerder-schnellcheck/bericht` | `fordereBerichtAn` | `POST /api/precheck/bericht` | 🟢 LIVE | P1 |
| `/foerdercheck` | `checkStarten` | `POST /api/check/` | 🟢 LIVE | P0 |
| `/foerdercheck/[id]/analyse` | `getCheck` | `GET /api/check/:id` — ❌ worker only has `POST /:sessionId/*` | 🟡 PARTIAL | P0 |
| `/foerdercheck/[id]/chat` | `getCheck`, `chatNachricht` | `POST /api/check/:sessionId/chat` ok, GET ❌ | 🟡 PARTIAL | P0 |
| `/foerdercheck/[id]/dokumente` | `dokumenteHochladen`, `schwarmStarten` | `POST /api/check/:sessionId/docs` ok, `/schwarm` ❌ (worker has `/analyze`) | 🟡 PARTIAL | P0 |
| `/foerdercheck/[id]/ergebnisse` | `getCheck`, `getMatching`, `sendeAnfrage` | matching endpoint ❌ in check.ts | 🟡 PARTIAL | P0 |
| `/onboarding/profil` | `updateBeraterProfil` | `PUT /api/berater/profil` | 🟢 LIVE | P1 |
| `/onboarding/expertise` | `addExpertise` | `POST /api/berater/expertise` | 🟢 LIVE | P1 |
| `/onboarding/dienstleistungen` | `addDienstleistung` | `POST /api/berater/dienstleistungen` | 🟢 LIVE | P1 |
| `/dashboard/unternehmen` | `getDashboard` (check), `getFund24Dashboard` | `GET /api/dashboard/unternehmen` ok, `GET /api/me/dashboard` ❌ | 🟡 PARTIAL | P0 |
| `/dashboard/unternehmen/anfragen` | `getAnfragen` | `GET /api/anfragen` | 🟢 LIVE | P1 |
| `/dashboard/unternehmen/favoriten` | `listFavoriten`, `removeFavorit` | `GET /api/me/favoriten` ❌ (worker has `/api/foerdermittel/favorites`) | 🟡 PARTIAL | P1 |
| `/dashboard/unternehmen/tracker` | `getTracker`, `updateTrackerPhase` | `GET/PATCH /api/tracker` | 🟢 LIVE | P1 |
| `/dashboard/unternehmen/antraege` | `listMeineAntraege`, `createAntrag` | `GET/POST /api/me/antraege` ❌ | 🟡 PARTIAL | P0 |
| `/antraege/[id]` | `getAntrag`, `listAntragDokumente`, `listAntragZugriff`, `grantAntragZugriff`, `revokeAntragZugriff` | `/api/antraege/:id` ❌ (worker exposes cases under `/api/foerdermittel/cases/:id`) | 🟡 PARTIAL | P0 |
| `/dashboard/berater` | `getDashboard` (check), `updateAnfrage`, `listBeraterKunden` | dashboard ok, `GET /api/berater/me/kunden` ❌ | 🟡 PARTIAL | P0 |
| `/dashboard/berater/anfragen` | `getAnfragen`, `updateAnfrage` | `GET/PATCH /api/anfragen` | 🟢 LIVE | P1 |
| `/dashboard/berater/nachrichten` | `getAnfragen`, `getNachrichten`, `sendeNachricht` | `/api/netzwerk/nachrichten` | 🟢 LIVE | P1 |
| `/dashboard/berater/profil` | `getBeraterProfil`, `updateBeraterProfil` | `/api/berater/profil` | 🟢 LIVE | P1 |
| `/dashboard/berater/tracker` | `getTracker`, `updateTrackerPhase` | `/api/tracker` | 🟢 LIVE | P1 |
| `/dashboard/berater/abwicklung` | `getProvisionVertraege`, `uploadAbwicklungDokument` | `/api/berater/provision-vertraege`, `/api/berater/abwicklung/upload` | 🟢 LIVE | P1 |
| `/dashboard/berater/berichte` | `listBerichte` | `GET /api/berichte` ✅ (TODO comment stale) | 🟢 LIVE | P1 |
| `/dashboard/berater/berichte/[id]` | `getBericht`, `updateBericht`, `finalizeBericht` | `GET/PATCH /api/berichte/:id`, `POST /api/berichte/:id/finalize` | 🟢 LIVE | P1 |
| `/dashboard/berater/beratungen/[id]` | `getBeratung`, `updateBeratung` | `GET /api/beratungen/:id` ✅; `PATCH /api/beratungen/:id` ❌ | 🟡 PARTIAL | P1 |
| `/dashboard/berater/vorlagen` | `listVorlagen`, `createVorlage`, `deleteVorlage` | `/api/vorlagen` ❌ (no route file) | 🟡 PARTIAL | P2 |
| `/admin` | `getAdminDashboard`, `listPendingCerts`, `approveCert`, `rejectCert` | dashboard ok; `/api/admin/bafa-cert/*` ❌ | 🟡 PARTIAL | P1 |
| `/admin/users` | `getAdminUsers`, `updateAdminUser` | `/api/admin/users` | 🟢 LIVE | P1 |
| `/admin/provisionen` | `getAdminProvisionen`, `updateAdminProvision` | `/api/admin/provisionen` | 🟢 LIVE | P2 |
| `/admin/aktuelles` | `getAdminNews`, `createAdminNews`, `updateAdminNews` | `/api/admin/news` | 🟢 LIVE | P2 |
| `/admin/audit-logs` | `listAuditLogs` | `GET /api/admin/audit-logs` ✅ | 🟢 LIVE | P2 |
| `/admin/email-outbox` | `listEmailOutbox`, `retryEmail` | `/api/admin/email-outbox` ❌ | 🟡 PARTIAL | P2 |
| `/sentry-example-page` | — | — | 🔴 MOCK (dev stub) | P3 |

(`/dashboard/berater/beratungen/[id]` nur read-only funktionsfähig; Phase-Update wirft 404.)

---

## 3. TODO / Stale wrappers in `lib/api/fund24.ts`

| Wrapper | Expected endpoint | Reality |
|---|---|---|
| `getBericht(id)` | `GET /api/berichte/:id` | ✅ exists — TODO comment is stale, can be removed |
| `listBerichte()` | `GET /api/berichte` | ✅ exists — TODO comment is stale |
| `getBeratung(id)` | `GET /api/beratungen/:id` | ✅ exists — TODO comment is stale |
| `updateBeratung(id, …)` | `PATCH /api/beratungen/:id` | ❌ missing in `beratungen.ts` (only `GET /:id`) |
| `deleteVorlage(id)` | `DELETE /api/vorlagen/:id` | ❌ entire `/api/vorlagen` route file missing |
| `listVorlagen()` / `createVorlage()` | `GET/POST /api/vorlagen` | ❌ no route file — not mounted in `src/index.ts` |
| `listEmailOutbox()` | `GET /api/admin/email-outbox` | ❌ missing in `admin.ts` |
| `retryEmail(id)` | `POST /api/admin/email-outbox/:id/retry` | ❌ missing |
| `listAntragDokumente(id)` | `GET /api/antraege/:id/dokumente` | ❌ worker has `/api/foerdermittel/cases/:caseId/dokumente` instead |
| `getAntrag(id)` | `GET /api/antraege/:id` | ❌ no `/api/antraege` namespace — use `/api/foerdermittel/cases/:id` |
| `listMeineAntraege()` | `GET /api/me/antraege` | ❌ no `/api/me/*` — use `/api/foerdermittel/cases` |
| `createAntrag()` | `POST /api/me/antraege` | ❌ use `POST /api/foerdermittel/cases` |
| `listAntragZugriff` / `grantAntragZugriff` / `revokeAntragZugriff` | `/api/antraege/:id/zugriff(/*)` | ❌ no zugriff endpoints in worker |
| `listFavoriten` / `addFavorit` / `removeFavorit` | `/api/me/favoriten` | ❌ worker has `/api/foerdermittel/favorites` (different schema: integer id, `{programId}` body) |
| `listNotifications` / `markNotificationRead` / `markAllNotificationsRead` | `/api/me/notifications*` | ❌ worker has `/api/foerdermittel/notifications` and `PATCH /:id/read` (no `/read-all`) |
| `getDashboard()` (summary) | `GET /api/me/dashboard` | ❌ only `/api/dashboard/:rolle` exists |
| `listBeraterKunden()` | `GET /api/berater/me/kunden` | ❌ missing |
| `deleteDokument(id)` | `DELETE /api/dokumente/:id` | ❌ missing (worker only has `POST/GET` inside cases) |
| `listPendingCerts` / `approveCert` / `rejectCert` | `/api/admin/bafa-cert/*` | ❌ missing in `admin.ts` |

**Also note:** In `lib/api/check.ts` the check-session flow calls `GET /api/checks/:id`, `GET /api/checks/:id/matching`, `POST /api/checks/:id/schwarm`. The worker `routes/check.ts` only implements `POST /`, `POST /:sessionId/chat`, `POST /:sessionId/docs`, `POST /:sessionId/analyze`, `GET /:sessionId/plan`. The whole foerdercheck session flow (`/foerdercheck/[sessionId]/*`) is therefore only half-wired.

---

## 4. DEAD code / empty handlers

- `grep -rn "onClick={() => {}}"` → **0 hits.** Clean.
- `grep -rn "useState(\\[\\])"` → **0 hits.** Pages consistently type their initial state.
- `grep -rn "// TODO"` in `app/` → only 3 hits, all in the legal placeholder pages (`agb`, `datenschutz`, `impressum`). These are the ⚫ DEAD pages in the matrix — they have no handlers, just static "Rechtsanwalt vor Go-Live prüfen" markers.

---

## 5. Next-step recommendations (top 5)

1. **Fix `lib/api/fund24.ts` path namespace (P0).** Either (a) rename every `/api/me/*` call to the existing `/api/foerdermittel/*` or `/api/dashboard/unternehmen` path, or (b) add a thin `/api/me` alias router in the worker. Option (b) is cheaper and unblocks the favoriten, notifications, antraege and dashboard-summary panels in one commit.
2. **Implement `PATCH /api/beratungen/:id` + `PATCH /api/beratungen/:id/phase` in `beratungen.ts` (P1).** The Berater-Beratungen detail page renders fine on GET but every "Phase weiterschalten" button currently 404s.
3. **Create `routes/vorlagen.ts` and mount it at `/api/vorlagen` (P2).** The Vorlagen page is fully implemented on the frontend but has no backend at all. Either build the three endpoints or hide the nav entry until then.
4. **Remove stale `// TODO` comments in `lib/api/fund24.ts`** for `getBericht`, `listBerichte`, `getBeratung` — those worker endpoints already exist via the `/api/berichte` alias and `beratungen.get('/:id')`. Reading the current code suggests these are broken when in fact they work; it wastes debugging time.
5. **Wire the `/foerdercheck/[sessionId]/*` session flow (P0).** Add `GET /api/check/:sessionId`, `GET /api/check/:sessionId/matching`, and rename `analyze` → `schwarm` (or update the frontend wrapper to `/analyze`). Right now the public Schnellcheck funnel dead-ends after the first POST.

---

*Generated 2026-04-08 by automated audit.*
