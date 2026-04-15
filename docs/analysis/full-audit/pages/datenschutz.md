# Route: /datenschutz

**Source:** `app/(public)/datenschutz/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Datenschutz | fund24
- **Description:** Datenschutzerklärung und Informationen zur Datenverarbeitung bei fund24.
- **OpenGraph:** — (inherits root)

## H1
Datenschutzerklärung

## H2
- 1. Verantwortlicher für die Datenverarbeitung
- 2. Datenverarbeitung und Ihre Rechte
- 3. Cookies und Tracking
- 4. Nutzerkonto und Registrierung
- 5. Dokument-Upload und Speicherung
- 6. Ihre Rechte gemäß DSGVO
- 7. Recht auf Beschwerde
- 8. Hosting und externe Dienstleister
- 9. Speicherdauer
- 10. Weitergabe von Daten an Dritte
- 11. Fragen zum Datenschutz?

## H3
- Art der verarbeiteten Daten
- Rechtsgrundlagen
- Authentifizierungs-Cookie
- Signal-Cookie
- Weitere Tracking-Tools
- Vercel (Frontend-Hosting)
- Cloudflare Workers (Serverless-Funktionen)
- Datenschutzabkommen

## Buttons
—

## Links
- `https://vercel.com/legal/privacy` — vercel.com/legal/privacy
- `https://www.cloudflare.com/de-de/privacypolicy/` — cloudflare.com/de-de/privacypolicy

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
- Last-updated block is dynamically computed via `new Date().toLocaleDateString('de-DE', ...)` — shows "today" on every page load; cannot prove when the policy actually changed.
- Explicit demo-disclaimer footer: "Diese Datenschutzerklärung ist zu Demonstrationszwecken erstellt. Bitte lassen Sie sie von einem Rechtsanwalt prüfen, bevor Sie mit dem öffentlichen Betrieb starten." — legal review TODO before launch.
- Cookies listed (`fund24-auth`, `fund24-signal`) are referenced — worth cross-checking against actual set cookies.
- "Zuständige Behörde für Berlin" referenced but the Impressum places the company in Kronach / Oberfranken — inconsistency between imprint jurisdiction and data-protection authority.
- Uses raw Tailwind `bg-blue-50`/`border-blue-200` info boxes that clash with the architect design tokens used elsewhere.
