# ANTIGRAVITY NACHT 2 — Navigation + Metadata + Legal Fixes

Du arbeitest im O.A.F24-v2 Repo (fund24.io). Next.js 15 App Router.
Dein Auftrag: Phase 4 (Navigation & Metadata) aus `docs/analysis/EXECUTION_PLAN_2026-04-16.md`.

**WICHTIG:** "Edit automatically" ist AN. Du commitest SELBST. Kein User-Input nötig.

---

## ABLAUF

### STEP 0 — Setup
```bash
git checkout main && git pull origin main
git checkout -b fix/nacht2-navigation-metadata
```

Lies `docs/analysis/EXECUTION_PLAN_2026-04-16.md` und `docs/analysis/full-audit/00_all_findings.json`.

---

### STEP 1 — TASK-024: Nav Links für 8 Orphan Pages

Diese 8 Seiten existieren aber sind von KEINER Navigation erreichbar:

1. `/dashboard/berater/profil` — fehlt in Berater Dashboard Quick Links
2. `/dashboard/berater/tracker` — fehlt in Berater Dashboard
3. `/dashboard/berater/vorlagen` — fehlt in Berater Dashboard
4. `/dashboard/berater/berichte` — fehlt in Berater Dashboard
5. `/dashboard/unternehmen/tracker` — fehlt in Unternehmen Dashboard
6. `/admin/audit-logs` — fehlt in Admin Quick Links
7. `/admin/email-outbox` — fehlt in Admin Quick Links
8. `/antraege/[id]` — keine direkte Verlinkung (nur via Deep Link)

**Dateien:**
- `app/dashboard/berater/page.tsx` — Füge Links zu profil, tracker, vorlagen, berichte hinzu. Suche nach dem quickLinks Array oder der Navigation-Sektion und ergänze:
```typescript
{ label: 'Mein Profil', href: '/dashboard/berater/profil', icon: User },
{ label: 'Tracker', href: '/dashboard/berater/tracker', icon: BarChart3 },
{ label: 'Vorlagen', href: '/dashboard/berater/vorlagen', icon: FileText },
{ label: 'Berichte', href: '/dashboard/berater/berichte', icon: ClipboardList },
```
- `app/dashboard/unternehmen/page.tsx` — Füge Link zu tracker hinzu
- `app/admin/page.tsx` — Füge Links zu audit-logs und email-outbox hinzu:
```typescript
{ label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
{ label: 'Email Outbox', href: '/admin/email-outbox', icon: Mail },
```

Orientiere dich am bestehenden Stil (Icons, Klassen, Struktur) — ändere NICHTS am Design, nur neue Einträge.

---

### STEP 2 — TASK-025: Per-Page Metadata für 54 Seiten

54 von 58 Seiten haben KEINE eigene Metadata. Nur root, /programme, /impressum, /foerder-schnellcheck haben welche.

**Erstelle zuerst** `lib/seo/metadata.ts`:
```typescript
import type { Metadata } from 'next'

const BASE_URL = 'https://fund24.io'
const SITE_NAME = 'fund24'
const DEFAULT_OG_IMAGE = '/og-image.png'

export function createMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string
  description: string
  path: string
  noIndex?: boolean
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`
  const url = `${BASE_URL}${path}`
  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: `${BASE_URL}${DEFAULT_OG_IMAGE}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description },
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
```

**Dann füge zu JEDER Seite `export const metadata` hinzu:**

