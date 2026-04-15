# Route: /foerdercheck/[sessionId]/ergebnisse

**Source:** `app/foerdercheck/[sessionId]/ergebnisse/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Ihre Fördercheck-Ergebnisse

## H2
- Matching Programme (conditional)
- Empfohlene Berater (conditional)

## H3
—

## Buttons
- Zum Dashboard (Link-like onClick → /dashboard/unternehmen)
- Ergebnisse als PDF (disabled)
- (per-Berater) "Anfrage senden" — rendered inside BeraterMatchKarte

## Links
—

## Form Fields
—

## Messages / Toasts
- "{resultCount} passende Programme für {firmenname}" (subtitle)
- "Diese Berater haben Expertise in Ihren Förderbereichcen" (berater subtitle — typo: "Förderbereichcen" should be "Förderbereichen")
- "Ergebnisse werden geladen..." (loader)
- "Ergebnisse konnten nicht geladen werden" (fallback)
- "Fehler beim Laden der Ergebnisse"
- "Fehler beim Senden der Anfrage"
- alert: "PDF-Download wird in Kürze implementiert"
- SchrittAnzeige steps: Angaben, Chat, Dokumente, Analyse, Ergebnisse (current = 4)

## Notes
- Legacy light-theme Card styling (inconsistent with dark app shell).
- **TYPO:** "Förderbereichcen" in berater section subtitle.
- PDF export **WIP**: button is `disabled` and `handleDownloadPDF` shows a placeholder `alert()` ("PDF-Download wird in Kürze implementiert").
- Top-3 berater only — no pagination.
