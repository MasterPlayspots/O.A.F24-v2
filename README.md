# fund24 — Frontend (Next.js 15)

Web-Frontend der fund24-Plattform: KI-gestützter Fördermittel-Check für deutsche Unternehmen, Berater-Marktplatz und Vorgangs-Tracker.

## Architektur

```
fund24 (dieses Repo, Next.js 15 / App Router)
   │
   ├──> foerdermittel-check-api    (Cloudflare Worker · Auth, Checks, Anfragen, Tracker, Berater, Admin, News)
   ├──> fund24-api                  (Cloudflare Worker · Förderprogramm-Katalog, Filter, Stats)
   ├──> fund24-semantic-search      (Cloudflare Worker · Embedding-Suche)
   └──> zfbf-api                    (Cloudflare Worker · ZFBF-Daten)
```

Backend liegt in separaten Cloudflare-Worker-Repos. Daten in Cloudflare D1.

## Setup

```bash
git clone https://github.com/MasterPlayspots/O.A.F24-v2 fund24
cd fund24
npm install
cp .env.example .env.local   # Worker-URLs eintragen
npm run dev
```

App läuft auf <http://localhost:3000>.

## Environment Variables

Siehe `.env.example`. In **Vercel** müssen folgende Variablen für die Production-Umgebung gesetzt sein:

| Variable | Zweck |
|---|---|
| `NEXT_PUBLIC_CHECK_API_URL` | foerdermittel-check-api Worker |
| `NEXT_PUBLIC_FUND24_API_URL` | fund24-api Worker |
| `NEXT_PUBLIC_SEMANTIC_API_URL` | fund24-semantic-search Worker |
| `NEXT_PUBLIC_ZFBF_API_URL` | zfbf-api Worker |
| `JWT_SECRET` *(server-only!)* | Muss mit dem Secret des check-api Workers übereinstimmen — wird von der Next.js-Middleware zur Token-Verifikation genutzt |

## Skripte

| Befehl | Aktion |
|---|---|
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` | Production-Build |
| `npm run start` | Start des Production-Builds |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ohne Emit |
| `npm run docs:api` | Regeneriert `docs/API.md` aus `worker/src/routes/` |

## Documentation

- [`docs/API.md`](docs/API.md) — Auto-generierte API-Referenz (143 Endpoints, 23 Groups). CI blockiert Merges, wenn diese Datei out-of-sync ist.
- [`docs/MIGRATIONS.md`](docs/MIGRATIONS.md) — D1-Migrationen + Rollback-Konventionen.
- [`docs/FIX_LOG.md`](docs/FIX_LOG.md) — Chronologisches Log der Audit-Findings und deren Behebung.
- [`docs/BACKEND_WIRING_MAP.md`](docs/BACKEND_WIRING_MAP.md) — Frontend↔Worker Verbindungs-Matrix.
- `ECOSYSTEM.md` — *Deprecated*. Historischer Architektur-Snapshot; API-Details siehe `docs/API.md`.

## Auth-Flow

1. Login-/Register-Form ruft den Worker auf und erhält ein JWT.
2. Frontend sendet das JWT an `POST /api/session` (Next.js Route Handler).
3. Route Handler setzt das Token als **HttpOnly-Cookie** `fund24-token` (SameSite=Lax, Secure in Production).
4. Die Next.js-Middleware liest das Cookie auf jeder geschützten Route, verifiziert die Signatur (`jose.jwtVerify` gegen `JWT_SECRET`) und prüft für `/admin` zusätzlich `role=admin`.
5. Logout ruft `DELETE /api/session` auf, das das Cookie löscht.

## Verzeichnisstruktur

```
app/
  (auth)/        Login, Register, Verify, Passwort-Reset
  (public)/      Landing, Programme, Berater, News, Legal, Pricing, Schnellcheck
  admin/         Admin-Dashboard (role=admin)
  dashboard/     Dashboards für unternehmen + berater
  foerdercheck/  Vollständiger Fördercheck-Flow
  onboarding/    Berater-Onboarding
  api/session/   HttpOnly-Cookie-Set/Delete
components/      shadcn/ui + Domain-Komponenten
lib/
  api/           Worker-Clients (auth, check, fund24, precheck)
  store/         Zustand-Stores
  types.ts       Domain-Typen
middleware.ts    JWT-Middleware
```

## Deployment

Auto-Deploy via Vercel bei Push auf `main`. Siehe `DEPLOY.md` für Erst-Setup (Env-Vars, Worker-Secrets, JWT-Rotation).
