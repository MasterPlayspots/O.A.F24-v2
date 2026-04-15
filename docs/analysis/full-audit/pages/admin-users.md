# Route: /admin/users

**Source:** `app/admin/users/page.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Nutzer verwalten

## H2
—

## H3
- Name (table column)
- E-Mail (table column)
- Unternehmen (table column)
- Rolle (table column)
- Aktionen (table column)

## Buttons
- Zurück (Link → /admin)
- Trash2 icon (per-row deactivate)

## Links
- `/admin` — Zurück

## Form Fields
- **Suchfeld** (type=text via Input, placeholder="Nach E-Mail, Name oder Unternehmen suchen...") — searchQuery
- **(per-row Rolle dropdown)** (type=select, values: unternehmen | berater | admin)

## Messages / Toasts
- "{n} Nutzer insgesamt" (counter subtitle)
- "Nutzer werden geladen..." (loader text)
- "Keine Nutzer gefunden" (empty state)
- "Kein Token"
- "Fehler beim Laden"
- "Fehler beim Update"
- "Fehler beim Löschen"
- Native confirm: "Diesen Nutzer wirklich deaktivieren?"

## Notes
- Inherits ComingSoonBanner from parent admin layout.
- `handleDeactivate` calls `deleteAdminUser` then filters the user from state — language ("deaktivieren") implies soft-delete but API call is named `delete*`; semantics unclear.
- Uses browser `confirm()` — not aligned with app's custom dialog pattern.
