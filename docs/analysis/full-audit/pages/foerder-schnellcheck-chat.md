# Route: /foerder-schnellcheck/chat

**Source:** `app/(public)/foerder-schnellcheck/chat/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no (redirect guard: `/foerder-schnellcheck` if no sessionId / phase !== 'chat' / no aktiveFrage)

## Metadata
- **Title:** Fördercheck | fund24 (inherits flow layout)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach. (inherits flow layout)
- **OpenGraph:** — (inherits root)

## H1
— (no h1 on this page — **missing H1 / accessibility red flag**)

## H2
- {store.aktiveFrage.frage} (dynamic — the active question)

## H3
—

## Buttons
- Ja (ja_nein type)
- Nein (ja_nein type)
- Weiter (submit, non-final question)
- Analyse abschließen (submit, final question)
- Wird gespeichert... (submit label while isSubmitting)
- Zurück (layout header)

## Links
- `/` — "Zurück" (layout header)

## Form Fields
- **Auswahl (radio group)** (type=radio, placeholder=—) — dynamic options from `store.aktiveFrage.optionen`; shown when `antwortTyp === 'auswahl'`
- **Text Antwort** (type=text, placeholder="Ihre Antwort...") — shown when `antwortTyp === 'text'`; submits on Enter
- **Zahl Antwort** (type=number, placeholder="Zahl eingeben...") — shown when `antwortTyp === 'zahl'`; submits on Enter

## Messages / Toasts
- "Frage {index+1} von {total}" (progress label)
- "{pct}%" (progress percentage)
- "Sitzung ungültig" (guard error)
- "Bitte beantworten Sie die Frage" (validation error)
- "Fehler beim Speichern der Antwort" (submit failure)
- {store.aktiveFrage.kontext} (subtitle under question, if provided)

## Notes
- **No H1 on this screen** — the question is rendered as `<h2>`, breaking the single-h1-per-page convention across the flow. Every other step has an H1; this one hides the page context (users relying on screen readers will hear no page heading).
- Step 3 of 6. Fully store-driven — the question/options/type all come from `store.aktiveFrage` (`usePreCheck`). No static content-bearing text about programmes.
- Last question triggers `fuehreScoring(sessionId)` and navigates to `/ergebnis`; earlier questions just advance the store index.
- **Broken redirect guard pattern:** uses `if (...) { router.push(...); return null }` during render instead of `useEffect` — this will call `router.push` synchronously during render and throw a React warning/error if the user transiently lacks the store state (e.g., during hot-reload). `/profil/page.tsx` uses the `useEffect` variant; this page diverges.
- Button label "Wird gespeichert..." shown inline without a spinner icon — inconsistent with Dialog submit elsewhere (which uses `Loader2`).
