# Route: /admin/email-outbox

**Source:** `app/admin/email-outbox/page.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Email Outbox

## H2
—

## H3
- Zeitstempel (table column)
- Empfänger (table column)
- Betreff (table column)
- Status (table column)
- Fehler (table column)

## Buttons
- Filtern (apply filter)
- Erneut senden (per-row, only when status === "failed")
- Mehr laden (pagination)

## Links
—

## Form Fields
- **Status** (type=select, values: Alle | queued | sending | sent | failed) — statusFilter

## Messages / Toasts
- "Versand-Queue für transaktionale E-Mails. Nur für Administratoren." (subtitle)
- "Keine E-Mails in der Queue." (empty state)
- "Email-Queue konnte nicht geladen werden."
- "Erneutes Senden fehlgeschlagen."
- Status labels: "In Queue", "Wird gesendet", "Versendet", "Fehlgeschlagen"

## Notes
- Inherits ComingSoonBanner from parent admin layout.
- No bulk-retry action; only per-row.
- Error column truncated at 60 chars.
