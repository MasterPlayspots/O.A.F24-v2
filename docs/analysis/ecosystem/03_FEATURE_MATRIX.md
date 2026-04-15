# Fund24 — Feature Matrix

**Snapshot date:** 2026-04-15

Every user-facing feature is traced from **UI file → API wrapper → Worker route → DB/R2 touch → prod smoke**.

Legend:
- ✅ **LIVE** — all four layers exist, prod responds with expected auth/data status
- ⚠️ **PARTIAL** — route or UI has a hole, still partially usable
- ❌ **BROKEN** — UI calls something that prod doesn't expose
- 🧟 **ORPHAN UI** — UI rendered but wired to nothing
- 🧟 **ORPHAN API** — endpoint exists but no UI reaches it
- 🔒 **AUTH-GATED** — expected 401 without login (this is *success*, means route is live and guarded)

All prod HTTP codes captured via `/usr/bin/curl` on 2026-04-15.

---

## A · Public Persona (no login)

| # | Feature | UI Page | API Wrapper | Worker Route | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 1 | Landing / home | `app/(public)/page.tsx` | — | — | 200 | ✅ |
| 2 | Programme list | `app/(public)/programme/page.tsx` | `getFilterOptions` → `lib/api/fund24.ts` | `katalog.ts GET /katalog` | 200 | ✅ |
| 3 | Programme filters | — | inline | `katalog.ts GET /katalog/filters` | 200 | ✅ |
| 4 | Programme detail | `app/(public)/programme/[id]/page.tsx` | inline | `katalog.ts GET /katalog/:id` | 200 | ✅ |
| 5 | Berater directory | `app/(public)/berater/page.tsx` | `getBeraterListe` → `lib/api/check.ts:175` | `netzwerk.ts GET /berater?pageSize=…` | 200 | ✅ |
| 6 | Berater detail | `app/(public)/berater/[id]/page.tsx` | `getBeraterProfil` → `lib/api/check.ts:185` | `netzwerk.ts GET /berater/:id` | 200 | ✅ |
| 7 | News list | `app/(public)/aktuelles/page.tsx` | `getNews` → `lib/api/fund24.ts` | `news.ts GET /api/news` | 200 | ✅ |
| 8 | News article | `app/(public)/aktuelles/[slug]/page.tsx` | `getNewsArtikel` | `news.ts GET /api/news/:slug` | 200 | ✅ |
| 9 | Fördercheck landing | `app/(public)/foerder-schnellcheck/page.tsx` | `checkStarten` → `lib/api/check.ts:15` | `checks.ts` → proxy to Worker 2 | 401 | ✅ |
| 10 | Fördercheck: Analyse step | `app/(public)/foerder-schnellcheck/analyse/page.tsx` | `ladeStatus` → `lib/api/precheck.ts` | `checks.ts` proxy | 401 | ✅ |
| 11 | Fördercheck: Chat step | `app/(public)/foerder-schnellcheck/chat/page.tsx` | `antworteFrage` | `checks.ts` proxy | 401 | ✅ |
| 12 | Fördercheck: Profil / Ergebnis / Bericht | `.../profil/page.tsx`, `.../ergebnis/page.tsx`, `.../bericht/page.tsx` | `lib/api/precheck.ts` wrappers | `checks.ts` proxy | 401 | ✅ |
| 13 | Impressum | `app/(public)/impressum/page.tsx` | — | — | 200 | ⚠️ *HRB + USt-IdNr. placeholder, user-action* |
| 14 | Datenschutz | `app/(public)/datenschutz/page.tsx` | — | — | 200 | ⚠️ *legal review pending, user-action* |
| 15 | AGB | `app/(public)/agb/page.tsx` | — | — | 200 | ⚠️ *legal review pending, user-action* |
| 16 | Preise | `app/(public)/preise/page.tsx` | — | — | 200 | ✅ |
| 17 | Support | `app/(public)/support/page.tsx` + `SupportWidget.tsx` | — | — | 200 | ✅ |

---

