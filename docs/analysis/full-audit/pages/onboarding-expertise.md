# Route: /onboarding/expertise

**Source:** `app/onboarding/expertise/page.tsx`
**Persona:** protected berater
**Live Status:** 307 → /login
**Protected:** yes (middleware.ts — `/onboarding` prefix requires valid JWT cookie)

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Expertise hinzufügen

## H2
- —

## H3
- Expertise #{index + 1} (per card, dynamically numbered)

## Buttons
- Trash2 icon button (remove entry; only when >1 cards)
- + Eintrag hinzufügen (append new card)
- Weiter zu Dienstleistungen (submit; `<LadeSpinner />` while loading)

## Links
- —

## Form Fields
Repeated per card (entries[index]):
- **Förderbereich** (Select trigger, placeholder="Wählen Sie einen Förderbereich") — entries.{i}.foerderbereich [KfW Gründungsfinanzierung, KfW Wachstumsfinanzierung, EU-Förderung, Bund-Länder-Programme, Digitalisierungsförderung, Nachhaltigkeitsförderung, Technologieförderung]
- **Kompetenzstufe** (type=radio, no placeholder) — entries.{i}.kompetenzLevel [einsteiger → "Einsteiger", fortgeschritten → "Fortgeschritten", experte → "Experte"; default=fortgeschritten]
- **Erfolgreiche Anträge** (type=number, min=0, placeholder="0") — entries.{i}.erfolgreicheAntraege
- **Gesamtvolumen (EUR)** (type=number, min=0, placeholder="0") — entries.{i}.gesamtvolumenEur

## Messages / Toasts
- SchrittAnzeige: Profil / Expertise / Dienstleistungen (step 1 active)
- "Geben Sie an, in welchen Förderbereichen Sie spezialisiert sind und wie viele erfolgreiche Anträge Sie bereits bearbeitet haben." (subtitle)
- FehlerBox displays `fehler` state
- Validation: "Förderbereich erforderlich", "Muss 0 oder höher sein", "Mindestens 1 Expertise erforderlich"

## Notes
- Role guard: unauthenticated → `/login`; authenticated non-berater → `/dashboard/unternehmen`.
- Uses `useFieldArray` from react-hook-form (dynamic card list, min=1).
- Submit loops sequentially over `addExpertise(entry)` for each entry — **no batching, N network roundtrips**, partial-failure risk if one call fails mid-loop (subsequent entries skipped, prior entries persist).
- On success → `/onboarding/dienstleistungen`.
