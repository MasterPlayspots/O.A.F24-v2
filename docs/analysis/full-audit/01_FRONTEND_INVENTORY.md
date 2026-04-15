# Phase 1 — Frontend Inventory

**Branch:** `audit/phase-1-frontend-inventory`
**Live host:** https://fund24.io
**API host:** https://api.fund24.io
**Generated:** 2026-04-15
**Scope rule:** In-scope iff bound in `wrangler.toml` OR referenced in `package.json` / `vercel.json` / `.env.example` OR imported in `app/`, `lib/`, `components/`, `worker/src/`. All 58 pages below satisfy the code-import criterion.

---

## Executive Summary

| Metric | Value |
|---|---|
| Pages discovered (`page.tsx` + error boundaries) | **58** |
| Public (anonymous-reachable) | **26** |
| Protected (middleware redirects to `/login` without JWT) | **29** |
| Error boundaries (`error.tsx`, `not-found.tsx`, `global-error.tsx`) | **3** |
| Live-checked paths (curl on fund24.io) | **55** |
| 2xx (served) | 25 |
| 3xx (`307 → /login?redirect=…` on protected) | 27 |
| 4xx expected (`/doesnotexist` sanity) | 1 |
| **4xx red-flag** (should be 200) | **1** → `/programme/[id]` |
| **Auth leak** (200 without auth, should redirect) | **1** → `/antraege/[id]` |
| Pages declaring their own `export const metadata` | 3 / 58 |
| Pages with `generateMetadata` | 1 |
| Pages inheriting root metadata only | 54 / 58 |

**Bottom line:** Site shell is healthy (security headers correct, CSP/STS/XFO all present, robots/sitemap respond 200, middleware JWT verification works). **Two hard production bugs** — a broken programme detail page and an auth-hygiene gap on `/antraege` — plus a systemic SEO metadata gap and a large set of content/UX inconsistencies driven by incomplete WIP banners and bilingual copy drift.

---

## Red Flags (ordered by severity)

### HIGH — fix before launch

