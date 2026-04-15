# Route: /aktuelles/[slug]

**Source:** `app/(public)/aktuelles/[slug]/page.tsx`
**Persona:** public
**Live Status:** N/A (no articles in DB)
**Protected:** no

## Metadata
- **Title:** {article.titel} | fund24 (from `generateMetadata` via `getNewsArtikel(slug)`); on fetch failure: "Artikel nicht gefunden | fund24"
- **Description:** {article.zusammenfassung} (dynamic); no fallback description on error branch
- **OpenGraph:** — (inherits root)

## H1
{article.titel}  — dynamic, rendered from fetched article

## H2
- Weitere Artikel
- Interessiert an diesem Thema?

## H3
—

## Buttons
- Fördercheck starten
- Zurück zur Übersicht → (visually a heading-styled link inside a card)

## Links
- `/aktuelles` — ← Zurück zu Aktuelles (top breadcrumb)
- `/foerdercheck` — Fördercheck starten (bottom CTA card)
- `/aktuelles` — Zurück zur Übersicht → (related-articles card)

## Form Fields
—

## Messages / Toasts
- Sentry capture only (not user-visible) on markdown-parse failure (`area: 'news', op: 'parse-markdown'`); on fetch failure calls `notFound()` → Next.js default 404.

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav: Programme, Berater, Preise, Aktuelles; auth: Anmelden / Registrieren.
- Footer columns: Plattform / Beratung / Support / Legal; copy: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget: "Hilfe & Kontakt", +49 1512 9617192, support@fund24.io, "Mo–Fr 9–17 Uhr".
- Root layout mounts CookieBanner ("Datenschutz auf fund24" / "Alle akzeptieren" / "Nur notwendige").
- Route-local layout `app/(public)/aktuelles/layout.tsx` also wraps this detail page with the ComingSoonBanner: "🚧 Coming Soon: Aktuelles & News-Blog ist aktuell in Entwicklung · geplant für Q2 2026. Inhalte sind Vorschau/Platzhalter."

## Notes
- Page is never reachable while no articles exist (dynamic route via `getNewsArtikel(slug)` → `notFound()` on miss).
- Bottom CTA links to `/foerdercheck` — the homepage CTA links to `/foerder-schnellcheck`; verify the `/foerdercheck` route actually exists and redirects/renders, otherwise this is a dead link.
- Related-articles block on the right only shows a static "Newsletter / Keine Updates verpassen" card with no sign-up form or mailto — copy implies functionality ("Melden Sie sich an …") that is not yet implemented.
- Static labels rendered: "Veröffentlicht am", "Verfasser", "Tags:", "Alle Artikel", "Newsletter", "Keine Updates verpassen".
- Body HTML is user-controlled markdown (marked + sanitize-html, restricted tag allow-list); `dangerouslySetInnerHTML` is used after sanitisation.
- 404 branch returns metadata only — no custom not-found UI in this file (relies on Next default or a sibling `not-found.tsx` if present).
