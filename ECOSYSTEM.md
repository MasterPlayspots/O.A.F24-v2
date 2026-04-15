# FUND24 — Vollständiges Ökosystem End-to-End

> **⚠️ DEPRECATED (2026-04-15)** — Die autoritative API-Referenz ist jetzt
> [`docs/API.md`](./docs/API.md) (auto-generiert aus `worker/src/routes/`).
> Der Datenbank-Workflow + Rollback-Konventionen stehen in
> [`docs/MIGRATIONS.md`](./docs/MIGRATIONS.md).
>
> Dieses Dokument bleibt als historischer Architektur-Snapshot erhalten, die
> Endpoint-Listen sind aber **potentiell falsch**:
> - `/api/bafa`, `/api/forum/*`, `/api/auth/webauthn/*`, `/api/auth/magic-link/*`
>   wurden in Phase C entfernt (Commit `18e4a54`).
> - `/api/antraege/*`, `/api/me/dashboard`, `/api/news/*`, `/api/tracker/*`,
>   `/api/berater/provision-vertraege`, `/api/oa/*`, Onboarding-Cron wurden
>   hinzugefügt und sind hier **nicht** aufgeführt.

Stand: 2026-04-08 · Worker `bafa-creator-ai-worker` v45e66295 · Frontend `O.A.F24-v2` @ `b57387a`

Dieses Dokument beschreibt das komplette fund24-Ökosystem von der untersten Cloudflare-Ressource bis zur höchsten Frontend-Page in beide Richtungen.

---

## TEIL A · Cloudflare-Infrastruktur (Stand live)

### A.1 Account
- ID `d7bdc9212bc6f429a5f2eb82853a9e83`
- Inhaber froeba.kevin@gmail.com

### A.2 Workers (15 deployed)

| Worker | Zweck | fund24-Relevanz |
|---|---|---|
| `bafa-creator-ai-worker` | Haupt-API api.fund24.io (Hono, JWT, persona-routing) | **CORE** |
| `bafa-creator-ai-worker-preview` | Preview-Stage | core preview |
| `fund24-semantic-search` | Vektor/Embeddings für Programm-Suche | optional |
| `fund24-enrichment-worker` | Lead-Enrichment Apify-Bridge | optional |
| `bafa-report-generator` | Standalone PDF-Generator | legacy |
| `foerdermittel-check-api` | öffentlicher Schnellcheck | legacy |
| `foerdermittel-analyse-api` / `foerdermittel-antrag-api` | Schnellcheck-Phasen | legacy |
| `bafa-dienstleister-api` | Berater-Verzeichnis | legacy |
| `cta-oa-api`, `wlw-proxy`, `task-router`, `cf-ai-workspace`, `secondbrain-growth`, `zfbf-api` | Andere Projekte | nicht fund24 |

→ Für fund24 Production zählt **nur `bafa-creator-ai-worker`**. Alle neuen Pfade liegen darin.

**Routing (Zone fund24.io = `809ef77b10e4c17bf959cfe7aadf9e28`):**

| Pattern | Worker |
|---|---|
| `api.fund24.io/api/*` | `bafa-creator-ai-worker` (Route-ID `9f85bd2b6fa64d69b08254278c03566b`, gesetzt 2026-04-08) |
| `api.fund24.io/semantic/*` | `fund24-semantic-search` (legacy) |
| `api.fund24.io/check/*` | `foerdermittel-check-api` (legacy) |

Es gibt **keinen** Catch-all `api.fund24.io/*`. Alles außerhalb der drei Patterns gibt Cloudflare 1002 zurück.

### A.3 D1-Datenbanken (10 total, 3 fund24-relevant)

