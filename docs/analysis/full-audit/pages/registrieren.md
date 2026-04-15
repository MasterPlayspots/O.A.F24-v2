# Route: /registrieren

**Source:** `app/(auth)/registrieren/page.tsx` (+ `app/(auth)/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
- Registrieren (role-select screen)
- "Als Berater registrieren" / "Als Unternehmen registrieren" (form screen — depends on selected role or `?rolle=` param)

## H2
- —

## H3
- —

## Buttons
- Als Unternehmen (role selector card — "Fördermittel finden und Berater beauftragen")
- Als Berater (role selector card — "Aufträge erhalten und Unternehmen beraten")
- Rolle ändern (toggle back to role-select)
- Registrieren / Wird registriert...
- Einloggen? (inline after "bereits registriert" error — link styled as button)

## Links
- `/` — fund24 (auth layout wordmark)
- `/login` — Einloggen (two places: role-select bottom, form bottom)
- `/login` — Einloggen? (inline in error when email already registered)
- `/datenschutz` — Datenschutzerklärung (opens in new tab)
- `/agb` — AGB (opens in new tab)

## Form Fields
- **Vorname** (type=text, placeholder="") — firstName
- **Nachname** (type=text, placeholder="") — lastName
- **E-Mail** (type=email, placeholder="") — email
- **Passwort** (type=password, placeholder="") — password
- **Firma (optional)** (type=text, placeholder="") — company [only when rolle=unternehmen]
- **Ich akzeptiere die Datenschutzerklärung und AGB** (type=checkbox) — datenschutz

## Messages / Toasts
- "Bestätigungscode gesendet. Prüfe dein E-Mail-Postfach." (toast.success)
- "Konto erstellt. Willkommen bei fund24." (toast.success)
- "Diese E-Mail ist bereits registriert." (inline + toast.error on 409)
- "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut." (inline + toast.error on other errors)
- Validation: "Bitte eine gültige E-Mail eingeben", "Mindestens 8 Zeichen", "Mindestens ein Sonderzeichen (!@#$%^&*)", "Vorname ist erforderlich", "Nachname ist erforderlich", "Bitte Datenschutzerklärung akzeptieren"

## Notes
- Two-screen flow: role-select screen first, then registration form (state `rolle`).
- Supports `?rolle=berater|unternehmen` and `?berater=<id>` search params for deep-linking (e.g. from a berater profile). After register, redirects to `/berater/{berater}` or `/verifizieren`.
- Uses `<Suspense>` (useSearchParams).
- Explicit `text-center` copy: "Wie möchten Sie fund24 nutzen?" on role-select.
- `rolle` state is typed as `Nutzer['role']` which includes `admin` — admin filtered out of init.
