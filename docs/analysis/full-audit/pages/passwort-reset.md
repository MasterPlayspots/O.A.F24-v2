# Route: /passwort-reset

**Source:** `app/(public)/passwort-reset/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
- Passwort zurücksetzen (main state)
- Ungültiger Link (no/invalid token state)
- Passwort erfolgreich geändert! (success state — uses successMessage value)

## H2
- —

## H3
- —

## Buttons
- Passwort aktualisieren / Wird verarbeitet...

## Links
- `/passwort-vergessen` — Neuen Link anfordern (invalid-token state)
- `/login` — Zurück zur Anmeldung (invalid-token state)
- `/login` — Zur Anmeldung (success state)
- `/passwort-vergessen` — Passwort erneut anfordern (main form bottom)
- `/login` — Zurück zur Anmeldung (main form bottom)

## Form Fields
- **Neues Passwort** (type=password, placeholder="Mindestens 8 Zeichen mit Sonderzeichen") — password
- **Passwort bestätigen** (type=password, placeholder="Passwort wiederholen") — confirmPassword

## Messages / Toasts
- "Geben Sie Ihr neues Passwort ein" (subtitle)
- "Mindestens 8 Zeichen und ein Sonderzeichen erforderlich (!@#$%^&* etc.)" (hint)
- "Der Passwort-Reset-Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an." (invalid token copy)
- "Sie können sich jetzt mit Ihrem neuen Passwort anmelden." (success copy)
- "Passwort-Link nicht erhalten?" (bottom-of-form prompt)
- "Fehler" / errorMessage (error box)
- "Link abgelaufen oder bereits verwendet. Bitte fordern Sie einen neuen Link an." (error on expired)
- "Fehler beim Zurücksetzen des Passworts" (generic error)
- Validation: "Passwort muss mindestens 8 Zeichen lang sein", "Passwort muss mindestens ein Sonderzeichen enthalten", "Passwörter stimmen nicht überein"
- Suspense fallback: "Laden..."

## Notes
- This route lives in `(public)` route group — does NOT use the `(auth)` layout (no fund24 wordmark header). It styles its own full-screen container.
- Sentry exception capture on reset failure.
- Uses `<Suspense>` with explicit fallback (useSearchParams for token).
- Inconsistent with other auth pages — re-implements its own full-page chrome (h-screen + min-h-screen) instead of composing the auth layout.
