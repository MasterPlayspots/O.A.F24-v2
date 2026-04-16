# ANTIGRAVITY NACHT 3 — Backend Hardening + DB Indexes + Table Consolidation

Du arbeitest im O.A.F24-v2 Repo (fund24.io). Next.js 15 + Cloudflare Workers (Hono) + 5× D1 DBs.
Dein Auftrag: Phase 5 (Backend Hardening) aus `docs/analysis/EXECUTION_PLAN_2026-04-16.md`.

**WICHTIG:** "Edit automatically" ist AN. Du commitest SELBST. Kein User-Input nötig.

**ACHTUNG:** Diese Nacht enthält D1 Migration-Dateien. Erstelle neue SQL-Dateien in `worker/db/migrations/` mit dem nächsten freien Nummernpräfix. KEIN `wrangler d1 migrations apply` ausführen — das macht der User manuell.

---

## ABLAUF

### STEP 0 — Setup
```bash
git checkout main && git pull origin main
git checkout -b fix/nacht3-backend-hardening
```

Lies `docs/analysis/EXECUTION_PLAN_2026-04-16.md` und `docs/analysis/full-audit/04_DB_MAPPING.md` (auf Branch `origin/audit/phase-6-final-report` → `git show origin/audit/phase-6-final-report:docs/analysis/full-audit/04_DB_MAPPING.md`).

Finde die höchste existierende Migrationsnummer:
```bash
ls worker/db/migrations/ | sort -n | tail -5
```

---

### STEP 1 — TASK-034: AI Quota Protection

**Dateien:** `worker/src/routes/foerdermittel/cases.ts` und `worker/src/routes/foerdermittel/match.ts`

Finde die Stellen mit `ai.run(` oder Workers-AI Aufrufen.

**Erstelle** `worker/src/middleware/ai-quota.ts`:
```typescript
import type { Context } from 'hono'

const DAILY_LIMIT = 50 // pro User pro Tag

export async function checkAiQuota(c: Context, userId: string): Promise<boolean> {
  const db = c.env.BAFA_DB // oder die richtige DB — prüfe welche für AI-Tracking genutzt wird
  const today = new Date().toISOString().split('T')[0]

  const result = await db.prepare(
    'SELECT calls_used FROM ai_quota_daily WHERE user_id = ? AND date = ?'
  ).bind(userId, today).first<{ calls_used: number }>()

  if (result && result.calls_used >= DAILY_LIMIT) {
    return false // Quota exceeded
  }
  return true
}

export async function incrementAiQuota(c: Context, userId: string): Promise<void> {
  const db = c.env.BAFA_DB
  const today = new Date().toISOString().split('T')[0]

  await db.prepare(`
    INSERT INTO ai_quota_daily (user_id, date, calls_used)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET calls_used = calls_used + 1
  `).bind(userId, today).run()
}
```

**Migration** (nächste freie Nummer, z.B. `0XX-ai-quota.sql`):
```sql
CREATE TABLE IF NOT EXISTS ai_quota_daily (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  calls_used INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
```

**In cases.ts und match.ts:** VOR jedem `ai.run()` Aufruf:
```typescript
import { checkAiQuota, incrementAiQuota } from '../middleware/ai-quota'

// Im Handler:
const userId = c.get('userId') // oder wie auch immer der User identifiziert wird
if (!(await checkAiQuota(c, userId))) {
  return c.json({ error: 'Tägliches AI-Limit erreicht. Bitte morgen erneut versuchen.' }, 429)
}
// ... ai.run() ...
await incrementAiQuota(c, userId)
```

---

### STEP 2 — TASK-035: Soft-Delete für News

**Dateien:** `worker/src/routes/news.ts`

Finde den DELETE Handler (suche nach `DELETE FROM news_articles`).

**Migration** (nächste Nummer, z.B. `0XX-news-soft-delete.sql`):
```sql
ALTER TABLE news_articles ADD COLUMN deleted_at TEXT DEFAULT NULL;
CREATE INDEX idx_news_deleted_at ON news_articles(deleted_at);
```

**Im Code:**
- Ändere `DELETE FROM news_articles WHERE id = ?` → `UPDATE news_articles SET deleted_at = datetime('now') WHERE id = ?`
- Ändere ALLE SELECT Queries für news: füge `AND deleted_at IS NULL` hinzu
- Füge `writeAuditLog` Aufruf für Löschungen hinzu (suche wie andere Routen auditLoggen)

