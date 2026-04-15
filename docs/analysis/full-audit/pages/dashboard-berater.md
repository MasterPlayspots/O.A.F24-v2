# Route: /dashboard/berater

**Source:** `app/dashboard/berater/page.tsx` + `app/dashboard/berater/layout.tsx`
**Persona:** berater
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Berater Dashboard

## H2
- Meine Kunden ({n}) (conditional)
- Neue Anfragen (conditional)
- Aktive Projekte (conditional)

## H3
- {firmenname} (per-kunde card title)
- {vonUserName} (per-anfrage heading)
- {programmName or "Projekt"} (per-projekt heading)
- Neue Anfragen (KPI card)
- Aktive Projekte (KPI card)
- Offene Provisionen (KPI card)

## Buttons
- Annehmen (per-anfrage)
- Ablehnen (per-anfrage)
- Alle Anfragen (Link → /dashboard/berater/anfragen)
- Meine Beratungen (Link → /dashboard/berater/beratungen)
- Nachrichten (Link → /dashboard/berater/nachrichten)
- Provisionen (Link → /dashboard/berater/abwicklung)

## Links
- `/dashboard/berater/anfragen` — Alle Anfragen
- `/dashboard/berater/beratungen` — Meine Beratungen
- `/dashboard/berater/nachrichten` — Nachrichten
- `/dashboard/berater/abwicklung` — Provisionen

## Form Fields
—

## Messages / Toasts
- "Übersicht Ihrer Anfragen und Projekte" (subtitle)
- "{antraege_count} Antrag/Anträge" (per-kunde)
- "Zuletzt: {date}" (per-kunde)
- "Fehler beim Laden der Daten"
- "Fehler beim Akzeptieren"
- "Fehler beim Ablehnen"
- "Dienstleistung: {anfrage.nachricht}" (per-anfrage, label-as-body reuse)

## Notes
- `layout.tsx` wraps with `<ComingSoonBanner feature="Berater-Dashboard" eta="Q2 2026" />` → WIP banner shown even though the dashboard itself is fully built.
- `anfrage.nachricht` is labeled as "Dienstleistung:" — looks like a data-model mismatch.
- "Meine Kunden"-panel only surfaces if `listBeraterKunden` succeeds; silently hidden otherwise.
