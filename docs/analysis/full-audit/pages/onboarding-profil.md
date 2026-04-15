# Route: /onboarding/profil

**Source:** `app/onboarding/profil/page.tsx`
**Persona:** protected berater
**Live Status:** 307 → /login
**Protected:** yes (middleware.ts — `/onboarding` prefix requires valid JWT cookie)

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Profil erstellen

## H2
- —

## H3
- —

## Buttons
- Weiter zur Expertise (submit; `<LadeSpinner />` while loading)

## Links
- —

## Form Fields
- **Anzeigename** (type=text, placeholder="z.B. Dr. Max Müller") — displayName
- **Region / Bundesland** (Select trigger, placeholder="Wählen Sie Ihr Bundesland") — region [16 Bundesländer]
- **Branchen** (type=checkbox group, no placeholder) — branchen [IT, Handwerk, Handel, Gastronomie, Produktion, Logistik, Energie, Beratung, Gesundheit, Bildung]
- **Über Sie (optional)** (textarea rows=4, placeholder="Erzählen Sie etwas über Ihre Erfahrung und Spezialisierung...") — bio
- **Ich bin verfügbar für neue Projekte** (type=checkbox) — verfuegbar

## Messages / Toasts
- SchrittAnzeige: Profil / Expertise / Dienstleistungen (step 0 active)
- "Richten Sie Ihr Berater-Profil ein und geben Sie uns einen Überblick über Ihre Kompetenzen." (subtitle)
- "{bioCount} / 500 Zeichen" (char counter)
- FehlerBox displays `fehler` state
- Validation: "Mindestens 2 Zeichen erforderlich", "Region erforderlich", "Mindestens 1 Branche erforderlich", "Maximal 500 Zeichen"

## Notes
- Role guard: unauthenticated → `/login`; authenticated non-berater → `/dashboard/unternehmen`.
- On success → `/onboarding/expertise`.
- Bio categories here ("IT", "Handwerk", ..., 10 entries) differ from the unternehmen page categories ("IT & Software", "Bau & Immobilien", ..., 11 entries) — **inconsistency flag**.
- Uses shared `SchrittAnzeige`, `FehlerBox`, `LadeSpinner` components.
- `as any` cast on zodResolver (eslint-disable) — same tech debt pattern.
