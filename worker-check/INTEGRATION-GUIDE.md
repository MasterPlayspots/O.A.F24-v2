# ZFBF.info — Integration Guide
## Frontend (v0.dev/Next.js) ↔ Backend (Cloudflare Workers)

**Stand: 02.03.2026**

---

## Quick Start (5 Minuten)

### 1. Env-Variablen setzen
```bash
# .env.local
NEXT_PUBLIC_WORKER_URL=https://bafa-creator-ai-worker.<subdomain>.workers.dev
NEXT_PUBLIC_CHECK_API_URL=https://foerdermittel-check-api.<subdomain>.workers.dev
NEXT_PUBLIC_FUND24_API_URL=https://fund24-api.<subdomain>.workers.dev
```

### 2. Files kopieren
```
frontend/api-config.ts       → lib/api-config.ts
frontend/proxy-to-worker.ts  → lib/proxy-to-worker.ts  (ersetzt existierende)
frontend/api-client.ts       → lib/api-client.ts
frontend/use-foerderprogramme.tsx → hooks/use-foerderprogramme.tsx
```

### 3. Catch-All API Route erstellen
Datei `app/api/[...slug]/route.ts` erstellen (siehe api-routes-setup.ts, Option A).

---

## Route Mapping: Frontend → Worker

| Frontend-Pfad | Worker-Pfad | Worker |
|---|---|---|
| `/api/auth/session` | `/api/auth/me` | bafa-creator-ai |
| `/api/bafa/generate` | `/api/reports/generate` | bafa-creator-ai |
| `/api/bafa/reports` | `/api/reports/` | bafa-creator-ai |
| `/api/bafa/checkout` | `/api/payments/stripe/create-session` | bafa-creator-ai |
| `/api/bafa/paypal-success` | `/api/payments/paypal/capture-order` | bafa-creator-ai |
| `/api/bafa/unlock` | `/api/reports/unlock` | bafa-creator-ai |
| `/api/user/profile` | `/api/auth/me` | bafa-creator-ai |
| `/api/foerderprogramme` | `/api/programmes` | fund24-api |
| `/api/checks/*` | `/api/checks/*` | foerdermittel-check |

Alle anderen `/api/auth/*`, `/api/branchen/*`, `/api/promo/*` Pfade stimmen 1:1 überein.

---

## Migration: Mock → Live (Schritt für Schritt)

### Phase 1: Förderprogramme (Sofort)
**Vorher:** 12 hardcoded Programme in `lib/foerderprogramme-data.ts`
**Nachher:** 2.467 Programme aus fund24-api

```tsx
// VORHER:
import { FOERDERPROGRAMME } from "@/lib/foerderprogramme-data";
export default function Page() {
  return <ProgrammList items={FOERDERPROGRAMME} />;
}

// NACHHER:
import { useFoerderprogramme } from "@/hooks/use-foerderprogramme";
export default function Page() {
  const { programme, loading, setSearch, setFilter } = useFoerderprogramme();
  if (loading) return <Skeleton />;
  return <ProgrammList items={programme} onSearch={setSearch} onFilter={setFilter} />;
}
```

Betroffene Seiten: `/foerdermittel/programme`, `/dashboard/foerdermittel`, `/antrag/[programmId]`

### Phase 2: Auth (Woche 1)
**Vorher:** localStorage-basierter AuthContext
**Nachher:** Server-validierte Sessions

```tsx
// VORHER (lib/context/auth-context.tsx):
const user = JSON.parse(localStorage.getItem("zfbf_user") || "null");

// NACHHER:
import { useAuth } from "@/hooks/use-foerderprogramme";
const { user, isAuthenticated, login, logout } = useAuth();
```

### Phase 3: Berater/Netzwerk (Woche 2)
**Vorher:** 6 Mock-Profile in `lib/berater-data.ts`
**Nachher:** Echte Profile aus DB

```tsx
// VORHER:
import { MOCK_BERATER } from "@/lib/berater-data";

// NACHHER:
import { useBerater } from "@/hooks/use-foerderprogramme";
const { berater, loading } = useBerater({ region: "Bayern" });
```

### Phase 4: Dashboard-Daten (Woche 3-4)
Alle inline Mock-Daten in Dashboard-Pages durch API-Calls ersetzen:
- `/dashboard` Stats → `api.dashboard.stats()`
- `/dashboard/berichte` → `api.reports.list()`
- `/dashboard/kunden` → `api.dashboard.kunden.list()`
- `/dashboard/forum` → `api.forum.list()`

---

## Fördermittel-Check Worker deployen

```bash
cd foerdermittel-check-api/

# 1. Dependencies
npm install

# 2. Secrets setzen
wrangler secret put JWT_SECRET        # Gleicher Key wie bafa-creator-ai-worker
wrangler secret put EXTERNAL_AI_KEY   # OpenAI oder Anthropic API Key
wrangler secret put EXTERNAL_AI_PROVIDER  # "openai" oder "anthropic"

# 3. Deployen
wrangler deploy

# 4. Testen
curl https://foerdermittel-check-api.<subdomain>.workers.dev/api/checks \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"vorhaben":"digitalisierung","bundesland":"Bayern"}'
```

---

## Worker-Status prüfen

```bash
# Alle Worker auflisten
curl https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/scripts \
  -H "Authorization: Bearer <API_TOKEN>"

# Health Check
curl https://bafa-creator-ai-worker.<subdomain>.workers.dev/health
curl https://fund24-api.<subdomain>.workers.dev/api/stats
```

---

## Bekannte Probleme

1. **Report-Persistenz:** `/api/generate` erstellt Reports aber speichert sie nicht in der DB → Fix im Worker nötig
2. **3 User-Tabellen:** foerderprogramme.users, bafa_antraege.users, zfbf-db.users → Konsolidierung planen
3. **bafa-creator-ai-worker 655KB:** Monolith → Langfristig aufteilen
4. **i18n:** Nur Homepage + Nav übersetzt, 45 Seiten noch auf Deutsch hardcoded
