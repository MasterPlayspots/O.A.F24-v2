# ANTIGRAVITY NACHT 1 — Security Hardening + Frontend UX Fixes

Du arbeitest im O.A.F24-v2 Repo (fund24.io). Next.js 15 App Router + Cloudflare Workers (Hono) + 5× D1.
Dein Auftrag: Phase 2 (Security) + Phase 3 (Frontend UX) aus `docs/analysis/EXECUTION_PLAN_2026-04-16.md` implementieren.

**WICHTIG:** "Edit automatically" ist AN. Du commitest SELBST nach jeder Phase. Kein User-Input nötig.

---

## ABLAUF

### STEP 0 — Setup
```bash
git checkout main && git pull origin main
git checkout -b fix/nacht1-security-frontend-ux
```

Lies `docs/analysis/EXECUTION_PLAN_2026-04-16.md` und `docs/analysis/full-audit/00_all_findings.json` für den vollen Kontext.

---

### STEP 1 — TASK-001: Auth auf /api/check/* (H-P3-01)

**Dateien:** `worker/src/routes/check.ts`

- Importiere `requireAuth` aus dem bestehenden Auth-Middleware-System (suche wie andere Routes es machen, z.B. `admin.ts` oder `antraege.ts`)
- Füge `requireAuth` Middleware zu ALLEN 5 Handlern in check.ts hinzu
- Unauthenticated Requests → 401 `{ error: "Nicht autorisiert" }`
- Behalte die bestehende KV-Session-Logik, aber auth kommt DAVOR

**Akzeptanz:** Kein check.ts Handler ist ohne Auth erreichbar.

---

### STEP 2 — TASK-002: SSRF Allowlist (H-P3-03)

**Dateien:** `worker/src/routes/admin.ts`

Finde den `/api/admin/check-foerdermittel` Handler (der mit `Promise.all` über `fetch(p.url)`).

- Erstelle eine Allowlist-Funktion:
```typescript
const ALLOWED_HOSTS = ['www.foerderdatenbank.de', 'www.foerdermittel.net', 'api.bafa.de', 'www.bafa.de', 'www.kfw.de'];
function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  } catch { return false; }
}
```
- Filtere URLs VOR dem fetch: `const safeUrls = urls.filter(u => isAllowedUrl(u.url))`
- Ändere `redirect: "follow"` → `redirect: "error"`
- Timeout bleibt bei 8s

---

### STEP 3 — TASK-009: scrapeCompanyFromUrl SSRF

**Dateien:** `worker/src/routes/check.ts`

Finde `scrapeCompanyFromUrl` (oder die Funktion die user-supplied URLs fetcht).

- Füge Private-IP-Blockierung hinzu:
```typescript
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') ||
      host.startsWith('172.16.') || host.startsWith('192.168.') || host === '169.254.169.254' ||
      host === '0.0.0.0' || parsed.protocol === 'file:';
  } catch { return true; }
}
```
- Blocke private URLs mit 400 `{ error: "URL nicht erlaubt" }`
- Setze Timeout auf 5000ms

---

### STEP 4 — TASK-003: DSGVO Checkbox Split (H-P2-01)

**Dateien:** `app/(public)/foerder-schnellcheck/bericht/page.tsx`

Finde die einzelne DSGVO Checkbox (suche nach `dsgvo` im zod-Schema und im JSX).

- Ersetze das EINE `dsgvo: z.boolean()` Feld durch ZWEI:
```typescript
datenschutz: z.literal(true, { errorMap: () => ({ message: 'Bitte akzeptieren Sie die Datenschutzerklärung' }) }),
marketing: z.boolean().optional().default(false),
```
- Im JSX: Ersetze die eine Checkbox durch ZWEI separate:
  1. **Pflicht-Checkbox:** "Ich akzeptiere die [Datenschutzerklärung](/datenschutz)" (required)
  2. **Optionale Checkbox:** "Ich möchte den fund24 Newsletter erhalten" (optional)
- Stelle sicher das `datenschutz` Link zu `/datenschutz` hat
- Die Form kann nur abgeschickt werden wenn `datenschutz` checked ist
- `marketing` ist optional und unabhängig

---

### STEP 5 — TASK-004: Stripe Webhook Status Codes

**Dateien:** `worker/src/routes/payments.ts`

Finde den Stripe Webhook Handler (suche nach `received: true, error`).

