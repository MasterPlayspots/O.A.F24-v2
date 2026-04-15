# Fund24 — 15-Dimensions Audit · 2026-04-15

**Repo:** MasterPlayspots/O.A.F24-v2 @ commit `41fa37c`
**Scope:** Frontend (Next.js on Vercel) + Worker 1 (Hono on Cloudflare) + Worker 2 (plain JS on Cloudflare, proxied)
**Audit branch:** `audit/2026-04-15`
**Ground truth:** code. ECOSYSTEM.md was cross-checked and marked STALE where it diverges.

---

## Executive Summary

| Metric | Value |
|---|---|
| **Overall Score** | **7.0 / 10** |
| **Maturity** | Mid — most Kern-Flows live + wired, 1 BROKEN admin surface, 1 MISSING feature, a few post-launch polish items |
| **Kern-Architektur** | Monorepo, 1 Vercel deploy + 2 CF Worker auto-deployed via GH Actions |
| **LOC** (TS + TSX, excl. node_modules) | ~55.000 Frontend + 30.000 Worker 1 + 4.700 Worker 2 |
| **Worker-Endpoints** | ~120 (Worker 1 native) + ~50 (Worker 2 via proxy) |
| **Frontend Pages** | 55 (`page.tsx`) |
| **Feature-Abdeckung LIVE** | 47 / 50 (94 %) |
| **BROKEN** | 1 (Admin Cert-Queue — wrapper ruft fehlenden Endpoint) |
| **MISSING** | 1 (Berater BAFA-Zert-Antrag — weder UI noch Backend) |

## Live-Infra Check (Ground Truth)

| Check | Ergebnis |
|---|---|
| `GET https://fund24.io/` | 200 |
| `GET https://api.fund24.io/api/health` | 200, all checks green |
| `GET /api/foerdermittel/katalog?limit=1` | 200, success true |
| `GET /api/netzwerk/berater?pageSize=3` | 200, total = 16 |
| `GET /api/news` | 200, 0 Artikel (table empty, expected) |
| D1 DBs (CF) | 7 existieren, 5 genutzt |
| R2 Buckets (CF) | 4 existieren, **2 ungebunden** (`fund24-dokumente`, `fund24-company-files`) — siehe Finding F-012 |
| Worker 1 latest | `41fa37c` (deployed via GH Actions) |
| Worker 2 latest | `2ea5c4e` (deployed via GH Actions) |
| Vercel latest Ready | `41fa37c` (`fund24-i3sh4nusc`) |

---

## Dimension Scores

| # | Dimension | Score | Kurz-Urteil |
|---|---|---|---|
| D1 | Architecture | 7 | 3-tier sauber, 0 circular deps, Monorepo konsolidiert; 2 ungebundene R2 Buckets |
| D2 | Code-Quality | 6 | 48× `as any`, 12 `console.*` in FE, TSC sauber, ESLint grün |
| D3 | Security | 7 | PBKDF2 100k, param SQL, CORS/CSRF/Rate-Limit alle da; **Sentry PII an**, 4× Hono-MODERATE CVEs |
| D4 | Performance | 6 | Worker 589 KB, Sentry 100 % sampling (Kostenrisiko), 1 sehr große Route-Datei |
| D5 | Tests | 7 | 13 Worker-Tests (vitest + miniflare), **keine E2E**, kein Test-Step in CI |
| D6 | API Design | 8 | 55 Zod-Validatoren, Shape-Konsistenz, 1 silent catch |
| D7 | Dependencies | 6 | 10 npm-audit findings (2 HIGH, 8 MOD), Hono < 4.12.12, depcheck sauber |
| D8 | Git | 8 | Aktive Historie seit März, 3 Commits/Tag Avg, gut verteilte Changes |
| D9 | Documentation | 6 | ECOSYSTEM.md stale (nennt `/api/bafa`), kein API.md, kein MIGRATIONS.md |
| D10 | DevOps | 8 | Beide CF Workers + Vercel auto-deployed, Actions unpinned (@v3/@v4 major) |
| D11 | Frontend | 7 | 55 pages, Error-Boundaries da, 1 offener TODO in SupportWidget |
| D12 | Database | 7 | Cross-DB FK-Design akzeptiert, 46 Tables, 113 Indexes, keine rollbacks |
| D13 | Error-Handling | 7 | Sentry in global-error.tsx, 1 silent catch in check.ts, app/error.tsx ohne Sentry |
| D14 | Monitoring | 7 | OA-CP + OA-VA crons + onboarding cron laufen, 100 % Sentry sampling |
| D15 | Env Config | 7 | Keine `.env.example`, requireEnv() validiert server-side |