Öffentliche Seiten (deutsch, SEO-relevant):
| Datei | title | description |
|---|---|---|
| `app/(public)/page.tsx` | `Fördermittel für KMU finden` | `fund24 verbindet kleine und mittlere Unternehmen mit zertifizierten Fördermittelberatern. Über 3.400 Förderprogramme.` |
| `app/(public)/agb/page.tsx` | `AGB` | `Allgemeine Geschäftsbedingungen der fund24 Plattform.` |
| `app/(public)/datenschutz/page.tsx` | `Datenschutzerklärung` | `Datenschutzerklärung der fund24 Plattform gemäß DSGVO.` |
| `app/(public)/support/page.tsx` | `Support` | `Kontaktieren Sie das fund24 Support-Team.` |
| `app/(public)/preise/page.tsx` | `Preise` | `Transparente Preise für Unternehmen und Berater auf fund24.` |
| `app/(public)/aktuelles/page.tsx` | `Aktuelles` | `Neuigkeiten und Updates rund um Fördermittel und fund24.` |
| `app/(public)/berater/page.tsx` | `Berater finden` | `Finden Sie zertifizierte Fördermittelberater in Ihrer Region.` |
| `app/(public)/programme/page.tsx` | BEREITS VORHANDEN — nicht ändern | |

Auth-Seiten (noIndex: true):
| Datei | title |
|---|---|
| `app/(auth)/login/page.tsx` | `Anmelden` |
| `app/(auth)/registrieren/page.tsx` | `Registrieren` |
| `app/(auth)/passwort-vergessen/page.tsx` | `Passwort vergessen` |
| `app/(auth)/verifizieren/page.tsx` | `E-Mail verifizieren` |
| `app/(public)/passwort-reset/page.tsx` | `Passwort zurücksetzen` |

Dashboard-Seiten (noIndex: true, kurze titles):
| Datei | title |
|---|---|
| `app/dashboard/berater/page.tsx` | `Berater Dashboard` |
| `app/dashboard/berater/profil/page.tsx` | `Mein Profil` |
| `app/dashboard/berater/anfragen/page.tsx` | `Anfragen` |
| `app/dashboard/berater/beratungen/page.tsx` | `Beratungen` |
| `app/dashboard/berater/berichte/page.tsx` | `Berichte` |
| `app/dashboard/berater/nachrichten/page.tsx` | `Nachrichten` |
| `app/dashboard/berater/tracker/page.tsx` | `Tracker` |
| `app/dashboard/berater/vorlagen/page.tsx` | `Vorlagen` |
| `app/dashboard/berater/abwicklung/page.tsx` | `Abwicklung` |
| `app/dashboard/unternehmen/page.tsx` | `Unternehmen Dashboard` |
| `app/dashboard/unternehmen/anfragen/page.tsx` | `Meine Anfragen` |
| `app/dashboard/unternehmen/antraege/page.tsx` | `Meine Anträge` |
| `app/dashboard/unternehmen/favoriten/page.tsx` | `Favoriten` |
| `app/dashboard/unternehmen/tracker/page.tsx` | `Förder-Tracker` |

Admin-Seiten (noIndex: true):
| Datei | title |
|---|---|
| `app/admin/page.tsx` | `Admin Dashboard` |
| `app/admin/users/page.tsx` | `Nutzerverwaltung` |
| `app/admin/provisionen/page.tsx` | `Provisionen` |
| `app/admin/aktuelles/page.tsx` | `Aktuelles verwalten` |
| `app/admin/audit-logs/page.tsx` | `Audit Logs` |
| `app/admin/email-outbox/page.tsx` | `Email Outbox` |

Weitere Seiten (noIndex wo authenticated):
| Datei | title |
|---|---|
| `app/onboarding/unternehmen/page.tsx` | `Onboarding — Unternehmen` |
| `app/onboarding/profil/page.tsx` | `Onboarding — Profil` |
| `app/onboarding/expertise/page.tsx` | `Onboarding — Expertise` |
| `app/onboarding/dienstleistungen/page.tsx` | `Onboarding — Dienstleistungen` |
| `app/foerdercheck/page.tsx` | `Fördercheck starten` |
| `app/antraege/[id]/page.tsx` | `Antrag Details` |

Für description bei noIndex-Seiten reicht: `Dieser Bereich ist nur für angemeldete Nutzer zugänglich.`

