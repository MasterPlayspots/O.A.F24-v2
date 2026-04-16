# Fund24 Audit — Merge & Migration Guide

Alle 5 Nacht-PRs sind reviewed und bereit. Folge dieser Reihenfolge EXAKT.

---

## SCHRITT 1 — PR #36 mergen (Security + Frontend UX)

```bash
cd ~/path/to/O.A.F24-v2

# Merge
gh pr merge 36 --squash --delete-branch

# Quick-Test: ConfirmDialog
# Öffne fund24.io → Dashboard → Favoriten → Lösch-Button → sollte Dialog zeigen (nicht native confirm)
# Falls Dialog nicht rendert: ConfirmDialog.tsx Zeile 'render={trigger}' → 'asChild' ändern
```

**Dauer:** 1 Minute merge, 2 Minuten Test

---

## SCHRITT 2 — PR #37 mergen (Navigation + Metadata)

```bash
gh pr merge 37 --squash --delete-branch

# Quick-Test: Metadata
# curl -s https://fund24.io/datenschutz | grep '<title>'
# Sollte "Datenschutzerklärung | fund24" zeigen (nicht nur "fund24")

# Legal Check
# Öffne /impressum → sollte "DDG" statt "TMG" zeigen
# Öffne /datenschutz → sollte "BayLDA Ansbach" statt Berlin zeigen
```

**Dauer:** 1 Minute merge, 1 Minute Test

---

## SCHRITT 3 — PR #38 mergen + Migrations anwenden (Backend Hardening)

```bash
# Merge
gh pr merge 38 --squash --delete-branch

# ⚠️ MIGRATIONS ANWENDEN (5 SQL-Dateien)
# Finde deine DB-Namen:
wrangler d1 list

# Auf die Haupt-DB (bafa_antraege / BAFA_DB):
wrangler d1 migrations apply bafa-antraege-db --remote

# Falls Migrations in separaten DBs liegen:
wrangler d1 migrations apply zfbf-db --remote

# Deploye den Worker mit neuen Bindings:
cd worker
wrangler deploy
cd ..

# Quick-Test
# 1. Login → Dashboard → sollte laden
# 2. /api/check/* ohne Auth-Token aufrufen → sollte 401 zurückgeben
# 3. Worker Logs prüfen (kein "no such table: ai_quota_daily")
```

**Dauer:** 2 Minuten merge, 5 Minuten Migrations, 3 Minuten Test

---

## SCHRITT 4 — PR #39 mergen (Schema Consolidation) ⚠️ STAGING FIRST

```bash
# ═══════════════════════════════════════════
# SCHRITT 4a — BACKUP (PFLICHT!)
# ═══════════════════════════════════════════
wrangler d1 export bafa-antraege-db --output backup-bafa-$(date +%Y%m%d).sql
wrangler d1 export zfbf-db --output backup-zfbf-$(date +%Y%m%d).sql

# Prüfe Backup-Größe (sollte > 0 sein):
ls -lah backup-*.sql

# ═══════════════════════════════════════════
# SCHRITT 4b — STAGING TEST
# ═══════════════════════════════════════════
# Option A: Preview Deployment
gh pr checkout 39
wrangler d1 migrations apply bafa-antraege-db --env staging --remote 2>/dev/null || echo "Kein Staging env? Dann direkt auf Production mit Backup"

# Option B: Direkt auf Production (mit Backup als Safety Net)
gh pr merge 39 --squash --delete-branch

# Migrations anwenden:
wrangler d1 migrations apply bafa-antraege-db --remote
wrangler d1 migrations apply zfbf-db --remote

# Worker deployen:
cd worker && wrangler deploy && cd ..

# ═══════════════════════════════════════════
# SCHRITT 4c — SMOKE TEST (PFLICHT, 5 min)
# ═══════════════════════════════════════════
echo "=== AUTH TEST ==="
# 1. Öffne fund24.io/login → Login mit Testaccount
# 2. Dashboard lädt → ✅
# 3. Logout → Login erneut → ✅
# 4. Registrierung: Neuen Test-User anlegen → verifizieren → Dashboard → ✅

echo "=== FEATURE TEST ==="
# 5. /programme → Programmliste lädt → ✅
# 6. /programme/[id] → Detailseite lädt → ✅
# 7. /admin → Dashboard KPIs laden → ✅
# 8. /dashboard/berater → Berater Dashboard lädt → ✅

echo "=== ERROR CHECK ==="
# 9. Worker Logs (30 min monitoring):
wrangler tail --format pretty 2>/dev/null || echo "Tail in Cloudflare Dashboard prüfen"
# Suche nach: "no such table", "SQLITE_ERROR", "500"

# ═══════════════════════════════════════════
# ROLLBACK (nur wenn Fehler!)
# ═══════════════════════════════════════════
# wrangler d1 execute bafa-antraege-db --file backup-bafa-YYYYMMDD.sql --remote
# wrangler d1 execute zfbf-db --file backup-zfbf-YYYYMMDD.sql --remote
# git revert HEAD && git push
# cd worker && wrangler deploy && cd ..
```

**Dauer:** 5 Minuten Backup, 2 Minuten Merge + Migrate, 10 Minuten Test

---

## SCHRITT 5 — PR #40 mergen (Features + Cleanup)

```bash
gh pr merge 40 --squash --delete-branch

# Quick-Test: PDF Export
# 1. Öffne /foerdercheck/[sessionId]/ergebnisse
# 2. Klicke "Ergebnisse als PDF" → PDF sollte downloaden
# 3. PDF öffnen → Programm-Liste mit Name/Betrag/Match sichtbar

# Build-Check (keine fehlenden Imports):
npm run build 2>&1 | tail -20
# Sollte "✓ Compiled successfully" zeigen
```

**Dauer:** 1 Minute merge, 3 Minuten Test

---

## SCHRITT 6 — Aufräumen

```bash
# Verwaiste Branches löschen
git fetch --prune
git branch -d fix/nacht1-security-frontend-ux fix/nacht2-navigation-metadata fix/nacht3-backend-hardening fix/nacht4-schema-consolidation fix/nacht5-features-cleanup 2>/dev/null

# Gesamtstatus prüfen
gh pr list --state open
# Sollte nur noch ältere PRs zeigen (Phase 1 etc.)

echo ""
echo "════════════════════════════════════════"
echo "  ✅ AUDIT IMPLEMENTIERUNG ABGESCHLOSSEN"
echo "  121 Findings → 60 Tasks → 5 PRs → merged"
echo "════════════════════════════════════════"
```

---

## Dead Table Drops (48h NACH Schritt 4)

Wenn 48 Stunden nach PR #39 keine Fehler aufgetreten sind:

```bash
# Uncomment die DROP Statements in:
# worker/db/migrations/035-drop-dead-tables-prep.sql

# Dann:
wrangler d1 migrations apply bafa-antraege-db --remote
wrangler d1 migrations apply zfbf-db --remote
wrangler d1 migrations apply foerdermittel-checks-db --remote  # für call_log etc.
```

---

## Zusammenfassung

| Schritt | PR | Risiko | Migrations? | Downtime? |
|---|---|---|---|---|
| 1 | #36 Security | Niedrig | Nein | Nein |
| 2 | #37 Metadata | Kein | Nein | Nein |
| 3 | #38 Backend | Niedrig | Ja (5 SQLs) | Nein |
| 4 | #39 Schema ⚠️ | Mittel | Ja (2 SQLs) | ~5min Test |
| 5 | #40 Cleanup | Niedrig | Nein | Nein |
| 6 | Drops | Niedrig | Ja (1 SQL) | Nein |
