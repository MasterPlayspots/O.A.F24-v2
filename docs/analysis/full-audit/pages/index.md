# Route: /

**Source:** `app/(public)/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Fördermittel einfach finden | fund24
- **Description:** Kostenloser KI-Fördercheck für Unternehmen · 3.400+ aktive Förderprogramme · Matching mit geprüften Beratern · Von Antrag bis Abwicklung auf einer Plattform.
- **OpenGraph:** — (inherits root: title "fund24 – Fördermittel einfach finden", description "Kostenloser KI-Fördercheck. 3.400+ aktive Förderprogramme. Berater-Matching. Von Antrag bis Abwicklung auf einer Plattform.")

## H1
Fördermittel für dein Unternehmen — in 5 Minuten gefunden.

## H2
- Von der ersten Recherche bis zur Bewilligung — alles auf einer Plattform.
- So läuft's ab
- Neue Mandate, ohne Kaltakquise.

## H3
- Katalog entdecken
- KI-Fördercheck
- Berater-Matching
- Profil anlegen
- KI-Matching
- Antrag & Beratung
- DSGVO-konform
- Geprüfte Berater
- Keine versteckten Kosten

## Buttons
- Fördercheck starten
- Alle Programme ansehen
- Als Berater registrieren

## Links
- `/foerder-schnellcheck` — Fördercheck starten
- `/programme` — Alle Programme ansehen
- `/programme` — Katalog öffnen
- `/foerder-schnellcheck` — Check starten
- `/berater` — Berater finden
- `/registrieren?rolle=berater` — Als Berater registrieren

## Form Fields
—

## Messages / Toasts
—

## Shared Layout Chrome
Public layout (`app/(public)/layout.tsx`) renders `<Navbar/>`, `<Footer/>`, `<SupportWidget/>`.
- Navbar brand: "fund24"; nav links: Programme, Berater, Preise, Aktuelles; auth CTAs: "Anmelden", "Registrieren"; authed menu: Dashboard / Fördercheck / Favoriten / Anfragen / Abwicklung / Admin-Panel / "Ausloggen"; role badges: Admin / Berater / Unternehmen.
- Footer columns — Plattform (Startseite, Programme, Berater, Preise), Beratung (Fördercheck starten, Berater werden, Aktuelles), Support (Kontakt, FAQ), Legal (Datenschutz, Impressum, AGB); copy line: "© 2026 Fröba Sales Solutions UG (haftungsbeschränkt) · Alle Rechte vorbehalten".
- SupportWidget floating panel: "Hilfe & Kontakt", "Telefon / +49 1512 9617192", "E-Mail / support@fund24.io", "Mo–Fr 9–17 Uhr".
- Root layout also mounts `<CookieBanner/>`: "Datenschutz auf fund24" headline, body copy about technically necessary cookies + anonymised error tracking, buttons "Alle akzeptieren" and "Nur notwendige".

## Notes
- Decorative pill copy: "Kostenloser KI-Fördercheck"; reassurance line under primary CTA: "Keine Anmeldung nötig · 100 % kostenlos für Unternehmen · DSGVO-konform"; Berater CTA subtext: "Transparente 9,99 % Provision · nur bei Bewilligung".
- Stats block (not semantic headings): "3.400+ aktive Programme", "16 Bundesländer", "< 5 min bis zum Ergebnis", "KI geprüfter Match".
- Section eyebrow "Für Berater" is a paragraph, not a heading.
