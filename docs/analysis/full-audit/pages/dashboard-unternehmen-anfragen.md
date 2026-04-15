# Route: /dashboard/unternehmen/anfragen

**Source:** `app/dashboard/unternehmen/anfragen/page.tsx` + `anfragen/layout.tsx`
**Persona:** unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Anfragen

## H2
—

## H3
- Berater (table column)
- Dienstleistung (table column)
- Status (table column)
- Datum (table column)

## Buttons
- Nachricht (per-row, only if status === "angenommen")

## Links
- `/berater` — Berater entdecken (empty-state CTA via LeererZustand)

## Form Fields
—

## Messages / Toasts
- "Übersicht aller Ihre Anfragen an Berater" (subtitle — grammar issue: "aller Ihre")
- "Noch keine Anfragen" (empty state)
- "Finde einen passenden Berater und schick eine erste Anfrage." (empty state body)
- Status labels: "Offen", "Angenommen", "Abgelehnt"
- "Fehler beim Laden der Anfragen"

## Notes
- `layout.tsx` wraps the page with `<ComingSoonBanner feature="Anfragen-Verwaltung" eta="Q2 2026" />` → WIP banner shown to users.
- Grammar: "Übersicht aller Ihre Anfragen" should be "Übersicht aller Ihrer Anfragen".
- "Nachricht" button has no onClick handler — dead action.