| DB | UUID | Größe | Zweck |
|---|---|---|---|
| **`zfbf-db`** (DB) | 9a41ed93-e2a4-440d-8ef1-a3e63cb0c6e3 | neu | Ownership-Layer für reports, kontingent, gdpr, audit (re-created 2026-04-08, alte UUID war stale) |
| **`bafa_antraege`** (BAFA_DB) | 8582e9dd-8063-4dbd-b079-f38b2bb3918f | 1.35 MB | **Haupt-Userdata: users, unternehmen, antraege_v2, reports, bafa_beratungen, …** |
| **`foerderprogramme`** (FOERDER_DB) | b95adb7b-ed86-441b-841e-4cd3a9a15135 | 79.2 MB | 3884 Förderprogramme (Bund/Land/EU) + Quellen |
| **`bafa_learnings`** (BAFA_CONTENT) | 7f5947f7-42af-455e-81ad-0c57be23b940 | 224 KB | KI-Lernzyklen, Prompts, Wording-Regeln |
| `bafa_branchen` | f7593090-e6d0-4777-8c3c-78a6a0c7c535 | 200 KB | Branchen-Stammdaten (read-only) |
| `foerdermittel-checks` | 0b2479a3-13eb-45bc-8c71-105208ed71ad | 216 KB | legacy Schnellcheck-Sessions |

### A.4 KV-Namespaces (20, davon 3 fund24)

| Name | ID | Zweck |
|---|---|---|
| **`FUND24_SESSIONS`** | b34b9feea93e41b5984462c4f3536aa9 | Session-Token / Refresh-Tokens |
| **`FUND24_RATE_LIMITS`** | 36120d39598540fd93760fee23ed3c99 | Per-IP/Per-User Rate-Limit-Buckets |
| **`FUND24_WEBHOOK_EVENTS`** | 9b5e027f595d489c821460d9f7012aa4 | Stripe/Resend Event-Idempotenz |

### A.5 R2-Buckets (8, davon 2 fund24)

| Bucket | Zweck |
|---|---|
| **`fund24-dokumente`** | Alle Userfiles (Antrags-Anlagen, BAFA-Berichte, Bescheide) |
| **`bafa-reports`** | Generierte PDF-Berichte (γ-Hybrid Output) |

### A.6 Workers AI Bindings
- `@cf/meta/llama-3.1-8b-instruct` (BAFA-Bericht-Generierung)
- `@cf/baai/bge-base-en-v1.5` (Embeddings)

---

## TEIL B · Datenmodell (BAFA_DB Tabellen-Übersicht)

### B.1 Identity & Account
| Tabelle | Rows | Zweck |
|---|---|---|
| `users` | 24 | id, email, password_hash, salt, persona, unternehmen_id, role, bafa_certified, bafa_cert_status, onboarding_step |
| `email_verification_codes` | — | user_id, code, type, expires_at |
| `refresh_tokens` | — | user_id, token_hash, expires_at, revoked |
| `audit_logs` | 4 | user_id, event_type, detail, ip |

### B.2 Unternehmen-Domäne
| Tabelle | Rows | Zweck |
|---|---|---|
| `unternehmen` | 0 | firmenname, rechtsform, branche, mitarbeiter_anzahl, jahresumsatz, ist_kmu |
| `me_favoriten` | 0 | user_id, programm_id |
| `tracker_vorgaenge` | 7 | user_id, antrag_id, titel, phase, naechste_frist, prioritaet |
| `tracker_aktivitaeten` | — | vorgang_id, typ, alte_phase, neue_phase |
| `tracker_benachrichtigungen` | — | user_id, vorgang_id, typ, gesendet |

### B.3 BAFA-Antragswelt
| Tabelle | Rows | Zweck |
|---|---|---|
| `antraege_v2` | 0 | user_id, programm_id, status (entwurf/eingereicht/bewilligt/abgelehnt), foerdersumme_beantragt |
| `antrag_zugriff` | 0 | antrag_id, user_id, berater_id, rolle (owner/editor/viewer) |
| `bafa_beratungen` | 0 | berater_id, unternehmen_id, phase, bafa_antrag_nr |
| `reports` | 0 | user_id, status (draft/preview/paid/downloaded), content, quality_score, finalized_by_berater_id |

