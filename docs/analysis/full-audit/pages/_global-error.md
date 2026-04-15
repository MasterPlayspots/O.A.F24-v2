# Route: app/global-error.tsx

**Source:** `app/global-error.tsx`
**Persona:** all
**Live Status:** N/A
**Protected:** no (boundary, not a route)

## Metadata
- **Title:** — (n/a, global error boundary; renders its own `<html>`)
- **Description:** —
- **OpenGraph:** —

## H1
Ein unerwarteter Fehler

## H2
- —

## H3
- —

## Buttons
- —

## Links
- `/` — Neu laden (renders as anchor tag with inline styles; ESLint disabled for no-html-link-for-pages)

## Form Fields
- —

## Messages / Toasts
- "fund24" (eyebrow label)
- "Die Anwendung konnte nicht geladen werden. Bitte lade die Seite neu."
- "Fehler-ID: {error.digest}" (shown only when digest available)

## Notes
- `'use client'` boundary; renders its own `<html>` and `<body>` (required for global-error per App Router convention — catches errors that escape the root layout).
- Uses inline styles (cannot rely on Tailwind CSS classes here since layout may have failed).
- Sentry captures the exception (plain `Sentry.captureException(error)` — no tags/contexts, unlike app/error.tsx).
- `lang="de"` hardcoded.
- No `reset()` function wired up — user must reload manually via the `Neu laden` link.
