# fund24 — Master Deploy Guide

## Status-Übersicht

| Komponente | Status | Details |
|---|---|---|
| Next.js Frontend | Gebaut (46 Routes) | Lokal kompiliert, 0 TypeScript-Fehler |
| D1 Schema v2 | Migriert | `password_reset_tokens` + `schema_migrations` angelegt |
| Vercel Projekt | Existiert | `fund24` auf Team MuseAi |
| Cloudflare Workers | 4x Live | check-api, fund24-api, semantic-search, zfbf-api |

---

## Schritt 1: Vercel Environment Variables setzen

Gehe zu: **Vercel Dashboard → fund24 → Settings → Environment Variables**

Oder per CLI (im fund24-Ordner):

```bash
# Vercel CLI installieren (falls nötig)
npm i -g vercel

# Mit Vercel verknüpfen
vercel link

# Environment Variables setzen (Production + Preview + Development)
vercel env add NEXT_PUBLIC_CHECK_API_URL production preview development
# Wert: https://foerdermittel-check-api.froeba-kevin.workers.dev

vercel env add NEXT_PUBLIC_FUND24_API_URL production preview development
# Wert: https://fund24-api.froeba-kevin.workers.dev

vercel env add NEXT_PUBLIC_APP_URL production preview development
# Wert: https://fund24-team-muse-ai.vercel.app
```

**Alle 3 Variablen im Überblick:**

| Variable | Wert |
|---|---|
| `NEXT_PUBLIC_CHECK_API_URL` | `https://foerdermittel-check-api.froeba-kevin.workers.dev` |
| `NEXT_PUBLIC_FUND24_API_URL` | `https://fund24-api.froeba-kevin.workers.dev` |
| `NEXT_PUBLIC_APP_URL` | `https://fund24-team-muse-ai.vercel.app` |

---

## Schritt 2: Deploy auf Vercel

### Option A: Git Push (empfohlen)

```bash
# Im fund24 Ordner
cd fund24

# GitHub Repo erstellen (falls noch nicht vorhanden)
gh repo create fund24 --private --source=. --push

# Vercel wird automatisch bei jedem Push deployen
```

### Option B: Vercel CLI Deploy

```bash
cd fund24

# Production Deploy
vercel --prod
```

---

## Schritt 3: Cloudflare Worker Secrets setzen

Diese Secrets müssen auf dem Worker `foerdermittel-check-api` gesetzt werden.

```bash
# Wrangler CLI installieren (falls nötig)
npm i -g wrangler

# Login bei Cloudflare
wrangler login

# JWT Secret setzen (bereits generiert)
echo "<REDACTED-ROTATED-2026-04-07>" | wrangler secret put JWT_SECRET --name foerdermittel-check-api

# Anthropic API Key setzen (NEUEN Key verwenden — siehe Schritt 5!)
echo "DEIN_NEUER_API_KEY" | wrangler secret put ANTHROPIC_API_KEY --name foerdermittel-check-api

# Resend API Key (nach Schritt 4)
echo "DEIN_RESEND_KEY" | wrangler secret put RESEND_API_KEY --name foerdermittel-check-api
echo "noreply@fund24.io" | wrangler secret put RESEND_FROM_EMAIL --name foerdermittel-check-api
```

**Worker Secrets Übersicht:**

| Secret | Worker | Status |
|---|---|---|
| `JWT_SECRET` | foerdermittel-check-api | Bereit: `<REDACTED>` |
| `ANTHROPIC_API_KEY` | foerdermittel-check-api | NEUEN Key erstellen (alter ist kompromittiert!) |
| `RESEND_API_KEY` | foerdermittel-check-api | Noch einzurichten (Schritt 4) |
| `RESEND_FROM_EMAIL` | foerdermittel-check-api | Noch einzurichten (Schritt 4) |

---

## Schritt 4: Resend einrichten (E-Mail-Versand)

Resend wird benötigt für: Verifizierungs-E-Mails, Passwort-Reset, Benachrichtigungen.

1. **Account erstellen**: https://resend.com/signup
2. **Domain verifizieren**:
   - Gehe zu Resend Dashboard → Domains → Add Domain
   - Gib `fund24.io` ein (oder deine Domain)
   - Füge die angezeigten DNS-Records (SPF, DKIM, DMARC) bei deinem DNS-Provider hinzu
   - Warte auf Verifizierung (meist 5-30 Minuten)