---

### STEP 3 — TASK-036: /api/me/* Middleware Bypass fixen

**Dateien:** `worker/src/routes/me.ts`

Finde die `forward()` Funktion die `foerdermittel.fetch()` direkt aufruft.

Das Problem: Die forward() Funktion baut einen neuen Request und schickt ihn direkt an die Sub-App, OHNE dass die Auth-Middleware der äußeren App nochmal läuft.

**Fix:** Stelle sicher dass `requireAuth` auf JEDEM me.* Handler liegt:
```typescript
me.get('/dashboard', requireAuth, async (c) => { ... })
me.get('/profil', requireAuth, async (c) => { ... })
// etc.
```

Oder füge ein globales `me.use('*', requireAuth)` hinzu (besser).

---

### STEP 4 — TASK-037: DB Indexes erstellen (H-P4-05)

**Migration** (nächste Nummer, z.B. `0XX-add-indexes.sql`):

```sql
-- bafa_antraege Indexes
CREATE INDEX IF NOT EXISTS idx_antraege_v2_user_id ON antraege_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_antraege_v2_status ON antraege_v2(status);
CREATE INDEX IF NOT EXISTS idx_antraege_v2_created_at ON antraege_v2(created_at);

-- berater_profiles Indexes
CREATE INDEX IF NOT EXISTS idx_berater_profiles_user_id ON berater_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_berater_profiles_status ON berater_profiles(status);
CREATE INDEX IF NOT EXISTS idx_berater_profiles_verfuegbar ON berater_profiles(verfuegbar);

-- unternehmen Indexes
CREATE INDEX IF NOT EXISTS idx_unternehmen_user_id ON unternehmen(user_id);
CREATE INDEX IF NOT EXISTS idx_unternehmen_branche ON unternehmen(branche);

-- foerdermittel_cases Indexes
CREATE INDEX IF NOT EXISTS idx_foerdermittel_cases_user_id ON foerdermittel_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_foerdermittel_cases_status ON foerdermittel_cases(status);

-- netzwerk_anfragen Indexes
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_berater_id ON netzwerk_anfragen(berater_id);
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_unternehmen_id ON netzwerk_anfragen(unternehmen_id);
CREATE INDEX IF NOT EXISTS idx_netzwerk_anfragen_status ON netzwerk_anfragen(status);

-- provisionen Indexes
CREATE INDEX IF NOT EXISTS idx_provisionen_berater_id ON provisionen(berater_id);
CREATE INDEX IF NOT EXISTS idx_provisionen_status ON provisionen(status);

-- audit_logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
```

**WICHTIG:** Prüfe die tatsächlichen Tabellen-/Spaltennamen indem du die bestehenden Migrationen liest:
```bash
grep -r "CREATE TABLE" worker/db/migrations/ | grep -i "antraege\|berater\|unternehmen\|foerdermittel_cases\|anfragen\|provisionen\|audit"
```

Passe die Spaltennamen an falls sie anders heißen.

---

### STEP 5 — TASK-038: Backup Config für alle 5 D1 Databases

**Dateien:** `worker/src/services/backup.ts` und `worker/src/index.ts` (scheduled handler)

Finde die bestehende `performBackup` Funktion.

- Sie dumpt aktuell nur `DB` + `BAFA_DB` (2 von 5)
- Füge `FOERDER_DB`, `CHECK_DB`, `BAFA_CONTENT` hinzu (suche die Binding-Namen in `worker/wrangler.toml`)
- Prüfe welche DB-Bindings tatsächlich in wrangler.toml definiert sind:
```bash
grep "database_name\|binding" worker/wrangler.toml | head -20
```
- Für JEDE gebundene DB: Füge sie zum Backup hinzu

---

### STEP 6 — TASK-039: Favorites Konsolidierung (H-P4-01)

Zuerst: Finde ALLE Favorites-Tabellen und deren Nutzung:
```bash
grep -r "favorit" worker/src/ --include="*.ts" -l
grep -r "CREATE TABLE.*favorit" worker/db/migrations/
```

