# Route: /dashboard/berater/beratungen/[id]

**Source:** `app/dashboard/berater/beratungen/[id]/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
{beratung.unternehmen_name or "Beratung"}

## H2
—

## H3
—

## Buttons
—

## Links
—

## Form Fields
- **Phase** (type=select) — values: anlauf | datenerhebung | durchfuehrung | bericht | eingereicht | bewilligt | abgeschlossen | abgelehnt
- **Förderhöhe (€)** (type=number, placeholder="0") — foerderhoehe
- **Eigenanteil (€)** (type=number, placeholder="0") — eigenanteil
- **Protokoll** (type=textarea, placeholder="Protokoll der Beratung…") — protokoll

## Messages / Toasts
- "BAFA-Beratung" (eyebrow)
- "BAFA-Nr: {nr}" (meta badge)
- "Branche: {branche}" (meta)
- "Aktuell: {fmtEUR}" (below Förderhöhe / Eigenanteil)
- "Beratung konnte nicht geladen werden."
- "Speichern fehlgeschlagen."
- "Förderhöhe muss eine Zahl sein."
- "Eigenanteil muss eine Zahl sein."
- AutosaveIndicator states (idle/saving/saved/error)
- Footer: "ID: {id}", "Erstellt: {date} · Aktualisiert: {date}"

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Autosave on blur; no explicit save button.
- PHASE list is aligned to DB CHECK (8 BAFA phases).
