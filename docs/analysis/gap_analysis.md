# Fund24 — Gap Analysis · 2026-04-15

Jeder Gap mit exaktem Ziel-Dateipfad, API-Kontrakt, Abhängigkeiten und Effort.

---

## GAP-001 · Admin Cert-Queue — BROKEN

**Feature:** Admin-seitiger Freigabe-Flow für BAFA-Zertifikate von Beratern.

**Status:** UI vorhanden, Wrapper vorhanden, **Worker-Handler fehlt**.

**Existierende Pfade:**
- `app/admin/page.tsx:34-42` — UI-Block "Pending Certs" mit `listPendingCerts`, `approveCert`, `rejectCert` Calls
- `lib/api/fund24.ts:380` → `listPendingCerts()` → `GET /api/admin/bafa-cert/pending`
- `lib/api/fund24.ts:383` → `approveCert(id)` → `POST /api/admin/bafa-cert/:userId/approve`
- `lib/api/fund24.ts:386` → `rejectCert(id)` → `POST /api/admin/bafa-cert/:userId/reject`

**Zielpfad für Fix:** `worker/src/routes/admin.ts` — drei neue Routen.

**API-Kontrakt:**

```ts
// GET /api/admin/bafa-cert/pending  →  200
{
  success: true,
  certs: Array<{
    id: string;            // user_id
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    bafa_berater_nr: string | null;
    bafa_cert_status: 'pending' | 'approved' | 'rejected';
    bafa_cert_uploaded_at: string | null;
  }>
}

// POST /api/admin/bafa-cert/:userId/approve  →  200
{ success: true }

// POST /api/admin/bafa-cert/:userId/reject  →  200
{ success: true }
```

**Impl-Skizze:**
```sql
-- Query base
SELECT id, email, first_name, last_name, company, bafa_berater_nr,
       bafa_cert_status, bafa_cert_uploaded_at
  FROM users
 WHERE bafa_cert_status = 'pending'
 ORDER BY bafa_cert_uploaded_at DESC
 LIMIT 500;
```

**Abhängigkeiten:**
- `users.bafa_cert_status` Spalte — existiert (verifizieren via `PRAGMA table_info(users)`)
- Audit-Log-Event `bafa_cert_approved` / `_rejected` (optional, aber sauber)
- Email an Berater nach Approve/Reject (optional, Nice-to-have)

**Effort:** Medium (2-4h inkl. E2E-Test + Audit-Log).

---

## GAP-002 · Berater BAFA-Zert Antrag — MISSING

**Feature:** Berater soll BAFA-Zertifikat einreichen, sich als zertifiziert verifizieren lassen (trigger für GAP-001 Admin-Flow).

**Status:** Weder UI noch Wrapper noch Backend-Endpoint existieren.

**Existierende Pfade:** Keine.

**Zielpfade für Implementation:**
- **UI:** `app/dashboard/berater/bafa-cert/page.tsx` — Upload-Form (PDF) + Status-Badge
- **Wrapper:** `lib/api/fund24.ts` — neue Funktionen `uploadBafaCert(file: File, bafaBeraterNr: string)` + `getBafaCertStatus()`
- **Worker:** `worker/src/routes/berater.ts` — zwei neue Routen

**API-Kontrakt:**

```ts
// POST /api/berater/bafa-cert   multipart/form-data
// Body: { file: File (PDF), bafa_berater_nr: string }
// Response:
{ success: true, status: 'pending' }

// GET /api/berater/bafa-cert/status  →  200
{
  success: true,
  status: 'none' | 'pending' | 'approved' | 'rejected',
  bafa_berater_nr: string | null,
  uploaded_at: string | null
}
```

**Impl-Skizze:**
- PDF nach R2 unter `bafa-certs/{userId}/{timestamp}-{filename}`
- `UPDATE users SET bafa_cert_status='pending', bafa_cert_uploaded_at=datetime('now'), bafa_berater_nr=? WHERE id=?`
- Admin-Email-Notification (via Onboarding-Pattern)

**Abhängigkeiten:**
- R2 Bucket (bereits: `bafa-reports` — oder neuer `bafa-certs` Bucket?)
- Zod + File-Validator (max 5 MB, MIME type `application/pdf`)
- `users.bafa_cert_*` Spalten — existieren bereits laut Migration-Historie

**Effort:** Large (1 Tag: Page + Upload-Handler + Admin-Notification + Tests).

---

## GAP-003 · ECOSYSTEM.md — STALE-DOC

**Feature:** Die zentrale Architektur-Dokumentation ist eine Woche alt und diverse Phase-C-Changes fehlen.

**Status:** Dokument existiert, ist aber nicht mit dem Code synchron.

