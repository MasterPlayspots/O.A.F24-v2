# Route: /dashboard/berater/vorlagen

**Source:** `app/dashboard/berater/vorlagen/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Vorlagen

## H2
- Noch keine Vorlagen (empty-state heading)

## H3
- {v.titel} (per-card)

## Buttons
- + Neue Vorlage (opens NeueVorlageModal)
- Vorlage erstellen (empty-state CTA)
- Verwenden (per-card, copy to clipboard) / Kopiert (post-success state)
- Trash2 (per-card delete, icon-only)

## Links
—

## Form Fields
(in NeueVorlageModal — not inlined)

## Messages / Toasts
- "Wiederverwendbare Textbausteine für deine Berichte" (subtitle)
- "Lege deinen ersten Textbaustein an." (empty state body)
- "Vorlagen konnten nicht geladen werden."
- "Kopieren fehlgeschlagen — Browser-Berechtigung prüfen."
- "Löschen fehlgeschlagen."
- Native confirm: "Vorlage wirklich löschen?"

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Uses `confirm()` browser dialog for delete — not aligned with app's custom dialog pattern.
- Delete button has no label, icon-only; a11y concern.