3. **API Key generieren**:
   - Resend Dashboard → API Keys → Create API Key
   - Name: `fund24-production`
   - Permission: `Full Access`
   - Kopiere den Key (wird nur einmal angezeigt!)
4. **Secret setzen** (wie in Schritt 3 beschrieben):
   ```bash
   echo "re_DEIN_RESEND_KEY" | wrangler secret put RESEND_API_KEY --name foerdermittel-check-api
   echo "noreply@fund24.io" | wrangler secret put RESEND_FROM_EMAIL --name foerdermittel-check-api
   ```

---

## Schritt 5: Anthropic API Key rotieren

**Der in der Chat-Sitzung geteilte API Key (`sk-ant-api03-FAOM...`) ist kompromittiert und MUSS sofort rotiert werden.**

1. Gehe zu: https://console.anthropic.com/settings/keys
2. **Lösche** den alten Key (`sk-ant-api03-FAOM...`)
3. **Erstelle** einen neuen Key
4. Setze den neuen Key als Worker Secret:
   ```bash
   echo "sk-ant-api03-NEUER_KEY_HIER" | wrangler secret put ANTHROPIC_API_KEY --name foerdermittel-check-api
   ```

---

## Post-Deploy Checkliste

Nach dem Deployment diese Punkte prüfen:

- [ ] Startseite laden: `https://fund24-team-muse-ai.vercel.app`
- [ ] Programme-Seite: `/programme` — zeigt Förderprogramme aus der DB?
- [ ] Registrierung: `/registrieren` — Formular absenden, Verifizierungs-Mail kommt an?
- [ ] Login: `/login` — JWT wird gesetzt, Redirect zum Dashboard?
- [ ] Fördercheck: `/foerdercheck` — Angaben-Formular → Chat → Analyse?
- [ ] Berater-Verzeichnis: `/berater` — Liste wird geladen?
- [ ] Admin-Panel: `/admin` — nur für Admin-Rolle sichtbar?
- [ ] Mobile: Hamburger-Menü funktioniert?

---

## Infrastruktur-Übersicht

```
┌─────────────────────────────────────────────────┐
│                    Vercel                         │
│          fund24 (Next.js 15 Frontend)            │
│     https://fund24-team-muse-ai.vercel.app       │
└─────────────┬──────────────┬────────────────────┘
              │              │
    ┌─────────▼──────┐  ┌───▼──────────────────┐
    │  CF Worker      │  │  CF Worker            │
    │  check-api      │  │  fund24-api           │
    │  (Auth, Check,  │  │  (Förderprogramme)    │
    │   Matching)     │  │                       │
    └────────┬───────┘  └───┬──────────────────┘
             │              │
    ┌────────▼───────┐  ┌───▼──────────────────┐
    │  D1 Database    │  │  D1 Database          │
    │  foerdermittel- │  │  foerderprogramme     │
    │  checks         │  │                       │
    └────────────────┘  └──────────────────────┘

    ┌─────────────────┐  ┌─────────────────────┐
    │  CF Worker       │  │  CF Worker           │
    │  semantic-search │  │  zfbf-api            │
    └─────────────────┘  └─────────────────────┘
```

**Cloudflare Account**: `d7bdc9212bc6f429a5f2eb82853a9e83`
**Vercel Team**: MuseAi (`team_33RfPgPlk2sfQRPV7exEafNj`)
**Vercel Project**: fund24 (`prj_cBF6Mr2U3bClGc4MKyrUhN33TfLw`)

---

## Schnell-Referenz: Alle Credentials

| Was | Wo | Status |
|---|---|---|
| Vercel Env Vars (5x) | Vercel Dashboard | Noch zu setzen |
| JWT_SECRET | CF Worker Secret | `<REDACTED>` — bereit |
| ANTHROPIC_API_KEY | CF Worker Secret | NEUEN Key erstellen! |
| RESEND_API_KEY | CF Worker Secret | Resend Account nötig |
| RESEND_FROM_EMAIL | CF Worker Secret | Nach Domain-Verifizierung |
| D1: foerdermittel-checks | Cloudflare | `0b2479a3-13eb-45bc-8c71-105208ed71ad` |
| D1: foerderprogramme | Cloudflare | `b95adb7b-ed86-441b-841e-4cd3a9a15135` |
