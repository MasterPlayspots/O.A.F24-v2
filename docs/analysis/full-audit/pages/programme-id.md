# Route: /programme/[id]

**Source:** `app/(public)/programme/[id]/page.tsx`
**Persona:** public
**Live Status:** 404 (BUG — see Notes)
**Protected:** no

## Metadata
- **Title:** — (inherits root; no `export const metadata` / no `generateMetadata`)
- **Description:** — (inherits root)
- **OpenGraph:** — (inherits root)

## H1
{programm.titel} (dynamic — never renders in production because every request falls into `notFound()`)

## H2
- Übersicht
- Details

## H3
- Passt dieses Programm?

## Buttons
- Zum Fördercheck (primary CTA in sidebar, wraps a Link)

## Links
- `/programme` — "Zurück zu Förderungen" (back link)
- `/foerder-schnellcheck?programm={id}` — wraps the "Zum Fördercheck" button

## Form Fields
—

## Messages / Toasts
- "Nutzen Sie unseren schnellen Check, um zu sehen, ob diese Förderung für Ihr Unternehmen geeignet ist." (sidebar body copy)

## Notes
- **RED FLAG — broken in production:** `getProgramm()` in `lib/api/fund24.ts:36` calls `GET /api/foerderprogramme/:id` which the fund24 Worker does not expose. The correct backend endpoint per the catalog worker is `GET /api/foerdermittel/katalog/:id`. Every programme detail request therefore throws → caught by `try/catch` → `notFound()` → 404. The H1/body/CTA below are never rendered in production.
- Also: because `getProgramm(Number(id))` casts the id to `Number`, any non-numeric id silently becomes `NaN` and still 404s. The URL from ProgrammKarte likely uses a string UUID/slug — worth auditing the card component for the id shape.
- Labels present in JSX (would render if fixed): "Förderhöhe" (formatted EUR range), "Förderquote" (`{foerdersatz_pct}%`), "Fördergebiet", "Antragsteller".
- No page metadata means social shares of a deep-linked programme render the generic "fund24 – Fördermittel einfach finden" OG title, not the actual programme. Once the 404 is fixed, add `generateMetadata` for SEO.
- Currency formatter: `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })`.
- No ISR/revalidate directive on this page — will attempt dynamic fetch on every request (amplifies the 404 regression with no caching).