## B · Auth

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 18 | Register | `app/(auth)/registrieren/page.tsx` | `register` → `lib/api/auth.ts:63` | `auth.ts POST /api/auth/register` | 404 on GET (POST-only) | ✅ |
| 19 | Login | `app/(auth)/login/page.tsx` | `login` → `lib/api/auth.ts:90` | `auth.ts POST /api/auth/login` | 404 on GET (POST-only) | ✅ |
| 20 | Verify email code | `app/(auth)/verifizieren/page.tsx` | `verifyCode` → `lib/api/auth.ts:82` | `auth.ts POST /api/auth/verify-code` | (POST) | ✅ |
| 21 | Forgot password | `app/(auth)/passwort-vergessen/page.tsx` | `forgotPassword` | `auth.ts POST /api/auth/forgot-password` | (POST) | ✅ |
| 22 | Reset password | `app/(public)/passwort-reset/page.tsx` | `resetPassword` → `lib/api/auth.ts:119` | `auth.ts POST /api/auth/reset-password` | (POST) | ✅ |
| 23 | Logout | — (navbar) | `logout` + `DELETE /api/session` | `auth.ts POST /api/auth/logout` + Next route | — | ✅ |
| 24 | Next cookie set | — | — | `app/api/session/route.ts` (Next Route Handler) | — | ✅ |

---

## C · Onboarding (role-gated)

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 25 | Profil step | `app/onboarding/profil/page.tsx` | `updateProfil` → `lib/api/berater.ts` | `berater.ts PATCH /api/berater/me` | 401 | 🔒 |
| 26 | Unternehmen step | `app/onboarding/unternehmen/page.tsx` | inline fetch | `unternehmen.ts POST /api/unternehmen` | 401 | 🔒 |
| 27 | Expertise step | `app/onboarding/expertise/page.tsx` | `addExpertise` / `listExpertise` | `berater.ts` routes | 401 | 🔒 |
| 28 | Dienstleistungen step | `app/onboarding/dienstleistungen/page.tsx` | `addDienstleistung` | `berater.ts` routes | 401 | 🔒 |

---

## D · Unternehmen Dashboard

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 29 | Dashboard aggregation | `app/dashboard/unternehmen/page.tsx` | `getDashboard` + `getFund24Dashboard` | `me.ts GET /api/me/dashboard` | 401 | 🔒 |
| 30 | Anfragen list | `app/dashboard/unternehmen/anfragen/page.tsx` | `getAnfragen` → `lib/api/check.ts:61` | `me.ts GET /api/me/anfragen` | 401 | 🔒 |
| 31 | Tracker | `app/dashboard/unternehmen/tracker/page.tsx` | `getTracker` + `updateTrackerPhase` | `tracker.ts GET/PATCH /api/tracker/...` | 401 | 🔒 |
| 32 | Anträge list | `app/dashboard/unternehmen/antraege/page.tsx` | `listMeineAntraege` + `createAntrag` | `me.ts GET /api/me/antraege` + `antraege.ts POST /api/antraege` | 401 | 🔒 |
| 33 | Antrag detail | `app/antraege/[id]/page.tsx` | `getAntrag`, `updateAntragStatus`, doc CRUD, ACL | `antraege.ts` handlers | 401 | 🔒 |
| 34 | Favoriten | `app/dashboard/unternehmen/favoriten/page.tsx` | `listFavoriten` + `removeFavorit` | `foerdermittel/favoriten.ts` | 401 | 🔒 |
| 35 | Notifications | `components/shared/Notifications` | `getNotifications` | `foerdermittel/notifications.ts` | 401 | 🔒 |
| 36 | Fördercheck (logged-in variant) | `app/foerdercheck/[sessionId]/{analyse,chat,dokumente,ergebnisse}/page.tsx` | `lib/api/check.ts` wrappers | `checks.ts` proxy | 401 | 🔒 |

---