- Ändere ALLE Stellen wo bei Fehler trotzdem 200 returned wird:
  - Signature mismatch → `return c.json({ error: 'Invalid signature' }, 401)`
  - Amount mismatch → `return c.json({ error: 'Amount mismatch' }, 400)`
  - Missing payment → `return c.json({ error: 'Payment not found' }, 404)`
  - Success bleibt → `return c.json({ received: true }, 200)`

---

### STEP 6 — TASK-005: Rate-Limit /api/auth/refresh

**Dateien:** `worker/src/routes/auth.ts`

Finde den `/api/auth/refresh` oder POST refresh Handler.

- Suche wie `loginRateLimit` implementiert ist (es gibt bereits einen Rate-Limiter für Login)
- Erstelle analog `refreshRateLimit` mit: max 5 pro Minute pro IP
- Bei Überschreitung → 429 `{ error: "Zu viele Anfragen", retryAfter: 60 }`
- Setze `Retry-After: 60` Header

---

### STEP 7 — TASK-008: Consent Gate auf URL-Eingabe

**Dateien:** `app/(public)/foerder-schnellcheck/page.tsx`

Finde das URL-Eingabe-Formular (wo der User seine Website-URL eingibt für die Analyse).

- Füge eine Checkbox UNTER dem URL-Feld hinzu:
```tsx
<div className="flex items-start gap-2 mt-3">
  <Checkbox id="url-consent" checked={urlConsent} onCheckedChange={(c) => setUrlConsent(!!c)} />
  <Label htmlFor="url-consent" className="text-sm text-muted-foreground">
    Ich stimme zu, dass meine Website analysiert wird.{' '}
    <Link href="/datenschutz" className="underline">Datenschutzerklärung</Link>
  </Label>
</div>
```
- Submit-Button disabled wenn `!urlConsent`
- Importiere Checkbox + Label aus `@/components/ui/` (suche bestehende Imports)

---

### STEP 8 — COMMIT Phase 2 (Security)
```bash
git add -A
git commit -m "security: Phase 2 — auth, SSRF, DSGVO, Stripe, rate-limit, consent

- TASK-001: requireAuth on all /api/check/* handlers (H-P3-01)
- TASK-002: SSRF allowlist on admin check-foerdermittel (H-P3-03)
- TASK-009: Private-IP block on scrapeCompanyFromUrl
- TASK-003: DSGVO consent split — 2 separate checkboxes (H-P2-01)
- TASK-004: Stripe webhook returns proper 4xx status codes
- TASK-005: Rate-limit /api/auth/refresh (5/min/IP)
- TASK-008: Consent checkbox on URL submission

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### STEP 9 — TASK-010: router.push() in useEffect wrappen

**Dateien:**
- `app/(public)/foerder-schnellcheck/chat/page.tsx`
- `app/(public)/foerder-schnellcheck/ergebnis/page.tsx`
- `app/(public)/foerder-schnellcheck/bericht/page.tsx`

In JEDER dieser Dateien: Finde `router.push()` Aufrufe die DIREKT im Component Body stehen (nicht in useEffect).

- Wrape sie in useEffect:
```tsx
// VORHER (falsch):
if (!sessionId) { router.push('/foerder-schnellcheck'); return null; }

