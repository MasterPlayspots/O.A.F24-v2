# Route: /dashboard/unternehmen/antraege

**Source:** `app/dashboard/unternehmen/antraege/page.tsx`
**Persona:** unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Meine Anträge

## H2
- Noch keine Anträge (empty-state heading — rendered as h2)

## H3
- {programm_name or "Unbenannter Antrag"} (per-row card title)

## Buttons
- + Neuen Antrag stellen (opens NeuerAntragModal)
- Antrag stellen (empty-state CTA, opens NeuerAntragModal)

## Links
- `/antraege/[id]` — per-row card wrapper link (opens Antrag-Detail)

## Form Fields
(in NeuerAntragModal — not inlined on this page)

## Messages / Toasts
- "Übersicht deiner Förder-Anträge" (subtitle)
- "Stelle deinen ersten Förder-Antrag." (empty state body)
- "Anträge konnten nicht geladen werden."
- "{vollstaendigkeit}% vollständig" (per-row meta)
- "Beantragt" (per-row label)

## Notes
- Client-side redirects to `/login` if no token and to `/dashboard/berater` if not unternehmen — redundant with middleware, but harmless.
- Inline navigation: after `createAntrag`, routes to `/antraege/[new-id]` — that route has an auth gap (see notes on /antraege/[id]).
