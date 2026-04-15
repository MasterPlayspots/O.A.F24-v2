# Route: /dashboard/berater/anfragen

**Source:** `app/dashboard/berater/anfragen/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Anfragen

## H2
- Offene Anfragen ({n})
- Bearbeitete Anfragen

## H3
- Unternehmen (table column)
- Dienstleistung (table column)
- Status (table column)
- Datum (table column)
- Aktion (table column)

## Buttons
- Annehmen (per-row, open requests)
- Ablehnen (per-row, open requests)

## Links
—

## Form Fields
—

## Messages / Toasts
- "Übersicht aller Anfragen von Unternehmen" (subtitle)
- "Keine Anfragen" (empty state)
- "Sie haben noch keine Anfragen von Unternehmen erhalten" (empty state body)
- Status labels: "Offen", "Angenommen", "Abgelehnt"
- "Fehler beim Laden der Anfragen"
- "Fehler beim Akzeptieren"
- "Fehler beim Ablehnen"

## Notes
- Inherits `<ComingSoonBanner feature="Berater-Dashboard" ...>` from parent `app/dashboard/berater/layout.tsx`.
- Splits the list into an accented "Offene" section and a plain "Bearbeitete" table.
