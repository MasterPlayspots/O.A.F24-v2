# Route: /aktuelles

**Source:** `app/(public)/aktuelles/page.tsx` (+ `app/(public)/aktuelles/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root → "fund24 – Fördermittel einfach finden") — no `metadata` export on the page
- **Description:** — (inherits root)
- **OpenGraph:** — (inherits root)

## H1
Aktuelles

## H2
—

## H3
- {article.titel} (rendered per article card — dynamic)

## Buttons
- Alle (category filter)
- {kategorie} (one button per unique article category — dynamic)

## Links
- `/aktuelles/{slug}` — per-article card wrapping title, summary, image and "Zum Artikel →"

## Form Fields
—

## Messages / Toasts
- "Nachrichten konnten nicht geladen werden. Bitte später erneut versuchen." (error state — inline, not a toast)
- "Keine Artikel in dieser Kategorie vorhanden" (empty state)

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav: Programme, Berater, Preise, Aktuelles; auth: Anmelden / Registrieren.
- Footer columns: Plattform / Beratung / Support / Legal; copy: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget: "Hilfe & Kontakt", +49 1512 9617192, support@fund24.io, "Mo–Fr 9–17 Uhr".
- Root layout mounts CookieBanner ("Datenschutz auf fund24" / "Alle akzeptieren" / "Nur notwendige").
- Route-local layout `app/(public)/aktuelles/layout.tsx` renders `<ComingSoonBanner feature="Aktuelles & News-Blog" eta="Q2 2026" />` above the page. Banner text:
  - "🚧 Coming Soon: Aktuelles & News-Blog ist aktuell in Entwicklung · geplant für Q2 2026. Inhalte sind Vorschau/Platzhalter."

## Notes
- No `export const metadata` on the page — title falls back to root default ("fund24 – Fördermittel einfach finden") rather than a page-specific title; should add its own metadata.
- Subtitle paragraph under the H1: "Neuigkeiten, Updates und Informationen von fund24".
- Client component (`'use client'`) — data fetch via `getNews()`; errors are captured with Sentry (`area: 'news', op: 'list'`).
- Category filter button labels are derived from article data at runtime; only the "Alle" label is static.
- Loading state renders three skeleton cards (no text).
- Route is marked "Coming Soon" via the route-local layout even though `getNews()` is wired up — a real content-vs-banner mismatch once articles ship.
