# Route: /dashboard/berater/nachrichten

**Source:** `app/dashboard/berater/nachrichten/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Nachrichten

## H2
- Anfragen (sidebar heading)
- {partner firmenname} or "Gesprächspartner" (conversation header)

## H3
—

## Buttons
- Send (icon button, form submit)
- per-anfrage sidebar button (select conversation, label = unternehmen_name)

## Links
—

## Form Fields
- **Nachricht eingeben** (type=text via Input, placeholder="Nachricht eingeben...") — nachrichtText

## Messages / Toasts
- "Kommunikation mit Ihren Projektpartnern" (subtitle)
- "Keine Gespräche" (empty state)
- "Sie haben noch keine angenommenen Anfragen" (empty state body)
- "Keine Nachrichten. Starten Sie ein Gespräch!"
- "Wählen Sie eine Anfrage" (no selection)
- "Aktiv" (badge)
- "Fehler beim Laden der Anfragen"
- "Fehler beim Laden der Nachrichten"
- "Fehler beim Senden"

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Polls `getNachrichten` every 10s — no websocket; acceptable but high chat latency.
- Empty state only checks "angenommen" anfragen — user sees nothing if requests are all "offen".
