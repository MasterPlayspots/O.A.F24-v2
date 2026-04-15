# Route: /berater

**Source:** `app/(public)/berater/page.tsx` (+ `app/(public)/berater/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root: default "fund24 – Fördermittel einfach finden"; no page-level metadata export because file is `'use client'`)
- **Description:** — (inherits root)
- **OpenGraph:** — (inherits root)

## H1
Fachberatungen

## H2
- Filter
- Keine Beratungen gefunden

## H3
—

## Buttons
- Bundesland wählen (Select trigger placeholder)
- Spezialisierung wählen (Select trigger placeholder)

## Links
—

## Form Fields
- **Bundesland** (type=select, placeholder="Bundesland wählen") — options: Alle Bundesländer, Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen
- **Spezialisierung** (type=select, placeholder="Spezialisierung wählen") — options: Alle Spezialisierungen, Digitalisierung, Innovation, Nachhaltigkeit, Export, Mittelstand, Handwerk

## Messages / Toasts
- "Entschuldigung, wir konnten die Beraterliste nicht laden. Bitte versuchen Sie es später erneut." (error state)
- "Versuchen Sie, die Filter anzupassen und erneut zu suchen." (empty state)
- "{n} Beratung gefunden" / "{n} Beratungen gefunden" (result count)

## Notes
- Subtitle (not a heading): "Finden Sie die richtige Beratung für Ihr Unternehmen"
- Layout injects `<ComingSoonBanner feature="Berater-Verzeichnis" eta="Q2 2026" />` above the page content — signals this is a pre-release feature.
- No page-level `export const metadata` because the page is a client component (`'use client'`); relies entirely on root metadata. Recommend moving metadata to the sibling `layout.tsx` (currently only imports ComingSoonBanner with no metadata export).
- Berater list rendered via `<BeraterKarte>` component per item — card text not extracted here.
- No `<button>` outside of Select triggers; filter interactions are controlled selects.
