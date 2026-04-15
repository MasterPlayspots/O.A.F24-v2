# Route: /programme

**Source:** `app/(public)/programme/page.tsx` (server component; list rendered by `components/foerdercheck/ProgrammListe.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Förderprogramme | fund24
- **Description:** Durchsuchen Sie 2.500+ Förderprogramme für Ihr Unternehmen — nach Bundesland, Förderart und Bereich.
- **OpenGraph:** — (inherits root; no page-level OG overrides)

## H1
Förderprogramme durchsuchen

## H2
—

## H3
—

## Buttons
- Filter zurücksetzen (only visible when any filter is set)
- Mehr laden (pagination — shows "Lädt…" with spinner while fetching)

## Links
—
(each result is a `<ProgrammKarte>` which links to `/programme/[id]` — the href is built inside the card component and not visible in this file)

## Form Fields
- **Bundesland** (type=select, placeholder=—) — `bundesland` — options: Alle Bundesländer, Baden-Württemberg, Bayern, Berlin, Brandenburg, Bremen, Hamburg, Hessen, Mecklenburg-Vorpommern, Niedersachsen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland, Sachsen, Sachsen-Anhalt, Schleswig-Holstein, Thüringen
- **Förderart** (type=select, placeholder=—) — `foerderart` — populated from `filterOptions.foerderarten` (server-side)
- **Förderbereich** (type=select, placeholder=—) — `foerderbereich` — populated from `filterOptions.foerderbereiche` (server-side)
- **Suche** (type=text, placeholder="Programmname…") — `search`

## Messages / Toasts
- "Lädt Programme…" (initial loading)
- "Keine Filter angewendet" (when total === 0 on initial load)
- "{offset}–{offset+limit} von {total} Programmen" (results summary)
- "Fehler beim Laden der Programme. Bitte versuchen Sie es später erneut." (error state)
- "Keine Programme gefunden." (empty results)
- "Versuchen Sie, Ihre Suchkriterien zu ändern." (empty state subtitle)

## Notes
- Subtitle under H1 (paragraph, not a heading): "Finden Sie die passenden Förderprogramme für Ihr Unternehmen. Nutzen Sie die Filter zur gezielten Suche."
- Description says "2.500+ Förderprogramme" but root metadata/JSON-LD and index page headline say "3.400+ aktive Förderprogramme" — **inconsistency in program count across surfaces**.
- Page is ISR (`export const revalidate = 3600`). Filter options are fetched server-side; result list fetched client-side via React Query.
- ProgrammListe uses native HTML `<select>` elements (grey/white Tailwind palette) — visually inconsistent with `/berater` which uses the `components/ui/select` primitive (dark architect palette). Design-system drift.
- initialFilter prop is accepted but unused (`_initialFilter`) — dead parameter.
