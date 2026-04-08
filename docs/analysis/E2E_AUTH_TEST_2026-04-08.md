# E2E Auth Flow Test — fund24.io
Stand: 2026-04-08

Test targets: https://api.fund24.io (Worker: bafa-creator-ai-worker)

## Test Matrix
| # | Test | Endpoint | HTTP | Response (gist) | Status |
|---|---|---|---|---|---|
| 1 | Register Unternehmen | POST /api/auth/register | 200 | `success:true, userId, requiresVerification:true` | ⚠️ |
| 2 | Login Unternehmen | POST /api/auth/login | 403 | `E-Mail nicht verifiziert. Ein neuer Code wurde gesendet.` | ❌ |
| 3a | GET /api/me/antraege | /api/me/antraege | 401 | `Ungültiger Token` (no valid token obtainable) | ⚠️ blocked |
| 3b | GET /api/me/favoriten | /api/me/favoriten | 401 | `Ungültiger Token` | ⚠️ blocked |
| 3c | GET /api/me/notifications | /api/me/notifications | 401 | `Ungültiger Token` | ⚠️ blocked |
| 4a | Register Berater | POST /api/auth/register | 200 | `success:true, userId, requiresVerification:true` | ⚠️ |
| 4b | Login Berater | — | — | not executed (verification required) | ⚠️ blocked |
| 4c | GET /api/berichte | /api/berichte | 401 | `Ungültiger Token` | ⚠️ blocked |
| 4d | GET /api/vorlagen | /api/vorlagen | 401 | `Ungültiger Token` | ⚠️ blocked |
| 4e | Role-check negative test | /api/vorlagen with unternehmen token | — | not executed (no token) | ⚠️ blocked |
| 5 | Public katalog | GET /api/foerdermittel/katalog?limit=3 | 200 | 3 Programme, pagination total=3408 | ✅ |

## Captured tokens
- Unternehmen token: **absent** — register returned `requiresVerification:true`, login rejected with 403
- Berater token: **absent** — same reason

## Per-test details

### Test 1 — Register Unternehmen
Request: `POST /api/auth/register` mit `email test-e2e@ourark.io`, role `unternehmen`, `privacyAccepted:true`.
Response (HTTP 200):
```json
{"success":true,"userId":"bf8cbaaa-45a2-4a29-9b99-50884a702992","requiresVerification":true,"message":"Registrierung erfolgreich. Bitte geben Sie den 6-stelligen Code ein, den wir an Ihre E-Mail gesendet haben."}
```
User wird angelegt, aber der Worker gibt **keinen Token** zurück — stattdessen muss ein 6-stelliger E-Mail-Code verifiziert werden. Das weicht vom Auftrag ab, der `{success:true, token, user}` erwartet.

### Test 2 — Login
Request: `POST /api/auth/login` mit denselben Credentials.
Response (HTTP 403):
```json
{"success":false,"error":"E-Mail nicht verifiziert. Ein neuer Code wurde gesendet.","requiresVerification":true}
```
Login ist bis zur Verifizierung hart gesperrt. Kein Token abholbar. **Dadurch fällt der gesamte token-gebundene Testpfad (3, 4b–4e) aus.**

### Test 3 — /api/me/*
Ohne gültigen Token alle drei Routen mit `Authorization: Bearer invalid.token.here` angefragt. Alle antworten **HTTP 401 `Ungültiger Token`**. Positiv: Routes existieren (kein 404), Auth-Middleware greift. Eine echte 200-Verifikation war nicht möglich.

### Test 4 — Berater-Flow
- Register Berater: HTTP 200, `requiresVerification:true` (identisches Verhalten wie Test 1).
- Login Berater: übersprungen — blockiert durch E-Mail-Verifizierung.
- `/api/berichte`, `/api/vorlagen` ohne Token getestet: HTTP 401 `Ungültiger Token`. Routes existieren. Role-Gate (`requireRole("berater")`) konnte nicht positiv verifiziert werden.
- Negative Role-Check (`/api/vorlagen` mit unternehmen-Token): nicht ausführbar, kein Token.

