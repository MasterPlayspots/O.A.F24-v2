# Route: /admin/provisionen

**Source:** `app/admin/provisionen/page.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Provisionen verwalten

## H2
—

## H3
- Berater (table column)
- Unternehmen (table column)
- Programm (table column)
- Betrag (table column)
- Provision (9,99%) (table column)
- Status (table column)
- Aktionen (table column)

## Buttons
- Zurück (Link → /admin)
- Speichern (per-row, only when editing betrag)

## Links
- `/admin` — Zurück

## Form Fields
- **Nach Status filtern** (type=select, values: Alle Status | ausstehend | dokumente_eingereicht | geprueft | abgerechnet | storniert)
- **(inline betrag edit)** (type=number via Input, placeholder="Betrag")
- **(inline status dropdown)** (per row, same status values)

## Messages / Toasts
- "{n} Provisionen insgesamt" (counter subtitle)
- "Provisionen werden geladen..." (loader text)
- "Keine Provisionen gefunden" (empty state)
- "Kein Token"
- "Ungültiger Betrag"
- "Fehler beim Laden"
- "Fehler beim Update"

## Notes
- Inherits ComingSoonBanner from parent admin layout.
- Hardcoded "9,99%" provision rate in column header — if `provisionsSatz` varies per row, header is misleading.
- Betrag edit writes via `notiz: "bewilligt: {betrag} EUR"` — stores structured value in a free-text field → data-model smell.
- berater/unternehmen IDs are truncated to 8 chars; no lookup to names.
