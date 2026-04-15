# Route: /onboarding/unternehmen

**Source:** `app/onboarding/unternehmen/page.tsx`
**Persona:** protected (both personas)
**Live Status:** 307 → /login
**Protected:** yes (middleware.ts — `/onboarding` prefix requires valid JWT cookie)

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Unternehmen einrichten

## H2
- —

## H3
- —

## Buttons
- Unternehmen speichern → Dashboard (submit; shows `<LadeSpinner />` while loading)

## Links
- —

## Form Fields
- **Firmenname \*** (type=text, placeholder="z.B. Müller GmbH") — firmenname
- **Rechtsform** (Select trigger, placeholder="Wählen…") — rechtsform [Einzelunternehmen, GbR, OHG, KG, GmbH, UG (haftungsbeschränkt), GmbH & Co. KG, AG, eG]
- **Gründungsjahr** (type=number, min=1800, max=2100, placeholder="2020") — gruendungsjahr
- **Branche \*** (Select trigger, placeholder="Wählen…") — branche [IT & Software, Handwerk, Handel, Gastronomie, Produktion & Fertigung, Logistik, Energie, Beratung & Dienstleistung, Gesundheit & Pflege, Bildung, Bau & Immobilien]
- **PLZ** (type=text, placeholder="80331") — plz
- **Ort** (type=text, placeholder="München") — ort
- **Bundesland \*** (Select trigger, placeholder="Wählen…") — bundesland [16 Bundesländer]
- **Mitarbeiter (FTE)** (type=number, min=0, placeholder="10") — mitarbeiter_anzahl
- **Jahresumsatz (EUR)** (type=number, min=0, placeholder="500000") — jahresumsatz
- **KMU (kleine oder mittlere Unternehmen)** (type=checkbox) — ist_kmu

## Messages / Toasts
- "Onboarding" (eyebrow/kicker above H1)
- "Wir brauchen ein paar Eckdaten, damit wir die passenden Förderprogramme für Sie finden können." (subtitle)
- FehlerBox displays `fehler` state (Error.message or "Ein Fehler ist aufgetreten")
- Validation: "Mindestens 2 Zeichen erforderlich", "Branche erforderlich", "Bundesland erforderlich"

## Notes
- Client-side role guard: if authenticated non-unternehmen, redirects to `/dashboard/berater`.
- On success → `router.push('/dashboard/unternehmen')` (no skip/back link).
- No step indicator (SchrittAnzeige) — bare single-step layout, unlike berater onboarding.
- Uses `FehlerBox` + `LadeSpinner` shared components.
- Uses `as any` cast on zodResolver (eslint-disable comment) — minor tech debt.