// NACHHER (richtig):
const [shouldRedirect, setShouldRedirect] = useState(false);
useEffect(() => {
  if (!sessionId) { router.push('/foerder-schnellcheck'); setShouldRedirect(true); }
}, [sessionId, router]);
if (shouldRedirect) return null;
```
- Orientiere dich an `app/onboarding/profil/page.tsx` — die machen es bereits richtig

---

### STEP 10 — TASK-011: Alle alert()/confirm() durch shadcn ersetzen

**Dateien (suche nach `alert(` und `confirm(` in app/ und components/):**
- `app/(public)/berater/[id]/page.tsx` — `alert('Ihre Anfrage wurde erfolgreich gesendet!')`
- `app/dashboard/berater/vorlagen/page.tsx` — `confirm('Vorlage wirklich löschen?')`
- `app/admin/users/page.tsx` — `confirm('Diesen Nutzer wirklich deaktivieren?')`
- `components/antraege/DokumenteListe.tsx` — `confirm('Dokument wirklich löschen?')`
- `app/foerdercheck/[sessionId]/ergebnisse/page.tsx` — `alert('PDF-Download wird in Kürze implementiert')`

**Vorgehen:**
1. Erstelle `components/shared/ConfirmDialog.tsx` (wiederverwendbar):
```tsx
'use client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({ trigger, title, description, onConfirm, confirmText = 'Bestätigen', cancelText = 'Abbrechen', variant = 'default' }: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```
2. Ersetze JEDEN `alert()` durch `toast.success()` (importiere aus sonner — suche wie andere Seiten toast nutzen)
3. Ersetze JEDEN `confirm()` durch `<ConfirmDialog>` mit dem passenden Trigger-Button
4. Prüfe ob `@/components/ui/alert-dialog` existiert — wenn nicht, erstelle es (shadcn standard)

---

### STEP 11 — TASK-012: Dead 'Nachricht' Button auf anfragen

**Dateien:** `app/dashboard/unternehmen/anfragen/page.tsx`

Finde den Button ohne onClick.

- Option A (wenn Nachrichten-System existiert): Verlinke zu `/dashboard/berater/nachrichten?anfrageId=${anfrage.id}`
- Option B (wenn kein Nachrichten-System): Mache einen `mailto:` Link mit dem Berater-Email oder zeige Toast "Nachrichtensystem wird implementiert" und disable den Button NICHT (aber mache den Intent klar)

Prüfe ob `/dashboard/berater/nachrichten/page.tsx` existiert und ob es funktioniert.

---

### STEP 12 — TASK-013: h1 auf schnellcheck/chat

**Dateien:** `app/(public)/foerder-schnellcheck/chat/page.tsx`

- Finde die Stelle wo `<h2>` für die aktive Frage steht
- Füge ein `<h1>` hinzu (kann `sr-only` sein wenn es visuell nicht passt):
```tsx
<h1 className="sr-only">Fördercheck — Fragebogen</h1>
```

---

### STEP 13 — TASK-015: ?programm= Query Param lesen

**Dateien:** `app/(public)/foerder-schnellcheck/page.tsx`

- Lese `searchParams.programm` oder `useSearchParams()` (je nach ob Server oder Client Component)
- Wenn `programm` vorhanden: Zeige Info-Banner "Fördercheck für Programm: [Name]" und übergib die ID an den nächsten Step (chat/analyse)
- Speichere in State oder als hidden field

---

### STEP 14 — TASK-018: Branche Taxonomy angleichen

**Dateien:** Suche nach Branche-Listen (grep nach `Handwerk`, `IT & Software`, `Handel`, `branche` in `lib/`, `components/`, `app/onboarding/`)

- Finde ALLE Stellen mit Branche-Auswahl
- Erstelle `lib/constants/branchen.ts` als Single Source of Truth:
```typescript
export const BRANCHEN = [
  'IT & Software',
  'Handwerk',
  'Handel',
  'Dienstleistungen',
  'Produktion & Fertigung',
  'Gesundheit & Pflege',
  'Gastronomie & Hotellerie',
  'Bau & Immobilien',
  'Landwirtschaft',
  'Energie & Umwelt',
  'Sonstige',
] as const;
export type Branche = typeof BRANCHEN[number];
```
- Ersetze ALLE lokalen Branche-Arrays durch Import aus `lib/constants/branchen.ts`
- Prüfe: Onboarding Unternehmen + Onboarding Berater + Berater Profil + Admin nutzen alle dieselbe Liste

---

### STEP 15 — TASK-019: Promise.allSettled in Onboarding

**Dateien:**
- `app/onboarding/expertise/page.tsx`
- `app/onboarding/dienstleistungen/page.tsx`

Finde das Pattern:
```typescript
for (const entry of data.entries) { await addExpertise(entry); }
```

Ersetze durch:
```typescript
const results = await Promise.allSettled(
  data.entries.map(entry => addExpertise(entry))
);
const failed = results.filter(r => r.status === 'rejected');
if (failed.length > 0) {
  toast.error(`${failed.length} von ${data.entries.length} Einträgen konnten nicht gespeichert werden.`);
} else {
  toast.success('Alle Einträge gespeichert!');
  router.push('/onboarding/dienstleistungen'); // oder nächster Step
}
```

Mache das GLEICHE in dienstleistungen/page.tsx.

---

### STEP 16 — TASK-020: Favoriten Delete Bestätigung

**Dateien:** `app/dashboard/unternehmen/favoriten/page.tsx`

Finde den Trash/Delete Button für Favoriten.

- Wrape ihn in `<ConfirmDialog>` (aus STEP 10):
```tsx
<ConfirmDialog
  trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
  title="Favorit entfernen"
  description="Möchten Sie diesen Berater wirklich aus Ihren Favoriten entfernen?"
  onConfirm={() => handleRemove(id)}
  confirmText="Entfernen"
  variant="destructive"
/>
```

---

### STEP 17 — TASK-022: Anfrage Status Coercion fixen

**Dateien:** `lib/api/check.ts` oder `lib/api/fund24.ts` (suche nach `updateAnfrage`)

Finde das Pattern:
```typescript
const mapped = status === 'angenommen' ? 'angenommen' : 'abgelehnt'
```

Ersetze durch explizite Validierung:
```typescript
const VALID_STATUSES = ['angenommen', 'abgelehnt', 'ausstehend'] as const;
type AnfrageStatus = typeof VALID_STATUSES[number];
if (!VALID_STATUSES.includes(status as AnfrageStatus)) {
  throw new Error(`Ungültiger Anfrage-Status: ${status}`);
}
```

---

### STEP 18 — TASK-023: Password Regex vereinheitlichen

**Dateien:**
- `app/(auth)/registrieren/page.tsx`
- `app/(public)/passwort-reset/page.tsx`

- Erstelle `lib/validation/password.ts`:
```typescript
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
export const PASSWORD_ERROR = 'Mindestens 8 Zeichen, Groß-/Kleinbuchstabe, Zahl und Sonderzeichen';
```
- Importiere in BEIDEN Dateien und ersetze die lokalen Regex-Pattern

---

### STEP 19 — COMMIT Phase 3 (Frontend UX) + Push + PR
```bash
git add -A
git commit -m "frontend: Phase 3 — UX fixes, dialogs, routing, validation

- TASK-010: router.push() in useEffect gewrappt (3 Seiten)
- TASK-011: alert()/confirm() durch shadcn ConfirmDialog + toast ersetzt
- TASK-012: Dead Nachricht-Button auf anfragen gefixed
- TASK-013: h1 auf schnellcheck/chat hinzugefügt
- TASK-015: ?programm= Query Param in Schnellcheck gelesen
- TASK-018: Branche Taxonomy in lib/constants/branchen.ts vereinheitlicht
- TASK-019: Promise.allSettled in Onboarding expertise/dienstleistungen
- TASK-020: Favoriten Delete Bestätigung mit ConfirmDialog
- TASK-022: Anfrage Status Coercion durch explizite Validierung ersetzt
- TASK-023: Password Regex in lib/validation/password.ts vereinheitlicht

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin fix/nacht1-security-frontend-ux

gh pr create --base main --title "fix: Nacht 1 — Security Hardening + Frontend UX (Phase 2+3)" --body "$(cat <<'EOF'
## Summary
Implementiert Phase 2 (Security) und Phase 3 (Frontend UX) aus dem Execution Plan.

### Phase 2 — Security (7 Tasks)
- requireAuth auf /api/check/* Endpoints
- SSRF Allowlist + Private-IP-Block
- DSGVO Consent Split (2 separate Checkboxen)
- Stripe Webhook proper Status Codes
- Rate-Limit auf /api/auth/refresh
- Consent Gate auf URL-Eingabe

### Phase 3 — Frontend UX (10 Tasks)
- router.push() in useEffect gewrappt
- alert()/confirm() durch shadcn Dialoge ersetzt
- Nachricht-Button, h1, Query Params fixed
- Branche Taxonomy vereinheitlicht
- Promise.allSettled in Onboarding
- Password Regex vereinheitlicht

## Test plan
- [ ] /api/check/* ohne Auth → 401
- [ ] SSRF: localhost URL in admin → 400
- [ ] /foerder-schnellcheck/bericht: 2 separate Checkboxen
- [ ] Stripe webhook mit falschem Amount → 400 (nicht 200)
- [ ] router.push: keine Hydration Warnings in Console
- [ ] Alle Löschen-Aktionen: Bestätigungsdialog vor Ausführung
- [ ] Onboarding: bei Teilfehler → Toast mit Fehleranzahl

🤖 Generated with Claude Code
EOF
)"
```

**STOP.** Mache NICHTS weiteres. Die Session ist fertig.
