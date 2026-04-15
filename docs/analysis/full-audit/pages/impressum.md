# Route: /impressum

**Source:** `app/(public)/impressum/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Impressum | fund24
- **Description:** Impressum und rechtliche Informationen von fund24.
- **OpenGraph:** — (inherits root)

## H1
Impressum

## H2
- Angaben gemäß § 5 Telemediengesetz (TMG)
- Haftungsausschluss
- Datenschutz
- Streitbeilegung
- Haftungsbeschränkung für Schäden

## H3
- Verantwortlicher im Sinne des TMG und MDStV
- Kontaktdaten
- Registereintrag
- Umsatzsteuer-Identifikationsnummer
- Berufsbezeichnung und zuständige Berufsaufsichtsbehörde
- Haftung für Inhalte
- Haftung für Links
- Urheberrecht
- Alternative Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO
- Verbraucherstreitbeilegung / Universalschlichter

## Buttons
—

## Links
- `/datenschutz` — Datenschutzerklärung

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
- H2 reads "§ 5 Telemediengesetz (TMG)" but TMG has been replaced by the DDG (Digitale-Dienste-Gesetz) effective 14 May 2024 — legally outdated wording. Also commented `{/* Angaben gemäß § 5 DDG */}` in source hints the update is still pending.
- Handelsregister entry is a placeholder: "HRB-Nr. wird nachgereicht" — must be filled before launch.
- ODR plattform URL `https://ec.europa.eu/consumers/odr` is only rendered as plain text (no anchor).
- Last-updated block is computed via `new Date().toLocaleDateString(...)` — always shows the current day.
