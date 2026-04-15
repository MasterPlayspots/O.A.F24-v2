# Route: app/error.tsx

**Source:** `app/error.tsx`
**Persona:** all
**Live Status:** N/A (shown on runtime error)
**Protected:** no (boundary, not a route)

## Metadata
- **Title:** — (n/a, error boundary)
- **Description:** —
- **OpenGraph:** —

## H1
Etwas ist schiefgelaufen

## H2
- —

## H3
- —

## Buttons
- Erneut versuchen (calls `reset()`)

## Links
- `/` — Zur Startseite

## Form Fields
- —

## Messages / Toasts
- "fund24" (eyebrow label)
- "Wir konnten diese Seite gerade nicht laden. Versuch es in einem Moment noch einmal — oder melde dich beim Support, falls der Fehler bleibt."
- "Fehler-ID: {error.digest}" (shown only when digest available, monospace)

## Notes
- `'use client'` boundary per App Router convention.
- Sentry captures the caught exception in `useEffect` with `tags: { boundary: 'app' }` and `contexts: { digest: { value: error.digest } }`.
- Friendly copy, no stack trace shown to user.