**Analyse:**
- Identifiziere welche Tabelle die kanonische ist (wahrscheinlich die mit den meisten Spalten)
- Identifiziere welche Worker-Routes welche Tabelle nutzen
- Identifiziere welche Frontend-Wrapper (`lib/api/fund24.ts` vs `lib/api/check.ts`) welche Route aufrufen

**Migration** (nächste Nummer):
```sql
-- Daten aus Legacy-Tabellen in kanonische Tabelle übertragen
-- ACHTUNG: Spaltennamen anpassen nach Analyse!
INSERT OR IGNORE INTO [kanonische_tabelle] (user_id, programm_id, created_at)
SELECT user_id, programm_id, created_at FROM [legacy_tabelle_1];

INSERT OR IGNORE INTO [kanonische_tabelle] (user_id, programm_id, created_at)
SELECT user_id, programm_id, created_at FROM [legacy_tabelle_2];
```

**NICHT** die Legacy-Tabellen droppen — nur die Migration vorbereiten. Das Droppen geschieht in Phase 8 (Nacht 5) nach Validierung.

**Im Code:** Ändere ALLE Routes die Legacy-Tabellen nutzen auf die kanonische Tabelle.

---

### STEP 7 — TASK-040: Legacy antraege Table markieren

**Dateien:** Worker route files die `antraege` (ohne `_v2`) referenzieren.

```bash
grep -rn "FROM antraege[^_]" worker/src/ --include="*.ts"
grep -rn "INTO antraege[^_]" worker/src/ --include="*.ts"
grep -rn "'antraege'" worker/src/ --include="*.ts"
```

- Wenn Queries auf die alte `antraege` Tabelle zugreifen: Ändere sie auf `antraege_v2`
- Prüfe ob Schema-Unterschiede existieren (16 vs 19 Spalten) — wenn ja, mappe die Spalten korrekt
- Erstelle KEINE Drop-Migration — nur Code-Änderungen. Drop kommt in Nacht 5.

---

### STEP 8 — TASK-041: Audit Logs Konsolidierung vorbereiten

```bash
grep -rn "audit_log" worker/src/ --include="*.ts" -l
grep -r "CREATE TABLE.*audit" worker/db/migrations/
```

- Identifiziere beide audit_logs Tabellen (zfbf-db + bafa_antraege)
- Identifiziere welche die vollständigere ist
- Ändere ALLE `writeAuditLog` Aufrufe so dass sie die EINE kanonische Tabelle nutzen
- Erstelle Migration die Daten konsolidiert (INSERT OR IGNORE)

---

### STEP 9 — TASK-042: berater_profile vs berater_profiles

```bash
grep -rn "berater_profile[^s]" worker/src/ --include="*.ts" | head -20
grep -rn "berater_profiles" worker/src/ --include="*.ts" | head -20
```

- `berater_profiles` (plural, 17 Spalten) ist kanonisch
- `berater_profile` (singular, 11 Spalten) ist Legacy
- Ändere ALLE Queries die `berater_profile` (singular) referenzieren → `berater_profiles`
- Prüfe ob Spalten-Mapping nötig ist
- Erstelle Migration um Daten zu konsolidieren

---

### STEP 10 — TASK-044: Nachrichten Endpoint verifizieren

```bash
grep -rn "nachrichten\|Nachricht" worker/src/ --include="*.ts" -l
grep -rn "getNachrichten\|sendeNachricht" lib/api/ --include="*.ts"
```

- Prüfe ob `/api/netzwerk/nachrichten` auf dem Haupt-Worker existiert
- Wenn NICHT: Prüfe ob es auf dem CHECK Worker existiert
- Wenn auf CHECK Worker: Port den Endpoint zum Haupt-Worker
- Wenn nirgends: Erstelle einen einfachen Nachrichten-Endpoint:

```typescript
// worker/src/routes/nachrichten.ts
import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'

const nachrichten = new Hono()

nachrichten.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  const anfrageId = c.req.query('anfrageId')
  const db = c.env.BAFA_DB
  const messages = await db.prepare(
    'SELECT * FROM nachrichten WHERE anfrage_id = ? AND (sender_id = ? OR empfaenger_id = ?) ORDER BY created_at ASC'
  ).bind(anfrageId, userId, userId).all()
  return c.json({ nachrichten: messages.results })
})

nachrichten.post('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  const { anfrageId, nachricht } = await c.req.json()
  const db = c.env.BAFA_DB
  await db.prepare(
    'INSERT INTO nachrichten (anfrage_id, sender_id, nachricht, created_at) VALUES (?, ?, ?, datetime("now"))'
  ).bind(anfrageId, userId, nachricht).run()
  return c.json({ success: true }, 201)
})

export default nachrichten
```

