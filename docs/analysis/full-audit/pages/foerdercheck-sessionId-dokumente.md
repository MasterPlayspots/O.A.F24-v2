# Route: /foerdercheck/[sessionId]/dokumente

**Source:** `app/foerdercheck/[sessionId]/dokumente/page.tsx`
**Persona:** protected unternehmen
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Dokumente hochladen

## H2
—

## H3
- Hochgeladene Dateien ({n}) (conditional)
- Empfohlene Dokumente
- Datenschutz (info card)

## Buttons
- durchsuchen (link-style, opens file picker)
- Entfernen (per-file)
- ← Zurück (routes to /foerdercheck)
- Analyse starten → / Wird hochgeladen... / Wird analysiert...

## Links
—

## Form Fields
- **(file input)** (type=file, multiple, accept=".pdf,.jpg,.jpeg,.png")

## Messages / Toasts
- "Laden Sie relevante Geschäftsdokumente hoch, um die Analysen zu verbessern" (subtitle)
- "Dateien hier ablegen oder" + "durchsuchen" (dropzone prompt)
- "PDF, JPG oder PNG. Max. 10MB pro Datei."
- "{filename}: Nur PDF, JPG und PNG erlaubt" (validation error)
- "{filename}: Datei ist zu groß (max. 10MB)" (validation error)
- Recommended docs list:
  - Jahresabschluss / Bilanz
  - Gewinn- und Verlustrechnung
  - Steuererklärungen
  - Businessplan
  - Investitionsplan
  - Kosten-Nutzen-Analyse
- DSGVO notice: "Ihre Dokumente werden verschlüsselt und auf Servern in der EU gespeichert. Alle Daten werden nach Abschluss der Analyse automatisch gelöscht."
- "Authentifizierung läuft..." (loader)
- "Fehler beim Upload"
- SchrittAnzeige steps: Angaben, Chat, Dokumente, Analyse, Ergebnisse (current = 2)

## Notes
- Legacy light-theme Card styling (inconsistent with dark app shell).
- DSGVO copy claims "automatisch gelöscht" after analysis — needs backend verification; hard claim for audit.
- Back button targets `/foerdercheck` (wizard step 0), not the previous step.