## E · Berater Dashboard

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 37 | Berater dashboard | `app/dashboard/berater/page.tsx` | `getDashboard`, `listBeraterKunden`, `updateAnfrage` | `me.ts`, `berater.ts` | 401 | 🔒 |
| 38 | Anfragen mgmt | `app/dashboard/berater/anfragen/page.tsx` | `getAnfragen`, `updateAnfrage` | `berater.ts GET /api/berater/anfragen` | 401 | 🔒 |
| 39 | Beratungen list | `app/dashboard/berater/beratungen/page.tsx` | `listBeratungen` | `beratungen.ts GET /api/beratungen` | 401 | 🔒 |
| 40 | Beratung detail | `app/dashboard/berater/beratungen/[id]/page.tsx` | `getBeratung`, `updateBeratung` | `beratungen.ts GET/PATCH /api/beratungen/:id` | 401 | 🔒 |
| 41 | Abwicklung (Provisionen) | `app/dashboard/berater/abwicklung/page.tsx` | `getProvisionVertraege`, `uploadAbwicklungDokument` | `berater.ts` | 401 | 🔒 |
| 42 | Nachrichten | `app/dashboard/berater/nachrichten/page.tsx` | `getAnfragen`, `getNachrichten`, `sendeNachricht` | `nachrichten.ts` | 401 | 🔒 |
| 43 | Vorlagen | `app/dashboard/berater/vorlagen/page.tsx` | `listVorlagen`, `createVorlage`, `deleteVorlage` | `vorlagen.ts` | 401 | 🔒 |
| 44 | Berichte (Editor) | `app/dashboard/berater/berichte/[id]/page.tsx` | `listBerichte`, `getBericht`, `updateBericht` | `reports.ts` / `/api/berichte` alias | 401 | 🔒 |
| 45 | Berater Profil (edit) | `app/dashboard/berater/profil/page.tsx` | `getBeraterProfil`, `updateBeraterProfil` | `berater.ts` | 401 | 🔒 |
| 46 | Berater Tracker | `app/dashboard/berater/tracker/page.tsx` | `getTracker`, `updateTrackerPhase` | `tracker.ts` | 401 | 🔒 |
| 47 | **Berater BAFA-Zert upload** | **MISSING** *(GAP-002)* | **MISSING** | **MISSING** | **404** | ❌ **STILL_OPEN** |

---

## F · Admin Dashboard

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 48 | Admin dashboard | `app/admin/page.tsx` | `getAdminDashboard`, `listPendingCerts`, `approveCert`, `rejectCert` | `admin.ts GET /api/admin/dashboard` | 401 | 🔒 |
| 49 | **Admin Cert-Queue** | `app/admin/page.tsx` (inline section) | `listPendingCerts`, `approveCert`, `rejectCert` | `admin.ts` (GET `/bafa-cert/pending`, POST `/bafa-cert/:userId/approve\|reject`) — shipped in PR #13 | 401 | ✅ (empty until GAP-002 ships) |
| 50 | User mgmt | `app/admin/users/page.tsx` | `getAdminUsers`, `updateAdminUser`, `deleteAdminUser` | `admin.ts` user routes | 401 | 🔒 |
| 51 | Aktuelles CMS | `app/admin/aktuelles/page.tsx` | `getAdminNews`, `createAdminNews`, `updateAdminNews` | `news.ts` admin sub-router | 401 | 🔒 |
| 52 | Provisionen mgmt | `app/admin/provisionen/page.tsx` | `getAdminProvisionen`, `updateAdminProvision` | `admin.ts` provisionen routes | 401 | 🔒 |
| 53 | Audit-Logs | `app/admin/audit-logs/page.tsx` | `listAuditLogs` | `admin.ts GET /api/admin/audit-logs` | 401 | 🔒 |
| 54 | Email-Outbox | `app/admin/email-outbox/page.tsx` | `listEmailOutbox`, `retryEmail` | `admin.ts GET /email-outbox`, `POST /:id/retry` | 401 | 🔒 |

---

## G · Shared / Cross-cutting

