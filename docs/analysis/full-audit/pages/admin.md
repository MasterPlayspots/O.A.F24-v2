# Route: /admin

**Source:** `app/admin/page.tsx` + `app/admin/layout.tsx`
**Persona:** admin
**Live Status:** 307→/login
**Protected:** yes

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
Admin Dashboard

## H2
- Offene BAFA-Zertifizierungen ({n})
- Schnellzugriff

## H3
- Nutzer verwalten (quick link)
- Aktuelles (quick link)
- Provisionen (quick link)

## Buttons
- Freigeben (per-cert pending row)
- Ablehnen (per-cert pending row)
- Öffnen (quick-link card, inside a Link to target href)

## Links
- `/admin/users` — Nutzer verwalten
- `/admin/aktuelles` — Aktuelles
- `/admin/provisionen` — Provisionen

## Form Fields
—

## Messages / Toasts
- "Übersicht und Verwaltung der fund24-Plattform" (subtitle)
- "Keine offenen Anträge." (empty state for cert pending list)
- "Dashboard wird geladen..." (loader text)
- "Kein Token vorhanden"
- "Fehler beim Laden"
- "Keine Daten verfügbar"
- KPI labels: Aktive Nutzer, Checks heute, Offene Anfragen, Pending Provisionen
- Quick-link descriptions: "Rollen und Zugang", "News-Artikel verwalten", "Berater-Provisionen"

## Notes
- `layout.tsx` wraps admin with `<ComingSoonBanner feature="Admin-Bereich" eta="intern, ohne ETA" />` → all admin pages show a "Coming soon (internal)" banner.
- Client-side guard: `istAdmin()` → redirect to `/` (not `/login`); middleware is authoritative.
- Sidebar / outer navigation to other admin pages (audit-logs, email-outbox) is NOT exposed via quick-links on this dashboard — only via direct URL.
