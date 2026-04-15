# Route: /foerder-schnellcheck/bericht

**Source:** `app/(public)/foerder-schnellcheck/bericht/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no (redirect guard: `/foerder-schnellcheck` if no sessionId / phase !== 'email_formular')

## Metadata
- **Title:** Fördercheck | fund24 (inherits flow layout)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach. (inherits flow layout)
- **OpenGraph:** — (inherits root)

## H1
Erhalten Sie Ihren detaillierten Report

Success variant H1: "Erfolgreich angefordert!"

## H2
—

## H3
—

## Buttons
- Report anfordern (submit; disabled until form is valid)
- Zurück (layout header)

## Links
- `/` — "Zurück" (layout header)
- `/` — programmatic redirect after 3s on success

## Form Fields
- **E-Mail-Adresse** (type=email, placeholder="ihre@email.de") — `email`
- **Ich akzeptiere die Datenschutzerklärung und möchte E-Mails von fund24 erhalten** (type=checkbox) — `dsgvo`

## Messages / Toasts
- "Geben Sie Ihre E-Mail ein, um einen PDF-Report mit allen Details zu erhalten" (subtitle)
- "Bitte geben Sie eine gültige E-Mail ein" (zod email error)
- "Bitte akzeptieren Sie die DSGVO" (zod dsgvo error)
- "Sitzung ungültig" (guard)
- "Fehler beim Senden" (submit fallback)
- "Ihr Report wird vorbereitet..." (LadeSpinner during submit)
- "Ihr detaillierter Fördermittel-Report wird in Kürze an Ihre E-Mail versendet." (success body)
- "Bitte überprüfen Sie Ihren Spam-Ordner, falls die E-Mail nicht ankommt." (success note)
- "Sie werden in Kürze zur Startseite weitergeleitet..." (success countdown)
- Legal note block:
  - "Mit der Anmeldung erklären Sie sich mit unserer Datenschutzerklärung einverstanden. Wir verwenden Ihre Daten nur zur Zusendung des Reports und zum Versand von Newsletters."
  - "Sie können sich jederzeit abmelden."

## Notes
- Step 5 of 6 (6 = success screen). Final data-capture step.
- **DSGVO red flag:** the checkbox label bundles two distinct consents ("Datenschutzerklärung akzeptieren" + "E-Mails erhalten") into a single opt-in — under GDPR these should be separated (soft opt-in for report vs. marketing newsletter). Also: the legal note says the user agrees to the Datenschutzerklärung "Mit der Anmeldung" (by signing up) without **linking** to the /datenschutz page — needs a `<Link href="/datenschutz">` wrapper on the word "Datenschutzerklärung" (twice).
- Typo in legal note: "Newsletters" → should be "Newslettern" (dative plural in German).
- Success auto-redirect uses `setTimeout(..., 3000)` + `router.push('/')` with `store.reset()` — clears the PreCheck session so user cannot navigate back to see their results.
- `react-hook-form` registers the dsgvo checkbox with spread `{...register('dsgvo')}` on a shadcn `<Checkbox>` — this can be unreliable because shadcn Checkbox forwards to Radix, which expects `onCheckedChange` rather than native `onChange`. Worth verifying the consent actually lands in form state on click.
