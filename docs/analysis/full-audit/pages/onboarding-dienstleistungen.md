# Route: /onboarding/dienstleistungen

**Source:** `app/onboarding/dienstleistungen/page.tsx`
**Persona:** protected berater
**Live Status:** 307 → /login
**Protected:** yes (middleware.ts — `/onboarding` prefix requires valid JWT cookie)

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Dienstleistungen anbieten

## H2
- —

## H3
- Dienstleistung #{index + 1} (per card)

## Buttons
- Trash2 icon button (remove entry; only when >1 cards)
- + Dienstleistung hinzufügen
- Zum Dashboard (submit; `<LadeSpinner />` while loading)

## Links
- —

## Form Fields
Repeated per card (entries[index]):
- **Dienstleistungsname** (type=text, placeholder="z.B. Fördermittelberatung Grundlagen") — entries.{i}.name
- **Kategorie (optional)** (Select trigger, placeholder="Wählen Sie eine Kategorie (optional)") — entries.{i}.kategorie [Potenzialanalyse, Strategieentwicklung, Fördermittelberatung, Antragsvorbereitung, Nachhaltigkeitsberatung, Digitalisierungsberatung, Gründungsberatung]
- **Preismodell** (type=radio, no placeholder) — entries.{i}.preisTyp [pauschal → "Pauschal", stundenbasiert → "Stundenbasiert", erfolgsbasiert → "Erfolgsbasiert"; default=pauschal]
- **Bearbeitungsdauer (Tage)** (type=number, min=1, placeholder="1") — entries.{i}.dauertage
- **Preis von (EUR)** (type=number, min=0, placeholder="0") — entries.{i}.preisVon
- **Preis bis (EUR)** (type=number, min=0, placeholder="0") — entries.{i}.preisBis

## Messages / Toasts
- SchrittAnzeige: Profil / Expertise / Dienstleistungen (step 2 active)
- "Definieren Sie die Dienstleistungen, die Sie anbieten möchten, und legen Sie Ihre Preise fest." (subtitle)
- FehlerBox displays `fehler` state
- Validation: "Mindestens 2 Zeichen erforderlich", "Muss 0 oder höher sein", "Mindestens 1 Tag erforderlich", "Mindestens 1 Dienstleistung erforderlich"

## Notes
- Role guard: unauthenticated → `/login`; authenticated non-berater → `/dashboard/unternehmen`.
- Uses `useFieldArray` (dynamic card list, min=1).
- Same sequential-loop submission pattern (`for entry of entries: await addDienstleistung(entry)`) — N roundtrips, partial-failure risk.
- No validation that `preisBis >= preisVon` — user can save invalid price range.
- On success → `/dashboard/berater` (final onboarding step).
