# ANTIGRAVITY NACHT 4 — Schema Consolidation (C-P4-01 + Deduplizierung)

Du arbeitest im O.A.F24-v2 Repo (fund24.io). Cloudflare Workers (Hono) + 5× D1 DBs.
Dein Auftrag: Phase 6 (Schema Consolidation) aus `docs/analysis/EXECUTION_PLAN_2026-04-16.md`.

**WICHTIG:** "Edit automatically" ist AN. Du commitest SELBST. Kein User-Input nötig.

**⚠️ KRITISCHE PHASE.** Diese Nacht behandelt die `users` Tabelle — das Herzstück der Auth. Du erstellst nur Migration-Dateien und Code-Änderungen. Du führst KEIN `wrangler d1 migrations apply` aus.

---

## ABLAUF

### STEP 0 — Setup + Deep Analysis
```bash
git checkout main && git pull origin main
git checkout -b fix/nacht4-schema-consolidation
```

**Zuerst: Verstehe den Ist-Zustand komplett.**

```bash
# 1. Alle DB-Bindings finden
grep -A 3 "database_name\|binding.*=.*\"" worker/wrangler.toml

# 2. Alle CREATE TABLE users Statements finden
grep -A 40 "CREATE TABLE.*users" worker/db/migrations/*.sql

# 3. Wie werden die DBs im Code referenziert?
grep -rn "c\.env\.\(DB\|BAFA_DB\|FOERDER_DB\|CHECK_DB\|BAFA_CONTENT\)" worker/src/ --include="*.ts" | grep -i "user" | head -30

# 4. Welche DB-Binding wird für Auth genutzt?
grep -rn "users" worker/src/routes/auth.ts | head -20
grep -rn "users" worker/src/middleware/auth.ts 2>/dev/null | head -10
```

Lies auch `docs/analysis/full-audit/04_DB_MAPPING.md`:
```bash
git show origin/audit/phase-6-final-report:docs/analysis/full-audit/04_DB_MAPPING.md > /tmp/04_DB_MAPPING.md
cat /tmp/04_DB_MAPPING.md
```

---

### STEP 1 — TASK-046: Users Table Schema Analyse

**Dokumentiere** in `docs/analysis/SCHEMA_CONSOLIDATION_PLAN.md`:

```markdown
# Users Table Consolidation Plan

## Current State
- DB1 ([Name]): users table with X columns
- DB2 ([Name]): users table with Y columns

## Schema Diff
| Column | DB1 | DB2 | Action |
|---|---|---|---|
| id | TEXT PK | TEXT PK | Keep |
| email | TEXT | TEXT | Keep |
| ... | ... | ... | ... |
| [extra cols in DB2] | ❌ missing | ✅ present | Add to DB1 / Keep in canonical |

## Canonical DB: [DB_NAME]
## Reason: [mehr Spalten / mehr aktive Queries / Auth-Hauptsystem]

## Migration Steps:
1. ALTER TABLE users ADD COLUMN ... (fehlende Spalten)
2. INSERT/UPDATE from Legacy DB
3. Code-Änderungen: alle Queries → kanonische DB
4. Validierung
5. Legacy Table Drop (separate PR)
```

---

### STEP 2 — TASK-046: Migration-Dateien erstellen

Basierend auf der Analyse aus STEP 1:

**Migration A** — Schema erweitern (nächste Nummer):
```sql
-- 0XX-users-schema-consolidation.sql
-- Füge fehlende Spalten zur kanonischen users Tabelle hinzu
-- ACHTUNG: Spaltennamen und Typen aus der Analyse eintragen!

-- Beispiel (anpassen!):
ALTER TABLE users ADD COLUMN IF NOT EXISTS feature_flags TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TEXT;
-- ... weitere fehlende Spalten
```