### B.4 Berater-Domäne
| Tabelle | Rows | Zweck |
|---|---|---|
| `berater_profiles` | 0 | user_id, display_name, bio, branchen, rating_avg, verfuegbar |
| `berater_dienstleistungen` | — | titel, kategorie, preis_von/bis, bafa_required |
| `berater_foerder_expertise` | — | foerderbereich, erfolgreiche_antraege, gesamtvolumen_eur |
| `berater_zuweisungen` | — | session_id, berater_id, matching_score, status |

### B.5 Förderprogramme (FOERDER_DB)
- `foerderprogramme` — 3884 Rows (Bund/Land/EU)
- `foerderprogramme_details`, `foerderprogramme_quellen`, `foerderprogramme_stats`
- `eu_foerderprogramme`, `laender_rechtsrahmen`
- `chat_sessions`, `chat_messages`

### B.6 Billing & Misc
- `pakete`, `orders`, `promo_codes`, `provisionen`
- `forum_threads`, `forum_antworten`
- `notifications`, `email_outbox`
- `download_tokens`, `dokument_versionen`

---

## TEIL C · API-Layer (46 Routen, bafa-creator-ai-worker)

Base: `https://api.fund24.io` · Auth: JWT Bearer

### C.1 Public (kein JWT)
| Method | Pfad |
|---|---|
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/refresh` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/verify-email` |
| POST | `/api/auth/reset-request` |
| POST | `/api/auth/reset-confirm` |
| GET | `/api/foerderprogramme/search` |
| GET | `/api/foerderprogramme/:id` |
| GET | `/api/berater` |
| GET | `/api/berater/:id` |
| GET | `/api/news` |
| GET | `/api/news/:slug` |
| GET | `/api/health` |
| GET | `/api/version` |

### C.2 Identity (JWT required)
| Method | Pfad |
|---|---|
| GET/PATCH | `/api/me` |
| GET | `/api/me/dashboard` |
| GET | `/api/me/notifications` |
| POST | `/api/me/notifications/:id/read` |
| POST | `/api/me/notifications/read-all` |
| GET | `/api/me/favoriten` |
| POST | `/api/me/favoriten/:programmId` |
| DELETE | `/api/me/favoriten/:programmId` |

### C.3 Unternehmen
| Method | Pfad |
|---|---|
| GET/PUT | `/api/me/unternehmen` |
| GET/POST | `/api/me/antraege` |
| GET | `/api/antraege/:id` |
| PATCH | `/api/antraege/:id` |
| DELETE | `/api/antraege/:id` |
| GET/POST | `/api/antraege/:id/zugriff` |
| DELETE | `/api/antraege/:id/zugriff/:zugriffId` |
| GET | `/api/tracker/:antragId` |
| POST | `/api/tracker/:antragId/event` |

### C.4 Berater
| Method | Pfad |
|---|---|
| GET | `/api/berater/me` |
| GET | `/api/berater/me/kunden` |
| GET | `/api/berater/mandate` |
| GET/POST | `/api/berater/beratungen` |
| PATCH | `/api/beratungen/:id` |
| POST | `/api/berater/bafa-cert` |

### C.5 Berichte (γ-Hybrid)
| Method | Pfad |
|---|---|
| POST | `/api/berichte` |
| PATCH | `/api/berichte/:id` |
| PATCH | `/api/berichte/:id/finalize` |

### C.6 Dokumente
| Method | Pfad |
|---|---|
| POST | `/api/dokumente/upload-url` |
| PUT | `/api/dokumente/:id/raw` |
| GET | `/api/dokumente/:id/download` |
| DELETE | `/api/dokumente/:id` |

### C.7 KI & Templates
| Method | Pfad |
|---|---|
| POST | `/api/ki/chat` |
| GET | `/api/ki/historie` |
| GET/POST | `/api/vorlagen` |

### C.8 Admin
| Method | Pfad |
|---|---|
| GET | `/api/admin/bafa-cert/pending` |
| POST | `/api/admin/bafa-cert/:userId/approve` |
| POST | `/api/admin/bafa-cert/:userId/reject` |
| GET | `/api/admin/audit-logs` |