**Existierende Pfade:**
- `ECOSYSTEM.md` (Root)
- Zu löschende Referenzen: `/api/bafa`, `/api/forum/*`, `/api/auth/webauthn/*`, `/api/auth/magic-link/*`
- Fehlende Referenzen: `/api/antraege/*`, `/api/me/dashboard`, `/api/news/*`, `/api/admin/news/*`, `/api/tracker/*`, `/api/berater/provision-vertraege`, `/api/berater/abwicklung/upload`, `/api/oa/*`, `/api/admin/onboarding/dispatch`, Onboarding-Cron

**Zielpfad für Fix:** `docs/API.md` (neu, auto-generiert oder manuell) + `ECOSYSTEM.md` deprecaten.

**Vorschlag:**
- Script `scripts/gen-api-docs.ts` das `grep` über `worker/src/routes/*.ts` macht und `docs/API.md` erzeugt
- Cron-Auto-Update via GH Action bei jedem Push auf `worker/src/routes/**`

**Effort:** Medium (4h für manuelles Re-Write) oder Large (1 Tag für Auto-Gen).

---

## GAP-004 · Tests in CI

**Feature:** Worker-Tests werden geschrieben, aber nicht in PR-Checks ausgeführt.

**Status:** Test-Files da (13 in `worker/src/__tests__/`), aber CI läuft sie nicht.

**Existierende Pfade:**
- `worker/vitest.config.ts`
- `worker/src/__tests__/*.test.ts`
- `.github/workflows/ci.yml:22-42` — runs lint + typecheck + build, **no test step**

**Zielpfad für Fix:** `.github/workflows/ci.yml`

**Impl:**
```yaml
- name: Worker Tests
  run: cd worker && npm test
```

**Abhängigkeiten:**
- Vitest + miniflare Config (existiert)
- CI-Node-Version ist bereits auf 20 → passt

**Effort:** Quick (15 min).

---

## GAP-005 · R2 Bucket Cleanup / Binding

**Feature:** Zwei Cloudflare R2-Buckets existieren im Account aber sind nicht an Worker gebunden.

**Status:** `fund24-dokumente`, `fund24-company-files` auf CF sichtbar (via `wrangler r2 bucket list`), aber fehlen in `worker/wrangler.toml`.

**Zielpfad:**
- **Entweder:** Binden in `worker/wrangler.toml` unter `[[r2_buckets]]` falls verwendet werden soll (dann aber: wer schreibt hin?)
- **Oder:** Löschen via CF-Dashboard / `npx wrangler r2 bucket delete` falls nicht gebraucht

**Effort:** Quick (15 min Entscheidung + Ausführung, User-Action).

---

## GAP-006 · .env.example

**Feature:** Repository hat keine `.env.example` — neue Entwickler wissen nicht welche Env-Vars zu setzen sind.

**Zielpfad:** `/.env.example`

**Inhalt:**
```
NEXT_PUBLIC_FUND24_API_URL=https://api.fund24.io
NEXT_PUBLIC_CHECK_API_URL=https://foerdermittel-check-api.froeba-kevin.workers.dev
NEXT_PUBLIC_SEMANTIC_API_URL=https://api.fund24.io/semantic
NEXT_PUBLIC_ZFBF_API_URL=https://zfbf-api.froeba-kevin.workers.dev
# Server-side only (Sentry DSN, Stripe keys optional in dev)
SENTRY_DSN=
```

**Effort:** Quick (5 min).

---

## GAP-007 · Documentation API Inventory

**Feature:** Kein zentraler Überblick über alle ~120 Worker-Endpoints.

**Zielpfad:** `docs/API.md` (neu)

**Struktur:**
```
# API Reference
## /api/auth/* (11 endpoints)
## /api/antraege/* (9 endpoints)
## /api/beratungen/* (3 endpoints)
...
```

**Abhängigkeiten:** Entweder manuell pflegen oder Auto-Generator via TS-Routen-Parser.

**Effort:** Medium (4h manuell, oder 8h für Auto-Gen).

---

## Summary

| ID | Typ | Impact | Effort | Blocker? |
|---|---|---|---|---|
| GAP-001 | BROKEN | HIGH | Medium | Ja — Admin-UX |
| GAP-002 | MISSING | HIGH | Large | Nein (Feature, kann post-launch) |
| GAP-003 | STALE-DOC | MEDIUM | Medium | Nein |
| GAP-004 | DEVOPS | MEDIUM | Quick | Nein |
| GAP-005 | INFRA | MEDIUM | Quick | Nein |
| GAP-006 | DX | LOW | Quick | Nein |
| GAP-007 | DOCS | MEDIUM | Medium | Nein |

**Kritischer Pfad für Launch:** nur GAP-001 ist echter Blocker.
