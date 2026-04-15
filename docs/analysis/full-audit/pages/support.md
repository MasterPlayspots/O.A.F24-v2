# Route: /support

**Source:** `app/(public)/support/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Support | fund24
- **Description:** Kontaktieren Sie uns für Fragen zur Abwicklung, technischen Support oder telefonische Beratung.
- **OpenGraph:** — (inherits root)

## H1
Support

## H2
- Öffnungszeiten
- Häufig gestellte Fragen
- Sie konnten Ihre Antwort nicht finden?

## H3
- Abwicklung & Prozesse
- Technischer Support
- Telefonischer Support
- Allgemeine Servicezeiten
- Notfall-Support
- 1. Wie lange dauert es, bis mein Support-Anliegen bearbeitet wird?
- 2. Kann ich fund24 auch per Telefon erreichen?
- 3. Meine Website oder App funktioniert nicht. Wer ist der richtige Kontakt?
- 4. Was ist der Unterschied zwischen den Support-Adressen?
- 5. Gibt es einen Ticketing-System für meine Support-Anfragen?

## Buttons
- E-Mail schreiben

## Links
- `mailto:info@fund24.io` — info@fund24.io (x3 — Abwicklung, Technischer Support, Notfall-Support card)
- `tel:+4915129617192` — +49 151 29617192 (Telefonischer Support card)
- `mailto:info@fund24.io` — E-Mail schreiben (bottom CTA)

## Form Fields
—

## Messages / Toasts
—

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav: Programme, Berater, Preise, Aktuelles; auth: Anmelden / Registrieren.
- Footer columns: Plattform / Beratung / Support (Kontakt, FAQ linking to `/support#faq`) / Legal; copy: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget: "Hilfe & Kontakt", +49 1512 9617192, support@fund24.io, "Mo–Fr 9–17 Uhr".
- Root layout mounts CookieBanner ("Datenschutz auf fund24" / "Alle akzeptieren" / "Nur notwendige").

## Notes
- FAQ #4 ("Was ist der Unterschied zwischen den Support-Adressen?") is vestigial — the answer collapses to "Beide Adressen werden vom selben Team betreut" but only one address (info@fund24.io) is used on the page.
- FAQ #5 has a minor grammatical slip ("Gibt es einen Ticketing-System").
- Contact email on this page is `info@fund24.io`, while the floating `SupportWidget` uses `support@fund24.io` — inconsistent support addresses between page and widget.
- The "#faq" section ID is referenced from the footer (`/support#faq`) and present on the H2 — anchor works.
