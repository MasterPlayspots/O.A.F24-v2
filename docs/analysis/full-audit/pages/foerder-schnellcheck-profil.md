# Route: /foerder-schnellcheck/profil

**Source:** `app/(public)/foerder-schnellcheck/profil/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no (but redirects to `/foerder-schnellcheck` if `sessionId`/`phase !== 'profil_ready'`)

## Metadata
- **Title:** Fördercheck | fund24 (inherits from flow layout)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach. (inherits flow layout)
- **OpenGraph:** — (inherits root)

## H1
Ihr Unternehmensprofil

## H2
- {store.profil.firmenname} (dynamic, from preCheck store)

## H3
—

## Buttons
- Umfrage starten (primary; revealed after 1s delay via setTimeout)

## Links
- `/` — "Zurück" (layout header back link, inherited from layout)

## Form Fields
—

## Messages / Toasts
- "Das haben wir über Ihr Unternehmen gelernt" (subtitle)
- "Profil wird geladen..." (LadeSpinner when profil is null)
- "Fragen werden vorbereitet..." (LadeSpinner after clicking weiter)
- "Fehler beim Laden der Fragen" (fallback error on ladeFragen failure)
- "Tech-innovativ erkannt" (conditional badge when technologieindikator=true)
- "Datenqualität" (label) / "{datenqualitaet}/10" (value)
- "Branche" / "Bundesland" (field labels)
- "5-7 kurze Fragen • Ca. 3 Minuten" (footer hint)

## Notes
- Step 2 of 6 in the PreCheck flow. Reads ENTIRELY from `usePreCheck` store (`store.profil.firmenname`, `kurzprofil`, `branche`, `bundesland`, `technologieindikator`, `datenqualitaet`). No static content-bearing text about a specific programme — fully store-driven.
- Guard redirects to `/foerder-schnellcheck` if store is empty — if user deep-links here they lose context silently (no toast).
- Data-quality bar computed as `datenqualitaet * 10` % — assumes value is on 0-10 scale.
- 1s setTimeout before revealing CTA (`showButton` state) — deliberate "reveal" pacing, not a bug.
