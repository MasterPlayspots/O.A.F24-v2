# Phase 2 — CTA + Routing Deep-Dive

**Branch:** `audit/phase-2-cta-routing`
**Builds on:** Phase 1 page index (PR #29, 01_pages.json)
**Generated:** 2026-04-15

---

## Executive Summary

| Metric | Count |
|---|---|
| Pages audited | 58 |
| **CTAs extracted** | **206** |
| — live (wired to real endpoint/route) | 176 |
| — conditional (role/flag/state-gated branches) | 17 |
| — external (`https://…`) | 8 |
| — **broken** (dead route / missing handler) | **3** |
| — **mock** (alert-only, hardcoded demo) | **2** |
| Findings (new, severity-tagged) | 29 |
| **Orphan pages** (no incoming link from any scanned component) | **9** |
| Dead internal links | 1 |

**Bottom line:** CTA health is ~87 % live. The 5 broken/mock CTAs map 1:1 to known Phase-1 blockers plus a new one (PDF-download double-disabled). The bigger issue is **navigation gaps**: 8 protected pages exist but are unreachable from any in-app link — users who land on them came via direct URL or email.

---

## Broken & Mock CTAs (the 5 non-live)

| Page | CTA | Target | Status | Why |
|---|---|---|---|---|
| `/dashboard/unternehmen` | "Ansehen" | `/dashboard/checks/{id}` | broken | Route does not exist in `app/` (Phase-1 H-P1-05) |
| `/programme/[id]` | "Zum Fördercheck" | `/foerder-schnellcheck?programm={id}` | conditional→never | Parent page 404s before this renders (Phase-1 H-P1-01) |
| `/programme/[id]` | "Zurück zu Förderungen" | `/programme` | conditional→never | Same — page never renders |
| `/foerdercheck/[sessionId]/ergebnisse` | "Ergebnisse als PDF" | `alert("wird in Kürze implementiert")` | mock | Button is also `disabled` — **double-broken**, alert never fires in normal state |
| `/dashboard/unternehmen/anfragen` | "Nachricht" | — | broken | Rendered for `accepted` anfragen with no `onClick` — clicks are no-ops |

---

## Orphan Pages (9)

Pages whose route has **zero incoming links** from scanned sources (`app/**/*.tsx`, `components/layout/{Footer,Navbar}.tsx`, `ProgrammListe`, `BeraterKarte`, `admin/page.tsx quickLinks`).

| Route | Expected entry | Real concern? |
|---|---|---|
| `/passwort-reset` | email link | **No** — arrives via password-reset email |
| `/antraege/[id]` | dashboard list? | **Yes** — no page links to it; also H-P1-02 auth leak |
| `/dashboard/unternehmen/tracker` | unternehmen dashboard? Navbar? | **Yes** — not linked anywhere |
| `/dashboard/berater/berichte` | berater dashboard quickLinks? | **Yes** — quickLinks list links to `/abwicklung`, `/anfragen`, `/beratungen`, `/nachrichten` only |
| `/dashboard/berater/profil` | berater dashboard? | **Yes** — no link despite being the Berater self-service profile |
| `/dashboard/berater/tracker` | sidebar? | **Yes** |
| `/dashboard/berater/vorlagen` | sidebar? | **Yes** |
| `/admin/audit-logs` | admin quickLinks | **Yes** — `app/admin/page.tsx:115-118` quickLinks has `/users`, `/aktuelles`, `/provisionen` only |
| `/admin/email-outbox` | admin quickLinks | **Yes** — same omission |

**Fix:** one-liner additions to `app/admin/page.tsx` quickLinks and a proper sidebar in `app/dashboard/{berater,unternehmen}/layout.tsx`.

---

## Dead Internal Links (1)

| Source | Target | Note |
|---|---|---|
| `app/dashboard/unternehmen/page.tsx:212` | `/dashboard/checks/{id}` | Route does not exist — `app/dashboard/` has only `berater/` and `unternehmen/`. **H-P1-05** already filed; now also confirmed via link-graph scan. |

The `/dashboard/berater/berichte/new` link that surfaced in Phase 1 is **not a dead link** — `new` is handled intentionally as create-mode by `berichte/[id]/page.tsx:42` (`const isNew = id === 'new'`). Kept out of the dead-link list.

---

## Findings by Severity

### HIGH (4)

| ID | Page | Issue |
|---|---|---|
| H-P2-01 | `/foerder-schnellcheck/bericht` | **DSGVO violation** — single checkbox at line 151 bundles Datenschutz consent + marketing-email opt-in ("Ich akzeptiere die Datenschutzerklärung **und** möchte E-Mails von fund24 erhalten"). Zod-required → user cannot receive PDF without opting into marketing. Also no link to `/datenschutz`. |
| H-P2-02 | `/programme` ↔ `/programme/[id]` | List-to-detail navigation entirely broken. `ProgrammKarte` renders one `Link href="/programme/{id}"` per card; every card 404s (confirms H-P1-01). Compounding: `/foerder-schnellcheck` ignores the `?programm=` query param, so the cross-sell CTA on (would-be) detail page loses its reference even if the 404 were fixed. |
| H-P2-03 | `/foerdercheck/[sessionId]/ergebnisse` | PDF CTA is `disabled` **and** onClick = `alert("wird in Kürze implementiert")` — never fires, never exports. Two Phase-1 findings compound here: feature is unbuilt, button promises otherwise. |
| H-P2-04 | Berater-Dashboard labels vs. links | "Provisionen" link in `/dashboard/berater/page.tsx:298` points to `/dashboard/berater/abwicklung`. `/dashboard/berater/anfragen` renders `anfrage.nachricht` under the "Dienstleistung:" label (data-model mismatch). Users see wrong labels for the wrong data. |

### MEDIUM (11)

| ID | Page | Issue |
|---|---|---|
| M-P2-01 | `/foerder-schnellcheck/chat`, `.../ergebnis`, `.../bericht` | `router.push()` called during render, not in `useEffect` — hydration warnings and race conditions. `/profil` uses the correct `useEffect` pattern → flow is internally inconsistent. |
| M-P2-02 | `/onboarding/expertise` + `.../dienstleistungen` | Sequential `for entry of data.entries { await addX(entry) }` persists entries 1..N−1 on failure of N; no rollback or idempotency key. Resubmit duplicates rows. |
| M-P2-03 | `/berater/[id]` | Success feedback uses native `alert('Ihre Anfrage wurde erfolgreich gesendet!')` at line 116 — app has `sonner` Toaster configured globally. |
| M-P2-04 | `/dashboard/berater/vorlagen`, `/admin/users`, `/antraege/[id]` (DokumenteListe) | Native `confirm()` on delete; rest of app uses shadcn `AlertDialog`. |
| M-P2-05 | `/dashboard/unternehmen/favoriten` | Favoriten removal has **no confirmation** at all — single-click deletes immediately. |
| M-P2-06 | `/dashboard/berater/berichte/[id]` | Autosave fires only on `onBlur`, not on content change — user exiting tab mid-edit loses keystrokes. |
| M-P2-07 | `/admin/audit-logs` | Filter requires a manual button click after every criterion change — no debounced re-query. |
| M-P2-08 | `/foerdercheck/[sessionId]/analyse` | 120 s client-side timeout fallback with no retry or user-visible error — just lands on `/ergebnisse` which may itself be empty. |
| M-P2-09 | `/aktuelles/[slug]` | "Fördercheck starten" CTA (line 135) points to `/foerdercheck` (authenticated), while landing + preise send anonymous users to `/foerder-schnellcheck` (public). Two parallel entry points for the same funnel. |
| M-P2-10 | `/foerder-schnellcheck` | URL-scraping entry (`websiteUrl` input) has **no DSGVO disclosure** — user is silently opting in to third-party scraping. |
| M-P2-11 | `/dashboard/unternehmen/anfragen` | "Nachricht" button rendered for accepted anfragen has no handler — user clicks, nothing happens. Visual affordance promises an action that isn't wired. |

### LOW (14)

| ID | Page(s) | Issue |
|---|---|---|
| L-P2-01 | `/registrieren` | Legacy verify-response branch (line 119) pushes `/verifizieren` without `email` query param; `verifizieren/page.tsx:30-32` then redirects to `/login` if the auth-store is empty — fragile only-works-by-accident path. |
| L-P2-02 | `/agb`, `/datenschutz` | Visible "zu Demonstrationszwecken erstellt — bitte anwaltlich überarbeiten" banner still in production (Phase-1 L-P1-09 — reconfirmed via link-graph). |
| L-P2-03 | `/admin/provisionen` | "Betrag" edit writes `"bewilligt: X EUR"` into free-text `notiz` column; `provisionBetrag` only updated in local state, never persisted to backend. |
| L-P2-04 | `/berater` vs. `/programme` | Design drift — shadcn `Select` vs. native `<select>` on sibling list pages. |
| L-P2-05 | `/foerder-schnellcheck` | German copy: "Was passiert nächster?", "KI matched Sie" (should be "matcht" / "gleicht ab"), "3.400+" vs. root "3.400+" vs. `/programme` "2.500+" inconsistency. |
| L-P2-06 | `/dashboard/berater/profil` | Silent data loss confirmed (H-P1-04) — `spezialisierungen` + `websiteUrl` omitted from `updateBeraterProfil` payload. |
| L-P2-07 | `app/admin/page.tsx` | quickLinks array (line 115) missing `/admin/audit-logs` + `/admin/email-outbox` → those pages are unreachable from the admin dashboard. |
| L-P2-08 | `/dashboard/berater` | No links to `profil`, `tracker`, `berichte`, `vorlagen` from the berater dashboard — four sub-pages orphaned. |
| L-P2-09 | `/dashboard/unternehmen` | No link to `tracker` from the unternehmen dashboard (one sub-page orphaned). |
| L-P2-10 | `/onboarding/*` | Onboarding does not persist a next-step intent — user who closes the wizard halfway restarts from step 1 on next login. |
| L-P2-11 | `/foerder-schnellcheck/chat` | No `<h1>` on page (Phase-1 M-P1-02 reconfirmed). |
| L-P2-12 | `/foerder-schnellcheck/ergebnis`, `.../bericht` | "Detaillierte Report" / "detaillierten Report" gender inconsistency; "Newsletters" should be "Newslettern" (dative plural). |
| L-P2-13 | `/aktuelles` + `/aktuelles/[slug]` | `ComingSoonBanner` reads "in Entwicklung · geplant für Q2 2026" while the pages fetch real data — mismatch once articles ship. |
| L-P2-14 | Multiple | 0-per-page metadata gap (Phase-1 L-P1-01) impacts crawl discovery of deep links — reconfirmed via link-graph. |

---

## Routing Map

Notable flow edges (primary paths only, not legal/error):

```
(Navbar / Footer)  →  /  →  /foerder-schnellcheck → /profil → /chat → /analyse → /ergebnis → /bericht
                                                                                       ↓
                                                                              /registrieren
                                                                                       ↓
                                                                                  /login
                                                                                       ↓
                                                (role?)  ┌─ berater  ─ /onboarding/profil → /expertise → /dienstleistungen → /dashboard/berater
                                                         └─ unternehmen ─ /onboarding/unternehmen → /dashboard/unternehmen
                                                                                                              ↓
                                                                                                       /foerdercheck
                                                                                                              ↓
                                                                                      /foerdercheck/[sessionId]/chat → /analyse → /ergebnisse → /dokumente

/programme  →  /programme/[id]   ← 404 for every id (H-P1-01)
/berater    →  /berater/[id]
/aktuelles  →  /aktuelles/[slug] (empty — no articles seeded)

Admin:
  Navbar  →  /admin  →  quickLinks: /admin/users · /admin/aktuelles · /admin/provisionen
                        NOT linked: /admin/audit-logs · /admin/email-outbox
```

### Circular dependencies

None detected. Sub-page → parent `/admin` back-links are intentional breadcrumbs, not cycles.

---

## JSON Sidecar

[`02_cta_routing.json`](./02_cta_routing.json) — per-page CTA catalog with targets, types, statuses, and incoming/outgoing link sets. Feeds Phase 3 (Frontend↔Backend map), Phase 5 (Dead-code detection), and Phase 6 (HTML sitemap).

---

_End of Phase 2._
