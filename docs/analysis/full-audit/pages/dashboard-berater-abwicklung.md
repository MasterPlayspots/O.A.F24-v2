# Route: /dashboard/berater/abwicklung

**Source:** `app/dashboard/berater/abwicklung/page.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Provisionsabwicklung

## H2
—

## H3
- Unternehmen (table column)
- Provision (EUR) (table column)
- Status (table column)
- Dokument (table column)
- Aktionen (table column)
- Dokumentenrichtlinien (info-box)

## Buttons
- Upload (per-row, if no dokument_url)
- Ersetzen (per-row, if dokument_url exists)

## Links
- `{vertrag.dokument_url}` — "PDF" (per-row, external)

## Form Fields
- **(hidden file input)** (type=file, accept=".pdf") — per-row (maps vertrag.id to ref)

## Messages / Toasts
- "Verwalten Sie Ihre Provisionsverträge und Nachweise" (subtitle)
- "Keine Provisionen" (empty state)
- "Sie haben noch keine abrechenbaren Provisionen" (empty state body)
- "Fehlt" (dokument cell when missing)
- "Nur PDF-Dateien sind erlaubt"
- "Datei darf maximal 10 MB groß sein"
- "Fehler beim Upload"
- "Fehler beim Laden der Provisionen"
- Status labels: Offen, In Bearbeitung, Abgeschlossen, Ausstehend
- Info-box bullet list:
  - Nur PDF-Dateien werden akzeptiert
  - Maximale Dateigröße: 10 MB
  - Dokumente müssen Nachweise über erbrachte Leistungen enthalten
  - Alle erforderlichen Informationen müssen für die Verarbeitung vorhanden sein

## Notes
- Inherits ComingSoonBanner from parent berater layout.
- When an error occurs during load, the whole page is replaced by FehlerBox — user loses even the empty state; inconsistent with other pages which show FehlerBox above content.
