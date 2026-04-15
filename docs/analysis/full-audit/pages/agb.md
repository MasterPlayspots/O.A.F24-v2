# Route: /agb

**Source:** `app/(public)/agb/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Allgemeine Geschäftsbedingungen (AGB) | fund24
- **Description:** Allgemeine Geschäftsbedingungen für die Nutzung der fund24 Plattform.
- **OpenGraph:** — (inherits root)

## H1
Allgemeine Geschäftsbedingungen (AGB)

## H2
- 1. Geltungsbereich und Vertragsgegenstand
- 2. Leistungsumfang
- 3. Registrierung und Konteniverwaltung
- 4. Gebühren und Preise
- 5. Nutzungsrechte und Eigentum
- 6. Datenschutz und Datensicherheit
- 7. Haftungsbeschränkung
- 8. Verbotene Handlungen
- 9. Kündigung und Beendigung
- 10. Änderungen der AGB
- 11. Salvatorische Klausel
- 12. Anwendbares Recht und Gerichtsstand
- 13. Kontakt und Fragen

## H3
- 2.1 Verfügbare Services
- 2.2 Keine Rechtsberatung
- 2.3 Verfügbarkeit

## Buttons
—

## Links
- `/preise` — Preisseite
- `/datenschutz` — Datenschutzerklärung

## Form Fields
—

## Messages / Toasts
—

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav: Programme, Berater, Preise, Aktuelles; auth: Anmelden / Registrieren.
- Footer columns: Plattform / Beratung / Support / Legal (Datenschutz, Impressum, AGB); copy: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget: "Hilfe & Kontakt", Telefon +49 1512 9617192, support@fund24.io, "Mo–Fr 9–17 Uhr".
- Root layout mounts CookieBanner ("Datenschutz auf fund24" / "Alle akzeptieren" / "Nur notwendige").

## Notes
- Heading "3. Registrierung und Konteniverwaltung" contains a typo (should be "Kontoverwaltung").
- Body copy typos: "behhalten" (§ 2.3), "behaften" (§ 10), "Zahlte Provisionen" (§ 4.4) — should be "behalten" / "Gezahlte".
- Last-updated block is dynamically computed via `new Date().toLocaleDateString('de-DE', ...)` — will always show "today".
- Explicit placeholder notice at the bottom: "Diese AGB sind zu Demonstrationszwecken erstellt. Bitte lassen Sie diese von einem Rechtsanwalt überarbeiten und anpassen, bevor Sie mit dem öffentlichen Betrieb starten." — legal review TODO before launch.
- Imports `Metadata` from next but file does not use it as JSX.
