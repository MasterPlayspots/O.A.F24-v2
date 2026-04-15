# Route: /foerder-schnellcheck/ergebnis

**Source:** `app/(public)/foerder-schnellcheck/ergebnis/page.tsx`
**Persona:** public
**Live Status:** 200
**Protected:** no (redirect guard: `/foerder-schnellcheck` if no sessionId / phase !== 'ergebnis' / no scoring)

## Metadata
- **Title:** Fördercheck | fund24 (inherits flow layout)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach. (inherits flow layout)
- **OpenGraph:** — (inherits root)

## H1
Ihre Fördermittel-Ergebnisse

## H2
- {treffer.name} (dynamic, repeated for each of top 3 programmes)

## H3
—

## Buttons
- Detaillierte Report anfordern (primary CTA → navigates to `/bericht`)
- Zurück (layout header)

## Links
- `/` — "Zurück" (layout header)

## Form Fields
—

## Messages / Toasts
- "Top 3 passende Förderprogramme für Ihr Unternehmen" (subtitle)
- "{pct}%" + "Wahrscheinlichkeit" (per-card right-rail metric)
- "Max. Fördersumme" / formatted EUR (per-card)
- "Bundesweit" / "Ja" or "Regional" (per-card)
- "Dienstleister-kompatibel" (conditional badge)
- "Gesamtförderpotenzial" (total section label)
- "{gesamtMin} bis {gesamtMax}" (EUR range)
- "Basierend auf Top-3-Treffer und Ihrem Unternehmensprofil" (explanation)
- "Erhalten Sie einen PDF-Report mit Details zu jedem Programm" (footer hint)

## Notes
- Step 4 of 6. Fully store-driven — reads `store.scoring.top3[]` and `store.scoring.gesamtMin/Max` from `usePreCheck`.
- CTA button label "Detaillierte Report anfordern" is **grammatically incorrect German** — should be "Detaillierten Report anfordern" (masculine accusative). Same typo pattern appears in Bericht page helper copy as "Ihren detaillierten Report".
- Per-card: shows `klasse` as a badge, `foerderart • traeger` as meta line, and `beschreibungKurz` as body paragraph.
- Currency: `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })`. Undefined values render as "—".
- Same broken redirect-guard pattern as `/chat`: uses inline `router.push` during render instead of `useEffect` — can emit React warnings.
- No direct link from top-3 cards to the programme detail page — cards are read-only. Given `/programme/[id]` is currently 404-ing this is perhaps intentional / masking the bug.
