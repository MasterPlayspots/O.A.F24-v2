# Route: /dashboard/unternehmen

**Source:** `app/dashboard/unternehmen/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Dashboard

## H2
- Letzte Checks

## H3
- Förderbereich (table column)
- Status (table column)
- Datum (table column)
- Letzte Checks (KPI card)
- Offene Anfragen (KPI card)
- Favoriten (KPI card)
- Aktive Tracks (KPI card)
- BAFA-Anträge (KPI card)
- BAFA-Berichte (KPI card)
- Dokumente (KPI card)

## Buttons
- + Neuen Fördercheck starten (Link → /foerder-schnellcheck)
- Starten Sie Ihren ersten Fördercheck (empty-state CTA → /foerder-schnellcheck)
- Meine Anträge (Link → /dashboard/unternehmen/antraege)
- Meine Anfragen (Link → /dashboard/unternehmen/anfragen)
- Meine Favoriten (Link → /dashboard/unternehmen/favoriten)

## Links
- `/foerder-schnellcheck` — + Neuen Fördercheck starten / Starten Sie Ihren ersten Fördercheck
- `/dashboard/checks/[id]` — Ansehen
- `/dashboard/unternehmen/antraege` — Meine Anträge
- `/dashboard/unternehmen/anfragen` — Meine Anfragen
- `/dashboard/unternehmen/favoriten` — Meine Favoriten

## Form Fields
—

## Messages / Toasts
- "Übersicht Ihrer Fördercheck-Aktivitäten" (subtitle)
- "Noch keine Checks durchgeführt" (empty state)
- "Fehler beim Laden der Daten" (error fallback)
- Status labels: "Abgeschlossen", "In Bearbeitung", "Entwurf"
- Badge sub-text: "{n} Entwurf · {n} eingereicht · {n} bewilligt"

## Notes
- Client-side auth guard via `useVerifiedGuard()` + `istUnternehmen()`; real enforcement is middleware JWT check on `/dashboard` prefix.
- The "Ansehen" link points at `/dashboard/checks/[id]` — no such route in app/ — potential dead link.
- Fund24 KPI panel (BAFA) is soft-failing (try/catch with empty catch) — silently hidden if API unreachable.