- Registriere in `worker/src/index.ts`: `app.route('/api/netzwerk/nachrichten', nachrichten)`
- Erstelle Migration für nachrichten Tabelle falls nötig
- Update `lib/api/check.ts` oder `lib/api/fund24.ts`: `getNachrichten` und `sendeNachricht` müssen `API.FUND24` nutzen (nicht `API.CHECK`)

---

### STEP 11 — TASK-045: lib/api/check.ts aufräumen

**Dateien:** `lib/api/check.ts` und `lib/api/fund24.ts`

```bash
# Finde alle check.ts Exports die noch importiert werden
grep -rn "from.*check" app/ components/ --include="*.tsx" --include="*.ts" | grep "lib/api/check"
```

- Identifiziere welche check.ts Exports NOCH von Pages/Components importiert werden
- Für JEDEN noch genutzten Export: Prüfe ob ein Äquivalent in fund24.ts existiert
  - Wenn ja: Ändere den Import auf fund24.ts
  - Wenn nein: Verschiebe die Funktion nach fund24.ts (mit korrektem API.FUND24 Base)
- Wenn check.ts komplett leer ist: Lösche die Datei
- Wenn nicht: Lasse nur die wirklich einzigartigen Funktionen übrig und markiere mit `// TODO: migrate to fund24.ts`

---

### STEP 12 — COMMIT + Push + PR
```bash
git add -A
git commit -m "backend: Phase 5 — AI quota, indexes, table consolidation, nachrichten

- TASK-034: AI quota daily limit (50 calls/user/day) + ai_quota_daily table
- TASK-035: Soft-delete für news_articles (deleted_at column)
- TASK-036: requireAuth auf /api/me/* Handlers
- TASK-037: 15+ DB indexes auf kritische Tabellen
- TASK-038: Backup erweitert auf alle 5 D1 Databases
- TASK-039: Favorites Konsolidierung vorbereitet (Code → kanonische Tabelle)
- TASK-040: Legacy antraege Queries → antraege_v2 migriert
- TASK-041: Audit logs Konsolidierung vorbereitet
- TASK-042: berater_profile → berater_profiles vereinheitlicht
- TASK-044: Nachrichten Endpoint verifiziert/erstellt
- TASK-045: lib/api/check.ts Legacy-Imports → fund24.ts migriert

MIGRATION HINWEIS: Neue SQL-Dateien in worker/db/migrations/ — bitte manuell:
wrangler d1 migrations apply [DB_NAME] --remote

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin fix/nacht3-backend-hardening

gh pr create --base main --title "backend: Nacht 3 — Backend Hardening + DB Indexes (Phase 5)" --body "$(cat <<'EOF'
## Summary
Implementiert Phase 5 aus dem Execution Plan.

### Highlights
- **AI Quota**: Max 50 AI-Calls pro User pro Tag
- **15+ DB Indexes** auf kritische Tabellen (antraege_v2, berater_profiles, unternehmen, etc.)
- **Soft-Delete** für News (deleted_at statt DELETE)
- **Auth** auf /api/me/* Endpoints
- **Favorites** Konsolidierung auf kanonische Tabelle
- **Nachrichten** Endpoint erstellt/verifiziert
- **check.ts → fund24.ts** Migration

### ⚠️ Manuelle Schritte nach Merge
```bash
wrangler d1 migrations apply [BAFA_DB_NAME] --remote
```

## Test plan
- [ ] AI-Calls > 50/Tag → 429 "Tägliches Limit erreicht"
- [ ] News löschen → deleted_at gesetzt, nicht physical delete
- [ ] /api/me/* ohne Auth → 401
- [ ] DB Queries: Prüfe ob Indexes genutzt werden (EXPLAIN)
- [ ] Backup: Alle 5 DBs im R2 Bucket
- [ ] Favoriten: Nur eine Tabelle wird geschrieben/gelesen
- [ ] Nachrichten: GET + POST funktionieren

🤖 Generated with Claude Code
EOF
)"
```

**STOP.** Session fertig.