**Gewichteter Durchschnitt:** 7.0 / 10

---

## TOP 5 CRITICAL FINDINGS

### F-001 · HIGH · Security · `instrumentation-client.ts:14` + `sentry.server.config.ts:11`
**Issue:** `tracesSampleRate: 1.0` + `sendDefaultPii: true` (falls gesetzt). 100 %-Sampling bedeutet alle User-Emails, Ids, IPs, Rollen landen im Sentry-Datenschatz → DSGVO-Risiko + unnötige Cost.
**Fix:** Auf `0.1` senken, `sendDefaultPii: false`, sensible Felder via `beforeSend`-Scrubber strippen.
**Effort:** Quick (15 min).

### F-002 · HIGH · Dependencies · `worker/package.json`
**Issue:** `hono ^4.12.8` — aktuelle Version hat 3 MODERATE-CVEs (cookie bypass GHSA-26pp-8wgv-hjvm, IPv6 bypass, path traversal). Neueste ist 4.12.12+.
**Fix:** `npm install hono@latest --save` in `worker/`, build, redeploy. Keine API-Bruchänderungen in 4.12.x.
**Effort:** Quick (30 min inkl. Smoke-Test).

### F-003 · HIGH · Feature-Matrix · `app/admin/page.tsx:34-42` ↔ `worker/src/routes/admin.ts`
**Issue:** Wrapper `listPendingCerts`, `approveCert`, `rejectCert` in `lib/api/fund24.ts:380-388` rufen `/api/admin/bafa-cert/*` auf. **Kein Handler** in `worker/src/routes/admin.ts` vorhanden (grep ergibt null). Cert-Queue-UI auf `/admin` wird silent leer bleiben — 404 wenn Admin authentifiziert ist (aktuell 401 durch RequireAuth-Middleware, was den 404 maskiert).
**Fix:** In `admin.ts` vier neue Routes:
- `GET /bafa-cert/pending` — list users with `bafa_cert_status = 'pending'`
- `POST /bafa-cert/:userId/approve`
- `POST /bafa-cert/:userId/reject`
**Effort:** Medium (2-4h, abhängig davon ob die Zert-Upload-Logik + R2-Attachment-Flow schon da sind).

### F-004 · HIGH · Feature-Matrix · Berater BAFA-Zert Antrag
**Issue:** ECOSYSTEM.md listet "BAFA-Zertifizierung für Berater" als Feature, aber weder UI (`app/dashboard/berater/bafa-cert/page.tsx` fehlt) noch Worker-Endpoint existieren. Der Admin-Flow (F-003) hat keine Daten-Quelle.
**Fix:** Feature entweder bauen (UI + POST /api/berater/bafa-cert + R2-Upload) oder aus ECOSYSTEM.md entfernen.
**Effort:** Large (1 Tag Build, oder 5 min Entfernen aus Docs).

### F-005 · HIGH · Documentation · `ECOSYSTEM.md`
**Issue:** Doc ist 1 Woche alt, aber einige Abschnitte referenzieren Endpoints die inzwischen entfernt sind (z. B. `/api/bafa` — gelöscht in Commit `18e4a54`). Auch die Phase-C-Konsolidierung (Worker 2 → Worker 1 Migrationen) ist nicht dokumentiert.
**Fix:** `ECOSYSTEM.md` überarbeiten oder durch `docs/API.md` (Route-Inventar aus Code generiert) ersetzen.
**Effort:** Medium (4h für vollständiges Re-Write).

---

## Weitere Findings

