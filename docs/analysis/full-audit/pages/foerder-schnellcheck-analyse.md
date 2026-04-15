# Route: /foerder-schnellcheck/analyse

**Source:** `app/(public)/foerder-schnellcheck/analyse/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no (polling page; redirects to `/foerder-schnellcheck` if phase is `url_eingabe` or `fehler`; redirects to `/profil` when phase becomes `profil_ready`)

## Metadata
- **Title:** Fördercheck | fund24 (inherits flow layout)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach. (inherits flow layout)
- **OpenGraph:** — (inherits root)

## H1
Analysiere Ihr Unternehmen

## H2
—

## H3
—

## Buttons
- Zurück (layout header)

## Links
- `/` — "Zurück" (layout header)

## Form Fields
—

## Messages / Toasts
- "Dies dauert etwa 30-60 Sekunden..." (subtitle)
- "Analyse konnte nicht abgeschlossen werden. Bitte versuchen Sie es später erneut." (error set when backend returns status=fehler)
- "Bitte schließen Sie diese Seite nicht. Ihre Sitzung wird automatisch fortgesetzt." (footer hint)
- Phase labels (rendered as list):
  - "Website analysieren"
  - "Profil erstellen"
  - "Fragen vorbereiten"
  - "Fertig!"

## Notes
- Step 2a of 6 — transient polling page between URL entry and profile reveal.
- Polls `ladeStatus(sessionId)` every 2000 ms; updates `currentPhaseIndex` based on backend status string. On `profil_ready` redirects to `/foerder-schnellcheck/profil`.
- Static content only (four phase labels + header/hint). No store data rendered beyond the computed phase index.
- Errors during polling are captured to Sentry (`area: foerdercheck, op: polling`) but silently swallowed — polling continues. User-facing error only shown when backend explicitly returns `status === 'fehler'`.
- Spinner is a rotating border div (CSS), not the `LadeSpinner` component used elsewhere in the flow — minor visual inconsistency.
