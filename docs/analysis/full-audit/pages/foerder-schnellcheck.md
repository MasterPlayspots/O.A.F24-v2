# Route: /foerder-schnellcheck

**Source:** `app/(public)/foerder-schnellcheck/page.tsx` (+ `app/(public)/foerder-schnellcheck/layout.tsx`)
**Persona:** public
**Live Status:** 200
**Protected:** no

## Metadata
- **Title:** Fördercheck | fund24 (from layout.tsx — applies to all /foerder-schnellcheck/* pages)
- **Description:** Kostenloser AI-gestützter Fördercheck für Ihr Unternehmen — schnell und einfach.
- **OpenGraph:** — (inherits root; no flow-level OG overrides)

## H1
Fördercheck

## H2
- Was passiert nächster?

## H3
—

## Buttons
- Analyse starten (primary submit; disabled during loading)
- Zurück (in layout header, links to `/`)

## Links
- `/` — "Zurück" (layout header back link)

## Form Fields
- **Website Ihres Unternehmens** (type=url, placeholder="https://www.example.com") — `url`

## Messages / Toasts
- "Bitte geben Sie eine gültige URL ein (z.B. https://example.com)" (zod error)
- "Analyse fehlgeschlagen" (fallback error)
- "Wir nutzen Ihre Website, um Ihr Unternehmen zu analysieren. Alle Daten sind sicher." (helper text)
- "Analysiere Ihre Website..." (LadeSpinner text during submit)
- "Finden Sie passende Förderprogramme in weniger als 5 Minuten — kostenlos und unverbindlich." (subtitle)
- Layout footer: "Diese Sitzung ist vorübergehend gespeichert. Bitte aktivieren Sie Cookies für eine nahtlose Erfahrung."
- Info box ordered list:
  - "1. Wir analysieren Ihre Website und erstellen ein Profil"
  - "2. Sie beantworten einige Fragen zu Ihrem Vorhaben"
  - "3. KI matched Sie mit den passendsten Programmen"
  - "4. Sie erhalten einen detaillierten Report per E-Mail"

## Notes
- Info box heading "Was passiert nächster?" — **grammatical error in German**; should be "Was passiert als nächstes?".
- Typo/anglicism in list item 3: "KI matched Sie" — should be "KI matcht Sie" / "KI gleicht Sie mit ... ab".
- Step 1 of 6 in the PreCheck flow (`phase: 'url_eingabe' → 'analyse_laeuft'`). Submit writes `sessionId` + `profil` into `usePreCheck` store and navigates to `/analyse`.
- Layout renders "fund24" as H2 in its header strip — this is brand, not page structure; safe to ignore for page-audit headings but worth noting that it appears on every step.
- Errors route through `FehlerBox` component (not toast) — consistent within the flow.
