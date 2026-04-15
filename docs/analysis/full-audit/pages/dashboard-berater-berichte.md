# Route: /dashboard/berater/berichte

**Source:** `app/dashboard/berater/berichte/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Meine Berichte

## H2
—

## H3
—

## Buttons
- Neuer Bericht (Link → /dashboard/berater/berichte/new)
- Bericht erstellen (empty-state Link → /dashboard/berater/berichte/new)

## Links
- `/dashboard/berater/berichte/new` — Neuer Bericht / Bericht erstellen
- `/dashboard/berater/berichte/[id]` — per-row card

## Form Fields
—

## Messages / Toasts
- "γ-Hybrid · Übersicht" (eyebrow)
- "Noch keine Berichte" (empty state)
- "Lege deinen ersten γ-Hybrid Bericht an." (empty state body)
- "Berichte konnten nicht geladen werden."
- "Quality: {score}" (per-row meta)
- "Aktualisiert" (per-row meta)

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- "new" is handled inside the `[id]` route (see `dashboard-berater-berichte-id.md`).
- Only the bericht-ID is surfaced — no human-readable title field on the row; UX risk.
