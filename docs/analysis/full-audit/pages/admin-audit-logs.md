# Route: /admin/audit-logs

**Source:** `app/admin/audit-logs/page.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Audit-Logs

## H2
—

## H3
- Zeitstempel (table column)
- User ID (table column)
- Event Type (table column)
- Detail (table column)
- IP (table column)

## Buttons
- Filtern (apply filter)
- Mehr laden (pagination)

## Links
—

## Form Fields
- **User ID** (type=text via Input, placeholder="u_…") — filter.user_id
- **Event Type** (type=text via Input, placeholder="login, antrag.create, …") — filter.action
- **Limit** (type=select, values: 25 | 50 | 100) — filter.limit

## Messages / Toasts
- "Vollständiges Event-Protokoll. Nur für Administratoren." (subtitle)
- "Keine Logs gefunden." (empty state)
- "Audit-Logs konnten nicht geladen werden."

## Notes
- Inherits ComingSoonBanner from parent admin layout.
- Detail column is auto-truncated at 60 chars with `title` tooltip.
- No date-range filter — only user_id/action/limit — limited audit utility.