**MUSTER für jede Datei:**
```typescript
import { createMetadata } from '@/lib/seo/metadata'
export const metadata = createMetadata({
  title: 'Berater Dashboard',
  description: 'Verwalten Sie Ihre Beratungen, Anfragen und Berichte.',
  path: '/dashboard/berater',
  noIndex: true,
})
```

Bei Client Components (`'use client'`): Nutze `generateMetadata` stattdessen oder setze metadata im nächstgelegenen Server-Component Layout. WENN die page.tsx bereits `'use client'` hat, lege die Metadata in der übergeordneten `layout.tsx` ab oder erstelle eine.

---

### STEP 3 — TASK-026: Programm-Anzahl vereinheitlichen

Suche nach hardcodierten Zahlen wie `3.400`, `3400`, `2.500`, `2500` in `app/` und `components/`.

- Erstelle `lib/constants/stats.ts`:
```typescript
export const PROGRAMME_COUNT = '3.400+' // wird perspektivisch dynamisch aus der DB geladen
```
- Ersetze ALLE Vorkommen durch Import

---

### STEP 4 — TASK-027: Typos & Denglisch fixen

Die folgenden Typos wurden im Audit gefunden. Suche sie per grep und fixe sie:

| Falsch | Richtig |
|---|---|
| `Konteniverwaltung` | `Kontenverwaltung` |
| `behhalten` | `behalten` |
| `behaften` | `behaftet` |
| `Zahlte Provisionen` | `Gezahlte Provisionen` |
| `Förderbereichcen` | `Förderbereichen` |
| `aller Ihre Anfragen` | `all Ihre Anfragen` oder `alle Ihre Anfragen` |
| `Was passiert nächster?` | `Was passiert als Nächstes?` |
| `KI matched Sie` | `KI matcht Sie` oder `Die KI findet passende Berater` |
| `Newsletters` | `Newsletter` |

Mache für jedes ein `grep -r "TYPO" app/ components/ lib/` und ersetze.

---

### STEP 5 — TASK-029: Legal Pages fixen

**Dateien:**
- `app/(public)/impressum/page.tsx`
- `app/(public)/datenschutz/page.tsx`
- `app/(public)/agb/page.tsx`

Fixes:
1. **Impressum:** Ändere `§ 5 Telemediengesetz (TMG)` → `§ 5 Digitale-Dienste-Gesetz (DDG)` (TMG wurde 2024 durch DDG ersetzt)
2. **Datenschutz:** Ändere die Aufsichtsbehörde von `Berliner Beauftragte für Datenschutz` → `Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach` (Firma sitzt in Kronach, Bayern)
3. **Alle drei:** Finde `new Date().toLocaleDateString()` und ersetze durch festes Datum:
```typescript
const LETZTE_AKTUALISIERUNG = '16. April 2026'
```
4. **AGB + Datenschutz:** Entferne die TODO-Banner am Ende (`zu Demonstrationszwecken erstellt — bitte anwaltlich überarbeiten`). Ersetze durch nichts (einfach löschen).
5. **Support Email:** Suche nach `info@fund24.io` UND `support@fund24.io` — vereinheitliche zu `support@fund24.io` überall

---

### STEP 6 — TASK-028: /passwort-reset nach (auth) verschieben

**ACHTUNG:** Dieser Step ist OPTIONAL. Nur machen wenn es einfach geht (keine Breaking Changes).

- Verschiebe `app/(public)/passwort-reset/` → `app/(auth)/passwort-reset/`
- `app/(auth)/layout.tsx` muss die Seite OHNE Auth-Redirect rendern (passwort-reset ist unauthenticated!)
- Prüfe ob die (auth) Layout-Gruppe einen Auth-Check hat der blocken würde
- Wenn ja: NICHT verschieben, stattdessen einen Kommentar hinterlassen

---

### STEP 7 — TASK-030: global-error.tsx reset()

**Dateien:** `app/global-error.tsx`

