# Route: /verifizieren

**Source:** `app/(auth)/verifizieren/page.tsx` (+ `app/(auth)/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
E-Mail verifizieren

## H2
- —

## H3
- —

## Buttons
- Verifizieren / Wird überprüft... (submit, disabled until 6 digits)
- Code erneut senden / Code erneut senden ({cooldown}s) (disabled while cooldown > 0)

## Links
- `/` — fund24 (auth layout wordmark)

## Form Fields
- **6-stelliger Code** (type=text, inputMode=numeric, maxLength=6, pattern=[0-9]*, placeholder="000000") — code

## Messages / Toasts
- "Code wurde an <email> gesendet" (subtitle)
- "Ungültiger Code. Bitte erneut versuchen." (inline error)
- "Code wurde erneut gesendet." (inline info)
- "Fehler beim erneuten Senden." (inline info)
- "Bitte prüfen Sie auch Ihren Spam-Ordner." (helper hint)

## Notes
- Email sourced from `?email=` query param first, falls back to auth store.
- If no email found, redirects to /login.
- Post-verify routing: honors `?next=` param, else role-based redirect: berater → `/onboarding/profil`, admin → `/admin`, else → `/onboarding/unternehmen`.
- Cooldown timer: 60 seconds after resend request.
- Uses `<Suspense>` (useSearchParams).
- Hardcoded tight tracking `text-2xl tracking-[0.5em]` on code input (visual 6-digit style).