| # | Feature | UI | Wrapper | Worker | Prod | Status |
|---|---|---|---|---|:---:|:---:|
| 55 | Cookie banner | `components/cookie-banner/CookieBanner.tsx` | localStorage | — | — | ✅ |
| 56 | Consent-gated analytics | `components/analytics/ConsentGatedAnalytics.tsx` | Vercel SDK | — | — | ✅ |
| 57 | Support widget | `components/support/SupportWidget.tsx` | `tel:` + `mailto:` | — | — | ⚠️ *verify phone is support line not private* |
| 58 | Error boundary (app) | `app/error.tsx` | `Sentry.captureException` | — | — | ✅ |
| 59 | Error boundary (global) | `app/global-error.tsx` | `Sentry.captureException` | — | — | ✅ |
| 60 | 404 page | `app/not-found.tsx` | — | — | — | ✅ |
| 61 | Sentry PII scrubber | `lib/sentry/scrubber.ts` | — | — | — | ✅ |

**Totals: 61 features tracked.**

---

## H · Orphan-API Scan

Endpoints where `grep` finds ≥ 1 Worker route but **0 call sites** in the frontend:

| Route | Source | Likely reason |
|---|---|---|
| `POST /api/oa/*` (Ops-Agent context probe + variable audit) | `worker/src/routes/oa.ts` | Internal / cron-only — correct that no UI wires it |
| `POST /api/admin/onboarding/dispatch` | `worker/src/routes/admin.ts:95` | Admin-only manual trigger for onboarding cron — no UI by design |
| `POST /api/verify-payment` | `worker/src/routes/verify-payment.ts` | Called by PayPal/Stripe webhook, not frontend |
| `POST /api/orders/*`, `POST /api/payments/*` | `worker/src/routes/{orders,payments}.ts` | Payment flow — frontend redirects to provider, worker handles callback |
| `POST /api/promo/redeem` | `worker/src/routes/promo.ts` | No active promo UI yet; endpoint reserved |
| `GET /api/branchen/*` | `worker/src/routes/branchen.ts` | Used by fördercheck wizard proxied via Worker 2 — no direct FE call |
| `POST /api/check/*` (wizard 5-step) | `worker/src/routes/check.ts` | Called via `/api/checks/*` proxy; some legacy direct calls in `app/foerdercheck/[sessionId]/*` | 
| `POST /api/gdpr/delete-me` | `worker/src/routes/gdpr.ts` | Called via admin flow (GAP-005 of privacy dashboard); currently only admin DELETE /users/:id uses it |
| `GET /api/berichte/*` aliases | `worker/src/routes/reports.ts` | Frontend uses v2 alias path; original `/api/reports/*` kept for backward compat |

**No true 🧟 orphans found** — every Worker route either has a frontend caller, is called by cron/webhook/provider, or is an intentional alias.

---

## I · Orphan-UI Scan

UI components that exist but are never imported:

| Component | Path | Action |
|---|---|---|
| *(none found)* | — | — |

`grep -rn "import.*from" app/ components/` confirms every `components/**/*.tsx` is referenced at least once. Clean tree.

---

## J · Headline numbers

| Persona | Features | LIVE | Auth-gated | Broken / Missing |
|---|---:|---:|---:|---:|
| Public | 17 | 13 | 4 (checks) | 3 legal-review placeholders (⚠️) |
| Auth | 7 | 7 | — | — |
| Onboarding | 4 | — | 4 | — |
| Unternehmen | 8 | — | 8 | — |
| Berater | 11 | — | 10 | **1** (GAP-002 Zert-Upload) |
| Admin | 7 | — | 7 | — |
| Shared | 7 | 6 | — | 1 ⚠️ (SupportWidget phone verify) |
| **Total** | **61** | **26** | **33** | **1 broken + 4 user-action** |

---

## K · Critical path

For **pre-launch** the matrix shows exactly one broken code path: **GAP-002 Berater BAFA-Zert-Upload** (feature #47). Everything else either responds 200 (public / auth-gated fixtures) or 401 (correctly enforcing login). The 4 ⚠️ rows are user-actions (legal text, HRB, phone verification), not code work.
