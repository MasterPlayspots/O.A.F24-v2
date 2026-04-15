# Route: /admin/aktuelles

**Source:** `app/admin/aktuelles/page.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
News & Aktuelles

## H2
—

## H3
- {item.titel} (per-card)
- Artikel bearbeiten / Neuer Artikel (dialog title)

## Buttons
- Zurück (Link → /admin)
- + Neuer Artikel (opens Dialog)
- Edit icon (per-card)
- Speichern / Erstellen (Dialog submit)

## Links
- `/admin` — Zurück

## Form Fields (Dialog)
- **Titel *** (type=text, placeholder="Artikel-Titel") — titel
- **Untertitel** (type=text, placeholder="Optional") — untertitel
- **Zusammenfassung** (type=textarea, placeholder="Kurze Zusammenfassung") — zusammenfassung
- **Kategorie *** (type=text, placeholder="z.B. Tipps") — kategorie
- **Tags** (type=text, placeholder="Tag1, Tag2, Tag3") — tags
- **Inhalt (Markdown) *** (type=textarea, placeholder="# Überschrift\nIhre Inhalte in Markdown...") — inhaltMd
- **Vorschau** (read-only rendered HTML)

## Messages / Toasts
- "Erstellen oder bearbeiten Sie einen News-Artikel" (dialog description)
- "Artikel werden geladen..." (loader text)
- "Kein Token"
- "Fehler beim Laden"
- "Fehler beim Speichern"
- "Keine Artikel vorhanden. Erstellen Sie einen neuen!" (empty state)

## Notes
- Inherits ComingSoonBanner from parent admin layout.
- Markdown preview uses `marked` + `sanitize-html` with restricted tag allowlist.
- Delete action is NOT implemented — only create/edit.
- Slug is generated client-side from title; no manual override.