---

## TEIL D · Frontend (Next.js v2 auf Vercel)

Repo: `MasterPlayspots/O.A.F24-v2`
Vercel: `fund24` → `https://fund24.io`

### D.1 Public `app/(public)/`
- `/` Landing
- `/preise`
- `/programme` + `/programme/[id]`
- `/berater` + `/berater/[id]`
- `/aktuelles` + `/aktuelles/[slug]`
- `/foerder-schnellcheck` (+ analyse, profil, chat, ergebnis, bericht)
- `/impressum`, `/datenschutz`, `/agb`, `/support`
- `/passwort-reset`

### D.2 Auth `app/(auth)/`
- `/login`, `/registrieren`, `/passwort-vergessen`, `/verifizieren`
- Auth: Zustand Store `lib/store/authStore.ts`
- JWT in Memory + HttpOnly Cookie via `app/api/session/route.ts`

### D.3 Onboarding `app/onboarding/`
- `/onboarding/profil`, `/onboarding/dienstleistungen`, `/onboarding/expertise`

### D.4 Dashboard Unternehmen `app/dashboard/unternehmen/`
- `/dashboard/unternehmen` — Counts Panel (wired)
- `/dashboard/unternehmen/favoriten` — (wired)
- `/dashboard/unternehmen/anfragen` — (legacy)
- `/dashboard/unternehmen/tracker`

### D.5 Dashboard Berater `app/dashboard/berater/`
- `/dashboard/berater` — Kunden-Sektion (wired)
- `/dashboard/berater/anfragen`
- `/dashboard/berater/abwicklung`
- `/dashboard/berater/nachrichten`
- `/dashboard/berater/profil`
- `/dashboard/berater/tracker`

### D.6 Admin `app/admin/`
- `/admin` — Cert-Queue (wired)
- `/admin/users`
- `/admin/aktuelles`
- `/admin/provisionen`

### D.7 Förderchecker `app/foerdercheck/`
- `[sessionId]/analyse`, `/dokumente`, `/chat`, `/ergebnisse`

---

## TEIL E · Was FEHLT (Backend fertig, Frontend fehlt)

| Endpoint | Fehlende UI |
|---|---|
| `POST /api/berichte` + PATCH + finalize | `/dashboard/berater/berichte/[id]` Editor |
| `POST /api/antraege/:id/zugriff` | Modal "Berater einladen" in Antrag-Detail |
| `GET /api/admin/audit-logs` | Audit-Log Viewer `/admin/audit-logs` |
| `PATCH /api/beratungen/:id` | Beratung-Detail-Page |

### Tabellen ohne Frontend
- `forum_*`, `pakete`, `orders`, `promo_codes` — Billing/Stripe fehlt
- `bafa_custom_templates` — Template-Library fehlt
- `email_outbox` — Admin-Sicht fehlt

---

## TEIL F · Architektur Quick-Reference

Browser (fund24.io)
↓ HTTPS
Vercel Edge (Next.js v2)
↓ lib/api/fund24.ts (27 Wrapper)
Cloudflare Worker bafa-creator-ai-worker
↓ JWT via FUND24_SESSIONS KV
↓ requirePersona / requireAntragAccess / requireBafaCertified
├─→ BAFA_DB (D1) — users, antraege_v2, reports
├─→ FOERDER_DB (D1) — 3884 Programme
├─→ BAFA_CONTENT (D1) — KI-Prompts
├─→ R2 fund24-dokumente — User Files
├─→ R2 bafa-reports — PDFs
└─→ Workers AI — llama-3.1-8b

---

## TEIL G · Nächste Schritte (Priorität)

1. `/dashboard/berater/berichte/[id]` — γ-Hybrid Editor (höchster Business Value)
2. `/antraege/[id]` — Antrag-Detail + Berater-Einladen Modal
3. `/admin/audit-logs` — Audit-Log Viewer
4. Stripe/Billing — pakete, orders, promo_codes
5. Berater-Forum
