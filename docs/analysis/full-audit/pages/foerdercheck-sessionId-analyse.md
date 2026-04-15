# Route: /foerdercheck/[sessionId]/analyse

**Source:** `app/foerdercheck/[sessionId]/analyse/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Analyse läuft

## H2
—

## H3
—

## Buttons
- Zum Dashboard (only on timeout → routes to /dashboard/unternehmen)

## Links
—

## Form Fields
—

## Messages / Toasts
- "Unser Swarm-AI-System analysiert die Daten mit 6 spezialisierten Agenten" (subtitle)
- Phase labels (timed progression):
  - "Bedarfs-Analyst läuft..."
  - "Programm-Scanner prüft 2.500+ Programme..."
  - "Regional-Experte prüft Bundesland-Programme..."
  - "Kumulierungs-Jurist prüft Kombinationen..."
  - "Kombinations-Optimierer kalkuliert..."
  - "Finanzierungsarchitekt erstellt Plan..."
- "Analyse dauert länger als erwartet" (timeout banner title)
- "Die Analyse wird im Hintergrund fortgesetzt. Sie können zur Übersicht zurückkehren und später auf die Ergebnisse prüfen." (timeout body — grammar: "auf die Ergebnisse prüfen" is unidiomatic; likely meant "nach den Ergebnissen sehen")
- "Authentifizierung läuft..." (loader)
- "Fehler beim Abrufen des Status"
- SchrittAnzeige steps: Angaben, Chat, Dokumente, Analyse, Ergebnisse (current = 3)

## Notes
- Legacy light-theme Card styling (inconsistent with dark app shell).
- Polls `getCheck` every 3s up to 40 times (~120s) → timeout UX.
- Uses `timeout` as both a state variable name and shadows `setTimeout`/JS timeout semantics — confusing but functional.