| ID | Severity | Dimension | File:Line | Issue | Effort |
|---|---|---|---|---|---|
| F-006 | MEDIUM | D2 | `app/**/*.tsx` | 12× `console.log/warn/error` im FE — ungeschützt in prod | Quick |
| F-007 | MEDIUM | D2 | `app lib worker/src` | 48× `as any` — FE- und Worker-spezifisch | Medium |
| F-008 | MEDIUM | D4 | `worker/src/routes/foerdermittel.ts` (~1500 LOC) | Gigantische Route-Datei, vermischt Katalog + Search + Match | Medium |
| F-009 | MEDIUM | D5 | `.github/workflows/ci.yml` | Kein Test-Step, Worker-Tests werden nie in CI ausgeführt | Quick |
| F-010 | MEDIUM | D6 | `worker/src/routes/check.ts:72-74` | Silent catch `} catch { }` — Fehler werden geschluckt | Quick |
| F-011 | MEDIUM | D9 | `docs/` | Keine `docs/API.md`, `docs/MIGRATIONS.md`, keine automatische Route-Liste | Medium |
| F-012 | MEDIUM | D12 | `worker/wrangler.toml` vs CF | 2 R2 buckets (`fund24-dokumente`, `fund24-company-files`) existieren auf CF, sind aber nicht im Worker gebunden — toter Plan oder stale Infra | Quick |
| F-013 | MEDIUM | D13 | `app/error.tsx` | App-level Error-Boundary ohne Sentry-Capture | Quick |
| F-014 | LOW | D10 | `.github/workflows/*.yml` | Actions auf Major-Version gepinnt, nicht auf SHA — Supply-chain-Risiko | Quick |
| F-015 | LOW | D11 | `components/support/SupportWidget.tsx:7` | TODO: "Vor Go-Live echte Kontaktdaten" | Quick |
| F-016 | LOW | D12 | `worker/db/migrations/` | Keine `*-rollback.sql` Skripte | Medium |
| F-017 | LOW | D15 | Repo-Root | Keine `.env.example` | Quick |
| F-018 | LOW | D3 | `worker/src/middleware/cors.ts:15-19` | DEV-Origins `localhost:3000/5173`, `v0-bafa-creator-ai.vercel.app` auch in prod zugelassen (Environment-Gate existiert aber) | Low |

---

## Persona-Feature-Matrix (Kurzversion)

**Vollständige Matrix:** `docs/analysis/feature_matrix.csv` (50 Zeilen)

| Persona | LIVE | BROKEN | MISSING | Coverage |
|---|---|---|---|---|
| Public (Landing, Programme, Berater, News, Foerdercheck, Legal) | 13 | 0 | 0 | 100 % |
| Auth (Login/Register/Verify/Reset) | 5 | 0 | 0 | 100 % |
| Onboarding (Profil, Unternehmen, Expertise, Dienstleistungen) | 4 | 0 | 0 | 100 % |
| Unternehmen (Dashboard, Favoriten, Tracker, Anträge, Anfragen, Detail, Upload, ACL, Notifications, Fördercheck) | 12 | 0 | 0 | 100 % |
| Berater (Dashboard, Anfragen, Beratungen, Abwicklung, Nachrichten, Vorlagen, Bericht-Editor, Profil, Tracker) | 9 | 0 | 1 | 90 % |
| Admin (Dashboard, Users, Aktuelles-CMS, Provisionen, Audit-Logs, Email-Outbox, Cert-Queue) | 6 | 1 | 0 | 86 % |

**Total: 49 LIVE · 1 BROKEN · 1 MISSING = 94 % Feature-Abdeckung**

---

## Gap-Analyse

Siehe `docs/analysis/gap_analysis.md` für alle Gaps mit Ziel-Dateipfaden und API-Kontrakten.

**Top-3 Gaps:**

1. **GAP-001 BROKEN · Admin Cert-Queue** — Target: `worker/src/routes/admin.ts`
2. **GAP-002 MISSING · Berater BAFA-Zert-Upload** — Target: `app/dashboard/berater/bafa-cert/page.tsx` + `worker/src/routes/berater.ts`
3. **GAP-003 STALE-DOC · ECOSYSTEM.md** — Target: Re-write oder Ersatz durch `docs/API.md`

---

## Priorisierung (Rank 1-15)

