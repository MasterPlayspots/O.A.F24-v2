# Route: /login

**Source:** `app/(auth)/login/page.tsx` (+ `app/(auth)/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Anmelden

## H2
- —

## H3
- —

## Buttons
- Anmelden / Wird angemeldet...

## Links
- `/` — fund24 (auth layout wordmark)
- `/passwort-vergessen` — Passwort vergessen?
- `/registrieren` — Registrieren

## Form Fields
- **E-Mail** (type=email, placeholder="") — email
- **Passwort** (type=password, placeholder="") — password

## Messages / Toasts
- "E-Mail oder Passwort falsch." (inline + toast.error)
- "Willkommen zurück, {firstName ?? 'du'}." (toast.success)
- Validation: "Bitte eine gültige E-Mail eingeben", "Passwort eingeben"

## Notes
- Client-side redirect logic: admin → /admin, berater → /dashboard/berater, unternehmen → /dashboard/unternehmen; honors `?redirect=` search param.
- Uses `<Suspense>` wrapper (required because of `useSearchParams`).
- No metadata export — inherits root layout title/description.
- Auth layout wraps page with fund24 wordmark header link to `/`.
