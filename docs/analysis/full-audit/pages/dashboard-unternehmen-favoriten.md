# Route: /dashboard/unternehmen/favoriten

**Source:** `app/dashboard/unternehmen/favoriten/page.tsx` + `favoriten/layout.tsx`
**Persona:** unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Favoriten

## H2
—

## H3
- Programm {programm_id} (per-card title)

## Buttons
- Trash2 icon button (delete favorite, no text label)

## Links
- `/programme` — Programme entdecken (empty-state CTA via LeererZustand)

## Form Fields
—

## Messages / Toasts
- "Ihre gespeicherten Förderprogramme" (subtitle)
- "Noch keine Favoriten" (empty state)
- "Entdecke passende Förderprogramme und speichere sie hier für später." (empty state body)
- "Gespeichert am {date}" (per-card meta)
- "Fehler beim Laden der Favoriten"
- "Fehler beim Löschen"

## Notes
- `layout.tsx` wraps page with `<ComingSoonBanner feature="Favoriten" eta="Q2 2026" />` → WIP banner.
- Favoriten cards display only "Programm {id}" — no name resolution; programm_id is surfaced directly to the user.
- Delete button has no text label, only icon — a11y concern.
