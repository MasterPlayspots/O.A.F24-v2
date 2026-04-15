# Route: /antraege/[id]

**Source:** `app/antraege/[id]/page.tsx`
**Persona:** protected-but-leaking
**Live Status:** 200 (BUG — unauthenticated; see Notes)
**Protected:** no (at middleware level)

## Metadata
- **Title:** — (inherits root)
- **Description:** —
- **OpenGraph:** —

## H1
{antrag.programm_name or "Antrag-Detail"}

## H2
- Dokumente
- Zugriff

## H3
—

## Buttons
- Berater einladen (opens InviteBeraterModal)

## Links
—

## Form Fields
- **Status** (type=select, values: entwurf | eingereicht | bewilligt | abgelehnt) — antrag.status
- (Dokumente upload/delete → via DokumenteListe component)
- (Invite berater → via InviteBeraterModal component: berater_id + rolle dropdown)

## Messages / Toasts
- "Antrag" (eyebrow)
- "Beantragt" / "Bewilligt" (money panels)
- Status labels: Entwurf, Eingereicht, Bewilligt, Abgelehnt
- "Antrag konnte nicht geladen werden."
- "Dokumente konnten nicht geladen werden."
- "ACL konnte nicht geladen werden."
- "Status konnte nicht geändert werden."
- "Zugriff entziehen fehlgeschlagen."
- Footer: "Erstellt: {date} · Aktualisiert: {date} · Eingeloggt als {email}"

## Notes
- **AUTH GAP:** `middleware.ts` defines `PROTECTED_PREFIXES = ['/foerdercheck', '/onboarding', '/dashboard', '/admin']`. `/antraege/*` is NOT in this list, so any unauthenticated visitor reaches the page and receives HTTP 200. The page has a *client-side* redirect (`if (!token) router.replace('/login')`), but that runs after hydration — bots, server-rendered content in dev tools, and users with JS disabled see the shell. The API calls (`getAntrag`, `listAntragDokumente`, `listAntragZugriff`) will 401 without a token, but the route itself leaks its existence and rendering structure.
- Fix: add `'/antraege'` to PROTECTED_PREFIXES in `middleware.ts`.
- The `PUBLIC_PREFIXES` exact-match check ensures `/antraege/` is not accidentally public; the route simply falls through the middleware's `isProtected` gate and returns `NextResponse.next()`.
