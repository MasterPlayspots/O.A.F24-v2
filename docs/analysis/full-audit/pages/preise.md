# Route: /preise

**Source:** `app/(public)/preise/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Preise | fund24
- **Description:** Transparent und fair: fund24 ist kostenlos für Unternehmen. Berater zahlen 9,99 % Provision — nur bei bewilligtem Antrag.
- **OpenGraph:** — (inherits root)

## H1
Transparent. Fair. Kostenlos für Unternehmen.

## H2
- Unternehmen
- Berater
- Berechnungsbeispiel
- Häufige Fragen

## H3
- Keine Kosten bei Ablehnung
- Gibt es versteckte Kosten?
- Was passiert bei Antragsablehnung?
- Wann wird die Provision fällig?
- Sind die Preise brutto oder netto?

## Buttons
- Kostenlos starten
- Als Berater registrieren

## Links
- `/registrieren?rolle=unternehmen` — Kostenlos starten
- `/registrieren?rolle=berater` — Als Berater registrieren

## Form Fields
—

## Messages / Toasts
—

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav: Programme, Berater, Preise, Aktuelles; auth: Anmelden / Registrieren.
- Footer columns: Plattform / Beratung / Support / Legal; copy: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget: "Hilfe & Kontakt", +49 1512 9617192, support@fund24.io, "Mo–Fr 9–17 Uhr".
- Root layout mounts CookieBanner ("Datenschutz auf fund24" / "Alle akzeptieren" / "Nur notwendige").

## Notes
- Eyebrow text over the H1 is "Preise" (rendered as a `<p>` — not an extra H1).
- Feature badge "Empfohlen für Berater" appears as a decorative div on the Berater tier.
- Supporting copy includes commitment lines: "Kein Abo, kein Lock-in, keine versteckten Gebühren."; "Die Provision wird ausschließlich nach Eingang des schriftlichen Bewilligungsbescheids fällig. Bei Ablehnung fallen keine Kosten an."
- Price computation shown as inline pseudo-code: "50.000 € × 9,99 % = 4.995 €".
