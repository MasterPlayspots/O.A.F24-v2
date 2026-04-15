# Route: /dashboard/berater/berichte/[id]

**Source:** `app/dashboard/berater/berichte/[id]/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
{isNew ? "Neuer Bericht" : "Bericht bearbeiten"}

## H2
—

## H3
—

## Buttons
- FinalizeButton (label rendered by component; action: finalize bericht)

## Links
—

## Form Fields
- **Ausgangslage** (type=textarea, placeholder="Ausgangslage beschreiben…") — content.ausgangslage
- **Ziele** (type=textarea, placeholder="Ziele beschreiben…") — content.ziele
- **Maßnahmen** (type=textarea, placeholder="Maßnahmen beschreiben…") — content.massnahmen
- **Wirtschaftlichkeit** (type=textarea, placeholder="Wirtschaftlichkeit beschreiben…") — content.wirtschaftlichkeit
- **Empfehlung** (type=textarea, placeholder="Empfehlung beschreiben…") — content.empfehlung

## Messages / Toasts
- "γ-Hybrid · Berater-Bericht" (eyebrow)
- "Bericht konnte nicht geladen werden."
- "Speichern fehlgeschlagen."
- "Finalisieren fehlgeschlagen."
- "Status-Flow: draft → preview → paid → downloaded" (footer caption)
- Footer: "ID: {id}", "Finalisiert von: {beraterId}"
- StatusBadge + AutosaveIndicator components

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- Sentinel route: `id === 'new'` triggers `createBericht` on first blur, then `router.replace` to the real ID. No server-side 404 guard for unknown IDs beyond what the API returns.
- Autosave on blur only — no explicit "Speichern" button; users relying on Ctrl+S expectations may lose changes if they close the tab while a textarea is focused.
