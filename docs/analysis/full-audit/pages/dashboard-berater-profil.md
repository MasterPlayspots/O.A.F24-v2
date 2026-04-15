# Route: /dashboard/berater/profil

**Source:** `app/dashboard/berater/profil/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Mein Profil bearbeiten

## H2
—

## H3
- Profilstatistiken

## Buttons
- Zurück (Link → /dashboard/berater)
- Änderungen speichern (submit)

## Links
- `/dashboard/berater` — Zurück

## Form Fields
- **Anzeigename *** (type=text, placeholder="Ihr Name für Profile") — displayName
- **Biografie** (type=textarea, placeholder="Beschreiben Sie Ihre Expertise und Erfahrung...") — bio
- **Region / Bundesland *** (type=text, placeholder="z.B. Bayern, Bundesweit") — region
- **Branchen *** (type=textarea, placeholder="Komma-getrennt, z.B. IT, Handwerk, Handel") — branchen
- **Spezialisierungen *** (type=textarea, placeholder="Komma-getrennt, z.B. Mittelstandsförderung, Digitalisierung") — spezialisierungen
- **Website** (type=url, placeholder="https://example.com") — websiteUrl

## Messages / Toasts
- "Aktualisieren Sie Ihre Profilinformationen und Spezialisierungen" (subtitle)
- "Geben Sie mehrere Branchen ein, getrennt durch Kommas" (help text)
- "Geben Sie mehrere Spezialisierungen ein, getrennt durch Kommas" (help text)
- Info-box: "Diese Informationen werden in Ihrem öffentlichen Profil angezeigt. Dies hilft Unternehmen, Sie als passenden Berater zu finden."
- "Profil erfolgreich aktualisiert!" (success)
- Validation errors: "Name muss mindestens 2 Zeichen lang sein", "Region erforderlich", "Mindestens eine Branche erforderlich", "Mindestens eine Spezialisierung erforderlich", "Ungültige URL"
- "Authentifizierung erforderlich"
- "Token erforderlich"
- "Fehler beim Laden"
- "Fehler beim Speichern"
- "Wird gespeichert..."
- Stats: Rating (rating_avg.toFixed(1) + rating_count), Verfügbar (Ja/Nein), Profil-Views

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- If no profile exists (`getBeraterProfil` returns null), the page redirects to `/onboarding/profil` — implicit entry point.
- Form does NOT send `spezialisierungen` or `websiteUrl` in the `updateBeraterProfil` payload (they are collected but discarded) — bug.
- Only `istBerater()` guard is client-side check; middleware handles auth at route level.