| ID | Route | Finding | Fix location |
|---|---|---|---|
| **H-P1-01** | `/programme/[id]` | Every ID returns **404** in production. `getProgramm()` calls `GET /api/foerderprogramme/:id` — the worker only exposes `/api/foerdermittel/katalog/:id`. `notFound()` always fires. Also `Number(id)` silently produces `NaN` for non-numeric ids. | [lib/api/fund24.ts:36](../../../lib/api/fund24.ts#L36) |
| **H-P1-02** | `/antraege/[id]` | Served **200 without authentication**. `/antraege` is not in `PROTECTED_PREFIXES`; only a post-hydration `router.replace('/login')` guards the page. Bots/curl receive the full shell. | [middleware.ts:23](../../../middleware.ts#L23) — add `'/antraege'` |
| **H-P1-03** | `sitemap.xml` | Renders **0 programme URLs** (only 12 static + 16 berater = 28 total). `fetchProgrammIds()` reads `data.results` but the API returns `{ success, data, pagination }`. 3.408 programmes missing from sitemap → SEO loss. | [app/sitemap.ts:25-43](../../../app/sitemap.ts#L25-L43) |
| **H-P1-04** | `/dashboard/berater/profil` | **Silent data loss.** The form captures `spezialisierungen` + `websiteUrl`; the `updateBeraterProfil` payload omits both. Berater saves → values vanish on reload. | `app/dashboard/berater/profil/page.tsx` onSubmit |
| **H-P1-05** | `/dashboard/unternehmen` | **Dead link.** The "Ansehen" button on the active-check row points to `/dashboard/checks/[id]`. No such route exists in `app/`. | `app/dashboard/unternehmen/page.tsx` |

### MEDIUM — fix in Phase 2

| ID | Route | Finding |
|---|---|---|
| M-P1-01 | `/foerder-schnellcheck/bericht` | Single checkbox bundles Datenschutz consent and marketing newsletter opt-in — DSGVO problem. Also the label has no link to `/datenschutz`. |
| M-P1-02 | `/foerder-schnellcheck/chat` | Missing `<h1>` — uses `<h2>` for the active question. Single-h1 + a11y convention violation. |
| M-P1-03 | `/berater/[id]` | Success feedback uses native browser `alert()` despite `sonner` Toaster being configured globally. |
| M-P1-04 | Dashboard / admin / aktuelles | `ComingSoonBanner` wraps entire subtrees (berater dashboard, admin, unternehmen-subpages, aktuelles) even when the page is functional. Perceived as "not ready". |
| M-P1-05 | Onboarding | **Branche taxonomy mismatch** — unternehmen form has 11 entries with amp-suffix formatting (e.g. "IT & Software"), berater form has 10 short entries ("IT", "Handwerk"). Matching logic cannot align. |
| M-P1-06 | `/vorlagen`, `/admin/users`, `/berater/[id]` | Native `alert()` / `confirm()` instead of shared dialog + Toaster components. |
| M-P1-07 | `/foerder-schnellcheck/chat`, `.../ergebnis` | `router.push()` during render (not inside `useEffect`) → hydration warnings. |
| M-P1-08 | `/admin/provisionen` | Hardcoded "9,99 %" in column header despite per-row `provisionsSatz`; Betrag edit writes structured `"bewilligt: X EUR"` into the free-text `notiz` column. |
| M-P1-09 | `/onboarding/expertise`, `.../dienstleistungen` | Sequential `for entry of ... { await addX(entry) }` — partial-failure risk: entry 3 fails → entries 1-2 already persisted, 4-5 silently dropped. |
| M-P1-10 | `/foerdercheck/*` wizard | Still uses the older light-gradient styling; rest of the authenticated shell uses the dark "Institutional Architect" theme. |

### LOW — content and consistency cleanup

| ID | Summary |
|---|---|
| L-P1-01 | **0 per-page metadata** on 54 / 58 pages. Only `/programme`, `/impressum`, and the `/foerder-schnellcheck` layout declare any. All social-share previews get the generic root title/description. |
| L-P1-02 | **Program-count inconsistency:** root says "3.400+", `/programme` metadata says "2.500+". |
| L-P1-03 | Typos / Denglisch across multiple pages: "Konteniverwaltung", "behhalten", "behaften", "Zahlte Provisionen", "Förderbereichcen", "aller Ihre Anfragen", "Was passiert nächster?", "KI matched Sie", "Newsletters". |
| L-P1-04 | `/passwort-reset` lives in `(public)` group instead of `(auth)`; re-implements its own chrome inconsistent with `/login`, `/registrieren`, `/verifizieren`, `/passwort-vergessen`. |
| L-P1-05 | `/datenschutz` names the Berlin data-protection authority though the company is in Kronach (Bavaria, IHK Oberfranken Bayreuth). |
| L-P1-06 | `/impressum` heading still says "§ 5 TMG" — TMG was superseded by DDG. |
| L-P1-07 | `/agb`, `/datenschutz`, `/impressum` all render "Letzte Aktualisierung" via `new Date().toLocaleDateString()` → always today, no audit trail. |
| L-P1-08 | `/support` + legal reference `info@fund24.io`; the floating `SupportWidget` uses `support@fund24.io`. |
| L-P1-09 | `/agb` + `/datenschutz` still carry TODO: "zu Demonstrationszwecken — bitte anwaltlich überarbeiten". (Known launch-blocker, not a new finding.) |
| L-P1-10 | `/registrieren` password regex `[!@#$%^&*]` (strict); `/passwort-reset` allows a broader set — user can reset to a weaker password. |
| L-P1-11 | `app/global-error.tsx` has no `reset()` handler; Sentry tagging convention is inconsistent (`error.tsx` tags `{ boundary }`, `global-error.tsx` is untagged, `/passwort-reset` uses `{ area, op }`). |
| L-P1-12 | `/berater` uses `components/ui/select`; `/programme` uses raw `<select>` — visual drift between sibling list pages. |

---

## Full Route Table

Legend — **Status:** `200` served · `307→…` middleware redirect · `404` page not found (should or shouldn't).
`Meta` = has `export const metadata` (y) or inherits root (n).

### Public (26)

| Route | Persona | Status | Meta | H1? | Notes |
|---|---|---|---|---|---|
| `/` | public | 200 | n | y | Landing — hero + steps + pricing CTA |
| `/agb` | public | 200 | n | y | typos; legal-review TODO |
| `/aktuelles` | public | 200 | n | y | **ComingSoonBanner**, no page metadata |
| `/aktuelles/[slug]` | public | N/A (0 articles) | y (generateMetadata) | y | **ComingSoonBanner**, mismatched CTA `/foerdercheck` |
| `/berater` | public | 200 | n | y | **ComingSoonBanner (layout)** |
| `/berater/[id]` | public | 200 | n | y | **ComingSoonBanner**, uses native `alert()` |
| `/datenschutz` | public | 200 | n | y | jurisdiction mismatch (Berlin); legal TODO |
| `/foerder-schnellcheck` | public | 200 | n (layout has meta) | y | Denglisch typos; program-count mismatch |
| `/foerder-schnellcheck/profil` | public | 200 | n | y | |
| `/foerder-schnellcheck/chat` | public | 200 | n | **n** | **Missing H1 — a11y**, `router.push()` in render |
| `/foerder-schnellcheck/analyse` | public | 200 | n | y | |
| `/foerder-schnellcheck/ergebnis` | public | 200 | n | y | `router.push()` in render |
| `/foerder-schnellcheck/bericht` | public | 200 | n | y | **DSGVO consent bundled w/ newsletter** |
| `/impressum` | public | 200 | y | y | HRB placeholder; TMG heading |
| `/login` | public | 200 | n | y | |
| `/passwort-reset` | public | 200 | n | y | **Wrong route group**; regex looser than registrieren |
| `/passwort-vergessen` | public | 200 | n | y | |
| `/preise` | public | 200 | n | y | |
| `/programme` | public | 200 | y | y | program-count "2.500+" vs root "3.400+" |
| `/programme/[id]` | public | **404 for all IDs** | n | — | **H-P1-01 — broken endpoint call** |
| `/registrieren` | public | 200 | n | y | password regex stricter than reset |
| `/support` | public | 200 | n | y | email mismatch w/ SupportWidget |
| `/verifizieren` | public | 200 | n | y | |

### Protected (29) — all 307 → `/login?redirect=…` without JWT

| Route | Persona | Meta | Notes |
|---|---|---|---|
| `/foerdercheck` | unternehmen | n | light-theme drift |
| `/foerdercheck/[sessionId]/chat` | unternehmen | n | light-theme drift |
| `/foerdercheck/[sessionId]/analyse` | unternehmen | n | typo: "später auf die Ergebnisse prüfen" |
| `/foerdercheck/[sessionId]/ergebnisse` | unternehmen | n | **PDF download unimplemented**, typo "Förderbereichcen" |
| `/foerdercheck/[sessionId]/dokumente` | unternehmen | n | light-theme drift |
| `/onboarding/unternehmen` | unternehmen | n | no step indicator; branche taxonomy (A) |
| `/onboarding/profil` | berater | n | branche taxonomy (B) — mismatches A |
| `/onboarding/expertise` | berater | n | partial-failure risk |
| `/onboarding/dienstleistungen` | berater | n | partial-failure risk; no price-range validation |
| `/dashboard/unternehmen` | unternehmen | n | **Dead link `/dashboard/checks/[id]`** |
| `/dashboard/unternehmen/anfragen` | unternehmen | n | ComingSoonBanner; "aller Ihre" grammar |
| `/dashboard/unternehmen/antraege` | unternehmen | n | |
| `/dashboard/unternehmen/favoriten` | unternehmen | n | ComingSoonBanner |
| `/dashboard/unternehmen/tracker` | unternehmen | n | ComingSoonBanner |
| `/dashboard/berater` | berater | n | **layout-wide ComingSoonBanner**; data-model mismatch |
| `/dashboard/berater/anfragen` | berater | n | inherited ComingSoonBanner |
| `/dashboard/berater/beratungen` | berater | n | |
| `/dashboard/berater/beratungen/[id]` | berater | n | |
| `/dashboard/berater/berichte` | berater | n | links to `/berichte/new` (intentionally handled by `[id]`) |
| `/dashboard/berater/berichte/[id]` | berater | n | `id='new'` is create-mode |
| `/dashboard/berater/abwicklung` | berater | n | |
| `/dashboard/berater/nachrichten` | berater | n | |
| `/dashboard/berater/profil` | berater | n | **Silent data loss — spezialisierungen + websiteUrl** |
| `/dashboard/berater/tracker` | berater | n | |
| `/dashboard/berater/vorlagen` | berater | n | uses native `confirm()` |
| `/admin` | admin | n | **layout-wide ComingSoonBanner** |
| `/admin/aktuelles` | admin | n | |
| `/admin/audit-logs` | admin | n | |
| `/admin/email-outbox` | admin | n | |
| `/admin/provisionen` | admin | n | hardcoded "9,99 %"; structured value in free-text notiz |
| `/admin/users` | admin | n | uses native `confirm()` |

### Leaked (1)

| Route | Persona | Status | Notes |
|---|---|---|---|
| `/antraege/[id]` | any-auth | **200** | **H-P1-02 — `/antraege` missing from PROTECTED_PREFIXES**; only client-side guard |

### Error boundaries (3)

| File | Role |
|---|---|
| `app/error.tsx` | per-route error boundary; has `reset()`, Sentry `tags: { boundary }` |
| `app/not-found.tsx` | 404 page — links to `/programme` |
| `app/global-error.tsx` | app-shell fallback — **no reset()**, untagged Sentry |

---

## 404s & Redirects

**Unexpected 404:** `/programme/[id]` for every ID (H-P1-01).

**Expected 307 → /login:** all 27 protected routes redirect correctly via `jose` JWT verification in `middleware.ts`, including the admin subtree (which also downgrades non-admin JWTs to `/dashboard/unternehmen`).

**Not in PROTECTED_PREFIXES:** `/antraege` (H-P1-02).

---

## Seiten mit leerer Metadata

54 / 58 pages have no `export const metadata` and no `generateMetadata`. Everything inherits the root default:

```
Title:       fund24 – Fördermittel einfach finden
Description: Kostenloser KI-Fördercheck für Unternehmen. 3.400+ aktive Förderprogramme. …
```

Pages that DO declare their own metadata:

| File | Form |
|---|---|
| `app/layout.tsx` | root |
| `app/(public)/programme/page.tsx` | `export const metadata` |
| `app/(public)/impressum/page.tsx` | `export const metadata` |
| `app/(public)/foerder-schnellcheck/layout.tsx` | `export const metadata` (applies to 6 flow pages) |
| `app/(public)/aktuelles/[slug]/page.tsx` | `generateMetadata` (async per-slug) |

Everything else — including high-traffic `/berater/[id]` and `/programme/[id]` (once fixed) — silently inherits the root title.

---

## Seiten ohne H1

| Route | Detail |
|---|---|
| `/foerder-schnellcheck/chat` | Uses `<h2>` for the active question. Entire flow otherwise has H1s per step. |
| `/programme/[id]` | H1 is `{programm.titel}` but never renders (404). |

Default-render for dynamic and error boundaries can't be asserted without a browser — the files above are the ones that have no static H1 in the JSX tree.

---

## Asset Inventory

**No `public/` directory exists.** All static assets are app-co-located or dynamically generated.

| Kind | Path | Notes |
|---|---|---|
| Favicon | `app/favicon.ico` | 25.9 KB |
| Global CSS | `app/globals.css` | 4.9 KB (Tailwind + architect palette) |
| Root OG image | `app/opengraph-image.tsx` | Satori-generated, 99 LOC |
| Per-berater OG image | `app/(public)/berater/[id]/opengraph-image.tsx` | 107 LOC |
| Per-programme OG image | `app/(public)/programme/[id]/opengraph-image.tsx` | 93 LOC — **currently unreachable** while the page 404s |

**Fonts** (all self-hosted by Next, Google Fonts source):
`Geist`, `Geist Mono`, `Manrope`, `Inter` — declared in `app/layout.tsx`.

**next/image usage:** **0** — no component imports `next/image`; `next.config.ts` has no `images.remotePatterns` entry.

**External URLs referenced in code:**
- `https://vercel.com/legal/privacy`, `https://www.cloudflare.com/de-de/privacypolicy/` — both in `/datenschutz` as sub-processor references
- `https://ec.europa.eu/consumers/odr` — `/impressum` (ODR platform)
- `https://schema.org` — root JSON-LD

**No CDN / remote image hosts** are referenced in any `<img>`, `<Image>`, or `next/image` call.

---

## Meta-Tags / SEO

**`robots.txt`** (live 200):
```
User-Agent: *
Allow: /
Disallow: /api/  /admin/  /dashboard/  /onboarding/
         /antraege/  /foerdercheck/  /verifizieren  /passwort-reset
Host: https://fund24.io
Sitemap: https://fund24.io/sitemap.xml
```
Matches `PROTECTED_PREFIXES` + the unfinished auth pages. Correct.

**`sitemap.xml`** (live 200):
28 URLs — 12 static + **0 programme** (H-P1-03 bug) + 16 berater.
Missing: 3.408 programme detail pages — every programme is invisible to search engines today.

**`hreflang`:** none. Site is single-locale `de_DE`. No multi-language planning reflected in code.

**Canonical URLs:** none per-page. Only `metadataBase: new URL("https://fund24.io")` at the root. If a programme is reachable via both `?utm=…` and bare URL once H-P1-01 is fixed, duplicate-content risk appears — adding per-page `alternates.canonical` is cheap.

**JSON-LD:** Organization schema is injected inline in `app/layout.tsx` (matches address, contact, USt-IdNr via extension).

**`metadataBase`:** set to `https://fund24.io` — good, OG images resolve absolutely.

---

## Per-Page Detail

One markdown file per discovered page — see [`pages/`](./pages/). Template captures: metadata, H1–H3, buttons, links, form fields, toast/error messages, notes/red flags.

Filename convention: route with `/` → `-`, dynamic segments kept literal (`[id]` → `-id`, `[sessionId]` → `-sessionId-`, `[slug]` → `-slug`).

---

## JSON Sidecar

Machine-readable summary for downstream phases: [`01_pages.json`](./01_pages.json).

---

## How This Feeds Phases 2-5

- **Phase 2 (API-routes audit):** H-P1-01 (`/api/foerderprogramme/*` called but unmounted) and the real backend path `/api/foerdermittel/katalog/:id` are the first hit list. Cross-reference `worker/src/routes/*` against every `apiCall(API.FUND24, ...)` site in `lib/`.
- **Phase 3 (Auth & permissions):** H-P1-02 (`/antraege` missing from middleware). Also: every page using a `client-side router.replace('/login')` instead of middleware-only protection.
- **Phase 4 (Data & DB):** H-P1-04 (silent data loss on berater profil) is a front-to-back trace — the `updateBeraterProfil` payload shape vs. the `berater` / `berater_profil` tables.
- **Phase 5 (Orphans):** The `/dashboard/checks/[id]` reference in `/dashboard/unternehmen` points to a route that does not exist — orphan-link. The `ComingSoonBanner` feature-flag pattern should be tallied across layouts.

---

_End of Phase 1 inventory._
