# Route: /passwort-vergessen

**Source:** `app/(auth)/passwort-vergessen/page.tsx` (+ `app/(auth)/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
- Passwort vergessen (initial)
- Link gesendet (success state)

## H2
- —

## H3
- —

## Buttons
- Link senden / Wird gesendet...

## Links
- `/` — fund24 (auth layout wordmark)
- `/login` — Zurück zum Login (bottom of form)
- `/login` — Zurück zum Login (success state)

## Form Fields
- **E-Mail** (type=email, placeholder="") — email

## Messages / Toasts
- "Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen." (subtitle)
- "Falls eine E-Mail mit dieser Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet. Bitte prüfen Sie auch Ihren Spam-Ordner." (success copy)
- Validation: "Bitte eine gültige E-Mail eingeben"

## Notes
- Security-by-design: catches error silently and always shows the same "Link gesendet" success (no account enumeration).
- No `Suspense` needed (no useSearchParams).
