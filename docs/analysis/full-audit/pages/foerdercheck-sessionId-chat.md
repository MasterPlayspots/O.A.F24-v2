# Route: /foerdercheck/[sessionId]/chat

**Source:** `app/foerdercheck/[sessionId]/chat/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Chat mit dem Fördercheck-Assistenten

## H2
—

## H3
—

## Buttons
- ArrowRight icon (submit message)
- Chat überspringen → (skip to /foerdercheck/[sessionId]/dokumente)

## Links
—

## Form Fields
- **(message input)** (type=textarea, placeholder="Schreiben Sie Ihre Antwort... (Enter zum Senden, Shift+Enter für Zeilenumbruch)") — inputValue

## Messages / Toasts
- "Beantworten Sie ein paar Fragen, um die passenden Programme zu finden" (subtitle)
- "Keine Nachrichten. Starten Sie ein Gespräch!" (empty)
- "Chat wird geladen..." (loader)
- "Check-Session konnte nicht geladen werden"
- "Fehler beim Laden"
- "Fehler beim Senden"
- SchrittAnzeige steps: Angaben, Chat, Dokumente, Analyse, Ergebnisse (current = 1)

## Notes
- Legacy light-theme Card styling (inconsistent with dark app shell).
- Redirects to `/foerdercheck/[id]/dokumente` when `status === 'dokumente'` (either on load or after a chat turn).