### Test 5 — Public Katalog
`GET /api/foerdermittel/katalog?limit=3` → HTTP 200.
Response: `success:true`, 3 Programme (#BeActive Awards, #BeInclusive EU Sport Awards, #UpdateHamburg 2026), `pagination.total=3408`, `pageSize=3`, `totalPages=1136`. Voll funktionsfähig.

## Verdict
- Auth Flow (Register → Login → Token): **FAIL** — Register liefert keinen Token, Login ist bis E-Mail-Verifizierung gesperrt.
- Authenticated /api/me/* calls: **BLOCKED** — Routes existieren und verlangen Auth (401), positive 200-Fall konnte ohne Token nicht bestätigt werden.
- Berater-only routes: **BLOCKED** — selber Grund.
- Role-based access (negative test): **BLOCKED** — kein Token verfügbar.
- Public katalog: **PASS**.

## Findings

### P0
- **E-Mail-Verifizierungspflicht blockiert den gesamten headless E2E-Testpfad.** Der dokumentierte Flow (`register` → `token im response` → `authenticated calls`) existiert in dieser Form im Live-Worker nicht mehr. Aktueller Worker erfordert zwingend 6-Code-Verifizierung bevor Login überhaupt möglich ist. Entweder
  1. Test-Accounts vorab manuell verifizieren, oder
  2. Worker um einen Test-Bypass erweitern (z.B. `TEST_AUTO_VERIFY` Env-Flag für `*@ourark.io`-Domain oder eine dedizierte `/api/auth/verify` Route per Code), oder
  3. Im DB (D1) direkt `email_verified=1` setzen für die Test-User.
- **Dokumentations-Drift**: Das im Auftrag hinterlegte Schema `{success:true, token, user}` für Register stimmt nicht mit dem Live-Verhalten überein (`{success, userId, requiresVerification}`).

### P1
- Register-Response enthält keinen `user`-Block, nur `userId`. Frontend, das `user` erwartet, würde brechen.
- Login gibt `HTTP 403` für „nicht verifiziert" zurück — semantisch eher `401` oder `409`. Fürs Frontend-Error-Handling egal, fürs API-Design unsauber.
- Kein Rate-Limit-Header oder -Fehler beobachtet — gut für Testläufe, evtl. unerwünscht für Produktion.

## If anything failed

### Test 2 (Login) — FAIL
1. **Error-Response**: `HTTP 403 {"success":false,"error":"E-Mail nicht verifiziert. Ein neuer Code wurde gesendet.","requiresVerification":true}`
2. **Suspected cause**: Worker-Logik in `/api/auth/login` prüft `users.email_verified` bevor Token ausgestellt wird. Registrierung setzt `email_verified=false` und versendet Code via Mail-Provider. Der im Auftrag genannte „verified schema" bezieht sich nur auf das *Input*-Schema der Register-Route, nicht auf den Output.
3. **Suggested fix (Reihenfolge nach Aufwand)**:
   - **Kurzfristig**: D1-Query direkt im Cloudflare-Dashboard: `UPDATE users SET email_verified = 1 WHERE email IN ('test-e2e@ourark.io','berater-e2e@ourark.io');` und Tests erneut laufen lassen.
   - **Mittelfristig**: Worker-ENV `E2E_TEST_DOMAINS="ourark.io"` auswerten — für diese Domain `email_verified=true` direkt bei Register setzen.
   - **Langfristig**: Dedizierter Test-Endpoint `/api/auth/dev/auto-verify` hinter Secret-Header, nur bei `ENVIRONMENT=staging` aktiv.

### Tests 3, 4b–4e — BLOCKED
1. **Error-Response**: alle `HTTP 401 {"success":false,"error":"Ungültiger Token"}` (erwartet, da kein gültiger Token).
2. **Suspected cause**: Kaskadierender Fehler aus Test 2. Routes selbst sind intakt.
3. **Suggested fix**: Nach Behebung von Test 2 komplett neu ausführen. Kein Code-Fix an diesen Routes nötig.