| Rank | ID | Titel | Impact | Effort | Sprint | Blocker? |
|---|---|---|---|---|---|---|
| 1 | F-002 | Hono auf 4.12.12+ (CVEs) | HIGH | Quick | S1 | **Ja — Security** |
| 2 | F-001 | Sentry PII + Sampling | HIGH | Quick | S1 | **Ja — DSGVO** |
| 3 | GAP-001 | Admin Cert-Queue-Endpoints (F-003) | HIGH | Medium | S1 | **Ja — Admin-UX broken** |
| 4 | F-009 | Test-Step in CI | MEDIUM | Quick | S1 | Nein |
| 5 | F-010 | Silent catch check.ts | MEDIUM | Quick | S1 | Nein |
| 6 | F-006 | Console.* aus prod-FE | MEDIUM | Quick | S1 | Nein |
| 7 | F-013 | app/error.tsx + Sentry | MEDIUM | Quick | S1 | Nein |
| 8 | F-017 | `.env.example` | LOW | Quick | S1 | Nein |
| 9 | GAP-002 | Berater BAFA-Zert Feature | HIGH | Large | S2 | Nein (Feature, nicht Bug) |
| 10 | F-005 | ECOSYSTEM.md Refresh / API.md | MEDIUM | Medium | S2 | Nein |
| 11 | F-012 | R2 Buckets klären | MEDIUM | Quick | S2 | Nein |
| 12 | F-008 | foerdermittel.ts splitten | MEDIUM | Medium | S2 | Nein |
| 13 | F-007 | `as any` Sweep | MEDIUM | Medium | S3 | Nein |
| 14 | F-014 | Actions SHA-pinning | LOW | Quick | S3 | Nein |
| 15 | F-015 | SupportWidget TODO | LOW | Quick | S1 | Nein (Launch-blocker) |

---

## Quick Wins (< 2 h)

1. **F-001** Sentry Sampling 1.0 → 0.1, PII-Scrubbing
2. **F-002** Hono-Bump auf neueste Minor
3. **F-006** 12× console.* aus prod-FE entfernen
4. **F-010** `} catch { }` durch Sentry-capture ersetzen
5. **F-013** `app/error.tsx` ruft `Sentry.captureException`
6. **F-015** SupportWidget-Kontaktdaten einsetzen
7. **F-017** `.env.example` schreiben

Kumulativer Impact: Security + DSGVO + besseres Error-Tracing in einem Nachmittag.

---

## Critical Path (Launch-Blocker)

1. **F-002** Hono-CVEs fixen
2. **F-001** DSGVO-konforme Sentry-Config
3. **GAP-001** Admin Cert-Queue-Endpoints
4. User-Action: Impressum HRB + USt-IdNr. (siehe Phase-A-Report)
5. User-Action: Anwalts-Review Datenschutz + AGB

Alles andere ist Post-Launch-Polish.

---

## Stale-Doc-Items (ECOSYSTEM.md)

Items die ECOSYSTEM.md erwähnt aber **nicht mehr im Code existieren**:
- `/api/bafa` → entfernt in Commit `18e4a54` (Phase C: dead routes)
- `/api/forum/*` → entfernt
- `/api/auth/webauthn/*`, `/api/auth/magic-link/*` → entfernt (Phase C Deadweight-Cleanup)

Items die ECOSYSTEM.md **nicht** erwähnt aber **live** sind:
- `/api/antraege/*` (Detail + Dokumente + Zugriff + Status-Patch) — Phase 3
- `/api/me/dashboard` — Phase C
- `/api/news/*` + `/api/admin/news/*` — Phase C rest
- `/api/tracker/*` — Phase C Migration von W2
- `/api/berater/provision-vertraege` + `/abwicklung/upload` — Phase C rest
- Alle OA-Agent-Endpoints + Onboarding-Cron

**Empfehlung:** ECOSYSTEM.md als Single-Source-of-Truth aufgeben und durch automatisch aus Code generiertes `docs/API.md` ersetzen.

---

## Anhang — Raw Metrics

Alle Rohdaten unter `docs/analysis/raw_metrics/`:

- `architecture.md`, `code-quality.md`, `security.md`, `deps.md`, `git_history.md`, `dimensions_rest.md`
- `audit.json` (npm audit raw), `depcheck.json`, `madge-{app,worker}.txt`
- `live_*.{txt,json}` (curl outputs)
- `d1_list.txt`, `r2_list.txt`, `kv_list.txt` (CF infra inventory)
- `worker_latest.txt`, `worker_check_latest.txt`, `wrangler_whoami.txt`
