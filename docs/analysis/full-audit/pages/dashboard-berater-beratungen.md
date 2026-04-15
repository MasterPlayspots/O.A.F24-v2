# Route: /dashboard/berater/beratungen

**Source:** `app/dashboard/berater/beratungen/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Meine Beratungen

## H2
- Noch keine Beratungen (empty-state heading)

## H3
- {unternehmen_name or "Unbenanntes Unternehmen"} (per-card)

## Buttons
- Neue Anfragen (Link → /dashboard/berater/anfragen)
- Zu den Anfragen (empty-state Link → /dashboard/berater/anfragen)

## Links
- `/dashboard/berater/anfragen` — Neue Anfragen / Zu den Anfragen
- `/dashboard/berater/beratungen/[id]` — per-card (Beratung detail)

## Form Fields
—

## Messages / Toasts
- "BAFA · Berater" (eyebrow)
- "Übersicht aller Beratungs-Vorgänge die du betreust." (subtitle)
- "Sobald du eine Anfrage annimmst, wird hier eine Beratung angelegt." (empty state body)
- "Beratungen konnten nicht geladen werden."
- Phase labels: Anlauf, Datenerhebung, Durchführung, Bericht, Eingereicht, Bewilligt, Abgeschlossen, Abgelehnt
- "BAFA-Nr: {nr}" (per-card meta)
- "Förderhöhe" (label)

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Missing relative comma: "aller Beratungs-Vorgänge die du betreust" → should be "…Vorgänge, die du betreust".