- Füge `reset()` Button hinzu:
```tsx
'use client'
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html><body>
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
          <p className="text-muted-foreground">Fehler-ID: {error.digest || 'unbekannt'}</p>
          <button onClick={reset} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Erneut versuchen
          </button>
        </div>
      </div>
    </body></html>
  )
}
```

---

### STEP 8 — TASK-032: Cookie Name Mismatch fixen

**Dateien:** `lib/api/auth.ts` (oder wo logout definiert ist)

Suche nach `document.cookie = 'fund24-auth` — das ist der FALSCHE Cookie-Name.
Der richtige HttpOnly Cookie heißt `fund24-token` (gesetzt via `/api/session`).

- Client-Side Cookie Clear ist ohnehin wirkungslos bei HttpOnly Cookies
- Ändere logout() so dass es `POST /api/session` mit `{ action: 'logout' }` aufruft (oder `DELETE /api/session`)
- Wenn /api/session keinen logout-Endpoint hat: Erstelle einen der den HttpOnly Cookie löscht:
```typescript
// app/api/session/route.ts — DELETE handler
export async function DELETE() {
  return new Response(null, {
    status: 200,
    headers: { 'Set-Cookie': 'fund24-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' },
  })
}
```

---

### STEP 9 — TASK-033: JWT_SECRET in .env.example

**Dateien:** `.env.example`

Füge unter dem Frontend-Abschnitt hinzu:
```env
# Required for middleware JWT verification (Vercel)
JWT_SECRET=your-jwt-secret-min-32-chars
```

---

### STEP 10 — COMMIT + Push + PR
```bash
git add -A
git commit -m "meta: Phase 4 — Navigation, Metadata, Legal, Typos

- TASK-024: Nav links für 8 orphan pages (berater profil/tracker/vorlagen/berichte, unternehmen tracker, admin audit-logs/email-outbox)
- TASK-025: Per-page metadata für 54 Seiten via createMetadata()
- TASK-026: Programm-Anzahl in lib/constants/stats.ts vereinheitlicht
- TASK-027: 9 Typos/Denglisch gefixt
- TASK-028: /passwort-reset → (auth) Gruppe (wenn möglich)
- TASK-029: Legal pages — DDG, BayLDA, festes Datum, TODO-Banner entfernt
- TASK-030: global-error.tsx reset() + Fehler-ID
- TASK-032: Cookie Name Mismatch — logout ruft DELETE /api/session
- TASK-033: JWT_SECRET in .env.example

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin fix/nacht2-navigation-metadata

gh pr create --base main --title "meta: Nacht 2 — Navigation, Metadata, Legal (Phase 4)" --body "$(cat <<'EOF'
## Summary
Implementiert Phase 4 aus dem Execution Plan.

### Highlights
- **54 Seiten** haben jetzt eigene SEO Metadata (title, description, OG tags)
- **8 Orphan Pages** sind jetzt über Navigation erreichbar
- **Legal Compliance:** DDG statt TMG, BayLDA statt Berlin, feste Datumsangaben
- **9 Typos** gefixt (Konteniverwaltung, behhalten, etc.)
- **Logout** ruft jetzt korrekt DELETE /api/session (HttpOnly Cookie)

## Test plan
- [ ] Jede Seite hat eigenen <title> (nicht nur "fund24")
- [ ] OG Tags: URL-Preview zeigt korrekte Titel + Descriptions
- [ ] Berater Dashboard: Links zu Profil, Tracker, Vorlagen, Berichte sichtbar
- [ ] Admin: Links zu Audit Logs + Email Outbox sichtbar
- [ ] /impressum: "DDG" statt "TMG"
- [ ] /datenschutz: BayLDA Ansbach, nicht Berlin
- [ ] /agb: kein TODO-Banner mehr
- [ ] Logout: Cookie wird korrekt gelöscht (kein fund24-auth Zombie)
- [ ] .env.example enthält JWT_SECRET

🤖 Generated with Claude Code
EOF
)"
```

**STOP.** Session fertig.