**WICHTIG:** `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` funktioniert bei D1/SQLite NICHT. 
Nutze stattdessen dieses Pattern:
```sql
-- Prüfe ob Spalte existiert, wenn nicht → hinzufügen
-- SQLite hat kein IF NOT EXISTS für ALTER TABLE
-- Nutze ein separates Migrations-Script das idempotent ist:

-- Nur ausführen wenn Spalte noch nicht existiert:
CREATE TABLE IF NOT EXISTS _migration_check (id INTEGER);
DROP TABLE IF EXISTS _migration_check;

-- Spalten hinzufügen (wird fehlschlagen wenn schon da — das ist OK bei D1 migrations)
ALTER TABLE users ADD COLUMN feature_flags TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN last_login_at TEXT;
```

---

### STEP 3 — TASK-046: Code-Änderungen

Ändere ALLE Worker-Code Stellen die die FALSCHE DB für Users nutzen:

```bash
# Finde alle User-Queries und welche DB sie nutzen
grep -rn "\.prepare.*users" worker/src/ --include="*.ts" | head -40
```

Für JEDE Stelle die die Legacy-DB nutzt:
- Ändere `c.env.LEGACY_DB.prepare(...)` → `c.env.CANONICAL_DB.prepare(...)`
- Passe den DB-Binding-Namen an (der aus der Analyse)

**Auth-Routen sind KRITISCH:**
- `worker/src/routes/auth.ts` — Login, Register, Verify, Refresh Token
- `worker/src/middleware/auth.ts` — JWT Validation, User Lookup
- Alle müssen die GLEICHE DB nutzen

---

### STEP 4 — TASK-047: foerdermittel_* Tabellen Deduplizierung

```bash
# Finde alle foerdermittel_* Tabellen
grep -r "CREATE TABLE.*foerdermittel_" worker/db/migrations/*.sql | sort

# Finde welche DB sie nutzt
grep -rn "foerdermittel_" worker/src/ --include="*.ts" | grep "\.prepare\|\.env\." | head -30
```

**8 Tabellen die in 2 DBs existieren:**
1. foerdermittel_profile
2. foerdermittel_cases
3. foerdermittel_matches
4. foerdermittel_dokumente
5. foerdermittel_funnel_templates
6. foerdermittel_conversations
7. foerdermittel_case_steps
8. foerdermittel_benachrichtigungen

**Vorgehen:**
1. Bestimme kanonische DB (wahrscheinlich die mit den aktuelleren Daten — vermutlich `BAFA_DB`)
2. Ändere ALLE Code-Referenzen auf die kanonische DB
3. Erstelle Migration-Kommentar (kein automatisches Daten-Merge — zu riskant):

```markdown
<!-- In SCHEMA_CONSOLIDATION_PLAN.md ergänzen -->

## foerdermittel_* Tables
Canonical DB: [NAME]
Tables to consolidate: 8

### Manual Steps (post-merge):
1. Export data from legacy DB: `wrangler d1 execute [LEGACY_DB] --command "SELECT * FROM foerdermittel_profile" --json > export.json`
2. Import into canonical: use import script
3. Verify row counts match
4. Drop legacy tables (Nacht 5)
```

---

### STEP 5 — TASK-048: CHECK_DB Unbinding vorbereiten

```bash
# Was nutzt CHECK_DB im main worker?
grep -rn "CHECK_DB\|env\.CHECK" worker/src/ --include="*.ts" | head -20
```

- Wenn nach Nacht 3 (TASK-043) keine Referenzen mehr auf `CHECK_DB` existieren:
  - Entferne das Binding aus `worker/wrangler.toml`
  - Entferne aus dem `Env` Interface (`worker/src/types.ts` oder `worker/src/env.ts`)

- Wenn noch Referenzen existieren:
  - Liste sie auf in `SCHEMA_CONSOLIDATION_PLAN.md`
  - Migriere die Queries zur richtigen DB
  - DANN entferne das Binding

---

### STEP 6 — Validierungsdokumentation erstellen

Erstelle `docs/analysis/MIGRATION_CHECKLIST.md`:

```markdown
# Migration Checklist — Schema Consolidation

## Pre-Migration (vor wrangler apply)
- [ ] Backup aller 5 D1 Databases erstellt (R2)
- [ ] Schema-Diff dokumentiert in SCHEMA_CONSOLIDATION_PLAN.md
- [ ] Alle Code-Änderungen auf fix/nacht4-schema-consolidation Branch
- [ ] Staging-Test: Worker deployed mit neuen Bindings
- [ ] Auth-Flow getestet: Login → Dashboard → Logout → Login

## Migration ausführen
```bash
# 1. Backup
wrangler d1 export [DB_NAME] --output backup-$(date +%Y%m%d).sql

# 2. Schema-Migration
wrangler d1 migrations apply [CANONICAL_DB] --remote

# 3. Daten-Migration (wenn nötig)
# Manuell: INSERT ... SELECT aus Legacy-DB
```

## Post-Migration
- [ ] Auth funktioniert (Login/Logout/Register)
- [ ] Dashboard lädt für Berater + Unternehmen
- [ ] Programm-Suche funktioniert
- [ ] Favoriten laden + speichern
- [ ] Anträge erstellen + bearbeiten
- [ ] Admin-Panel erreichbar
- [ ] Keine 500er in Worker Logs (1h monitoring)

## Rollback (wenn nötig)
```bash
# Restore from backup
wrangler d1 execute [DB_NAME] --file backup-YYYYMMDD.sql
# Revert code
git revert [commit-hash]
wrangler deploy
```

## Legacy Table Drops (ERST nach 48h fehlerfreiem Betrieb)
Werden in Nacht 5 (Phase 8) als separate Migration erstellt.
```

---

### STEP 7 — COMMIT + Push + PR
```bash
git add -A
git commit -m "schema: Phase 6 — users table consolidation + foerdermittel dedup prep

- TASK-046: Users table schema analysis + migration scripts + code changes
  - Documented schema diff in SCHEMA_CONSOLIDATION_PLAN.md
  - All auth queries now target canonical DB
  - Migration SQL prepared (NOT applied)
- TASK-047: foerdermittel_* 8 tables consolidated in code (canonical DB only)
- TASK-048: CHECK_DB binding removal prepared
- Created MIGRATION_CHECKLIST.md for safe rollout

⚠️ REQUIRES MANUAL MIGRATION: See MIGRATION_CHECKLIST.md
Do NOT merge without running migrations on staging first.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin fix/nacht4-schema-consolidation

gh pr create --base main --title "schema: Nacht 4 — Schema Consolidation (Phase 6) ⚠️" --body "$(cat <<'EOF'
## Summary
Phase 6: Schema Consolidation — die kritischste Phase.

### ⚠️ NICHT BLIND MERGEN
Diese PR enthält Migration-Dateien die MANUELL auf Staging getestet werden müssen.

### Was ist drin
- **C-P4-01 (CRITICAL)**: Users table von 2 DBs → 1 kanonische DB
  - Schema-Diff dokumentiert
  - Alle Auth-Queries auf kanonische DB umgestellt
  - Migration SQL vorbereitet
- **TASK-047**: 8 foerdermittel_* Tabellen → kanonische DB im Code
- **TASK-048**: CHECK_DB Binding Entfernung vorbereitet
- **Dokumentation**: SCHEMA_CONSOLIDATION_PLAN.md + MIGRATION_CHECKLIST.md

### Manuelle Schritte
1. `wrangler d1 export` — Backup aller DBs
2. `wrangler d1 migrations apply` — auf Staging
3. Auth-Test: Login → Dashboard → Logout → Login
4. Wenn OK: auf Production anwenden
5. 48h monitoring
6. Legacy Table Drops in separater PR (Nacht 5)

## Test plan
- [ ] ⚠️ Staging Deploy + Auth-Test PFLICHT vor Merge
- [ ] Login funktioniert mit kanonischer DB
- [ ] User-Profil laden + speichern
- [ ] Berater + Unternehmen Dashboard laden
- [ ] Keine 500er in Worker Logs
- [ ] Favoriten, Anträge, Nachrichten funktionieren

🤖 Generated with Claude Code
EOF
)"
```

**STOP.** Session fertig.
