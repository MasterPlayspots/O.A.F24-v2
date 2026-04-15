# Route: /berater/[id]

**Source:** `app/(public)/berater/[id]/page.tsx`
**Persona:** public
**Live Status:** 200 (tested profil-001)
**Protected:** no

## Metadata
- **Title:** — (inherits root; `'use client'` — no page metadata export)
- **Description:** — (inherits root)
- **OpenGraph:** — (inherits root)

## H1
{berater.displayName} (dynamic — rendered from API)

Error variant H1: "Berater nicht gefunden"

## H2
- Über mich
- Fachkompetenz
- Dienstleistungen
- Spezialisierungen

## H3
- Interesse?

## Buttons
- Anfrage senden (primary CTA in sidebar)
- Abbrechen (dialog)
- Senden (dialog submit)

## Links
- `/berater` — "Zurück zur Beraterliste" (back link, appears in both error state and normal state)
- `/registrieren?rolle=unternehmen&berater={paramId}` — triggered via `router.push` when unauthenticated user clicks "Anfrage senden"

## Form Fields
- **Ihre Anfrage** (type=textarea, placeholder="Ihre Anfrage...") — Anfrage message (in Dialog)

## Messages / Toasts
- "Entschuldigung, dieser Berater konnte nicht geladen werden." (fetch error)
- "Entschuldigung, dieser Berater existiert nicht." (fallback when no error string)
- "Ihre Anfrage wurde erfolgreich gesendet!" (native `alert()` on success — NOT a toast)
- "Fehler beim Senden der Anfrage. Bitte versuchen Sie es später erneut." (Anfrage submit error)
- "Sie sind als Berater angemeldet. Sie können keine Anfragen stellen." (role guard notice)
- "Verfügbar" (Badge label when berater.verfuegbar)

## Notes
- Success feedback uses `alert(...)` instead of the project-wide `sonner` Toaster — inconsistent UX. Recommend switching to `toast.success(...)`.
- Dialog title: "Anfrage an {berater.displayName}" / description: "Beschreiben Sie kurz, wobei Sie Unterstützung benötigen."
- CTA sidebar copy: "Nehmen Sie Kontakt auf und senden Sie eine Anfrage."
- No page metadata (client component). `og:title` will fall back to the root "fund24 – Fördermittel einfach finden" — no berater-specific OG tags, hurting social sharing.
- Note: the parent layout (`/berater/layout.tsx`) injects the ComingSoonBanner here too ("Berater-Verzeichnis" Q2 2026).
