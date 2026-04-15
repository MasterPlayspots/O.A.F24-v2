# Route: /dashboard/berater/tracker

**Source:** `app/dashboard/berater/tracker/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Projekttracker

## H2
- Vorbereitung (column header)
- Antrag (column header)
- Prüfung (column header)
- Bewilligt (column header)
- Fertig (column header)

## H3
—

## Buttons
—

## Links
—

## Form Fields
—

## Messages / Toasts
- "Verwalten Sie den Status Ihrer aktiven Projekte" (subtitle)
- "Keine Projekte" (empty state)
- "Sie haben noch keine aktiven Projekte" (empty state body)
- "Keine Einträge" (per-column empty)
- "Fehler beim Laden des Trackers"
- "Fehler beim Aktualisieren"
- "Kein Token"

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Drag-drop Kanban identical to unternehmen-tracker (code duplicated; should be a shared component).
