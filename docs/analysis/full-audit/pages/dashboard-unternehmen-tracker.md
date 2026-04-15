# Route: /dashboard/unternehmen/tracker

**Source:** `app/dashboard/unternehmen/tracker/page.tsx` + `tracker/layout.tsx`
**Persona:** unternehmen
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
- `layout.tsx` wraps page with `<ComingSoonBanner feature="Antrags-Tracker" eta="Q2 2026" />` → WIP banner.
- Kanban-style drag-drop board using `@hello-pangea/dnd`; optimistic updates roll back on error.
- Logic is effectively identical to the berater-variant tracker (code duplication).
