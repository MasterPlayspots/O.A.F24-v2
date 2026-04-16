# ANTIGRAVITY NACHT 5 — Feature Completion + Dead Code Cleanup

Du arbeitest im O.A.F24-v2 Repo (fund24.io). Next.js 15 + Cloudflare Workers (Hono).
Dein Auftrag: Phase 7 (Features) + Phase 8 (Cleanup) aus `docs/analysis/EXECUTION_PLAN_2026-04-16.md`.

**WICHTIG:** "Edit automatically" ist AN. Du commitest SELBST. Kein User-Input nötig.

---

## ABLAUF

### STEP 0 — Setup
```bash
git checkout main && git pull origin main
git checkout -b fix/nacht5-features-cleanup
```

Lies `docs/analysis/EXECUTION_PLAN_2026-04-16.md`.

---

## TEIL A — Feature Completion (Phase 7)

### STEP 1 — TASK-049: PDF Export für Fördercheck-Ergebnisse (G-P5-02)

**Dateien:**
- `app/foerdercheck/[sessionId]/ergebnisse/page.tsx`

Finde den disabled PDF-Button (suche nach `handleDownloadPDF` oder `PDF-Download wird in Kürze`).

**1. Installiere PDF-Library (falls nicht vorhanden):**
```bash
npm list jspdf 2>/dev/null || npm install jspdf jspdf-autotable --save
```
Falls jspdf nicht gewünscht — nutze die Browser Print API als Fallback.

**2. Erstelle `lib/pdf/foerdercheck-report.ts`:**
```typescript
'use client'

export async function generateFoerdercheckPDF(data: {
  sessionId: string
  unternehmen: string
  programme: Array<{
    name: string
    foerderbetrag?: string
    foerderart?: string
    beschreibung?: string
    score?: number
  }>
  erstelltAm: string
}) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  doc.text('Fördercheck Ergebnisse', 20, 25)

  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text(`Unternehmen: ${data.unternehmen}`, 20, 35)
  doc.text(`Erstellt am: ${data.erstelltAm}`, 20, 42)
  doc.text(`Session: ${data.sessionId}`, 20, 49)

  // Trennlinie
  doc.setDrawColor(226, 232, 240)
  doc.line(20, 54, 190, 54)

  // Programm-Tabelle
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text(`${data.programme.length} passende Förderprogramme`, 20, 64)

  const tableData = data.programme.map((p, i) => [
    String(i + 1),
    p.name,
    p.foerderart || '-',
    p.foerderbetrag || '-',
    p.score ? `${p.score}%` : '-',
  ])

  ;(doc as any).autoTable({
    startY: 70,
    head: [['#', 'Programm', 'Förderart', 'Betrag', 'Match']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20 },
    },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`fund24.io — Seite ${i} von ${pageCount}`, 20, 287)
    doc.text('Vertraulich', 170, 287)
  }

  doc.save(`foerdercheck-${data.sessionId}.pdf`)
}
```

**3. Ersetze den Handler in ergebnisse/page.tsx:**
```typescript
import { generateFoerdercheckPDF } from '@/lib/pdf/foerdercheck-report'

const handleDownloadPDF = async () => {
  try {
    await generateFoerdercheckPDF({
      sessionId: params.sessionId,
      unternehmen: ergebnisse?.unternehmen?.firma || 'Unbekannt',
      programme: ergebnisse?.programme || [],
      erstelltAm: new Date().toLocaleDateString('de-DE'),
    })
    toast.success('PDF wurde heruntergeladen')
  } catch (err) {
    console.error('PDF generation failed:', err)
    toast.error('PDF konnte nicht erstellt werden')
  }
}
```

**4. Button enablen:**
- Entferne `disabled` vom Button
- Entferne den `alert('PDF-Download wird in Kürze implementiert')` komplett
- Passe die Daten-Struktur an das was `ergebnisse` tatsächlich enthält (lies die Seite um das Shape zu verstehen)

---

### STEP 2 — TASK-050: BAFA-Cert Upload PR #26 prüfen

```bash
# Schau ob PR #26 Änderungen da sind
gh pr view 26 --json state,title,files 2>/dev/null || echo "gh nicht verfügbar"
git log --all --oneline | grep -i "bafa\|cert" | head -5
git branch -a | grep -i cert
```

Wenn ein Branch für BAFA-Cert existiert:
- Cherry-pick die relevanten Commits: `git cherry-pick <hash>`
- Löse Konflikte wenn nötig
- Wenn der Branch zu alt ist / zu viele Konflikte: Überspringe und dokumentiere in einem TODO-Kommentar

Wenn kein Branch gefunden wird: Erstelle die Basis-Struktur:
- `app/dashboard/berater/zertifizierung/page.tsx` — Upload-Formular
- Worker-Route: `worker/src/routes/bafa-cert.ts` — R2 Upload Handler

---

### STEP 3 — TASK-051: BAFA_CERTS R2 Binding

**Dateien:** `worker/wrangler.toml`

Prüfe ob ein R2 Bucket Binding für Zertifikate existiert:
```bash
grep -A 2 "r2_buckets\|bucket_name" worker/wrangler.toml
```

Wenn BAFA_CERTS fehlt, füge hinzu:
```toml
[[r2_buckets]]
binding = "BAFA_CERTS"
bucket_name = "bafa-certs"
```

Ergänze den Env-Type:
```typescript
// worker/src/types.ts oder env.ts
BAFA_CERTS: R2Bucket
```

---

### STEP 4 — COMMIT Phase 7
```bash
git add -A
git commit -m "feat: Phase 7 — PDF Export, BAFA-Cert prep, R2 binding

- TASK-049: Real PDF export für Fördercheck-Ergebnisse (jspdf + autotable)
- TASK-050: BAFA-Cert Upload Basis-Struktur
- TASK-051: BAFA_CERTS R2 Binding in wrangler.toml
- TASK-052: (skipped — autosave improvement deferred)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## TEIL B — Dead Code Cleanup (Phase 8)

### STEP 5 — TASK-053: Dead Frontend Wrapper Exports entfernen

**Dateien:** `lib/api/fund24.ts`, `lib/api/berater.ts`, `lib/api/unternehmen.ts`, `lib/api/check.ts`

Diese Exports werden von KEINER Seite importiert:

```bash
# Verifiziere für jeden Export
for fn in getStats verifyEmail deleteDokument deleteAdminNews addFavorit listExpertise listDienstleistungen getUnternehmen createTrackerVorgang deleteTrackerVorgang; do
  echo "=== $fn ==="
  grep -rn "$fn" app/ components/ --include="*.ts" --include="*.tsx" | grep -v "lib/api/" | head -3
  echo ""
done
```

Für JEDEN Export der NULL Ergebnisse hat (kein Import außerhalb von lib/api/):
- Lösche die Funktion aus der Datei
- Lösche den Export

**VORSICHT:** Manche könnten dynamisch importiert werden. Prüfe auch:
```bash
grep -rn "getStats\|verifyEmail\|deleteDokument" . --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "lib/api/"
```

---

### STEP 6 — TASK-054: EmptyState.tsx löschen

```bash
# Verifiziere
grep -rn "EmptyState" app/ components/ lib/ --include="*.ts" --include="*.tsx" | grep -v "EmptyState.tsx"
```

Wenn keine Imports gefunden: `rm components/shared/EmptyState.tsx`

---

### STEP 7 — TASK-055: Unused npm Dependencies entfernen

```bash
# Verifiziere
grep -rn "@tailwindcss/typography" app/ components/ lib/ styles/ *.css --include="*.ts" --include="*.tsx" --include="*.css" --include="*.js"
grep -rn "react-query-devtools\|ReactQueryDevtools" app/ components/ lib/ --include="*.ts" --include="*.tsx"
```

Wenn keine Imports:
```bash
npm uninstall @tailwindcss/typography @tanstack/react-query-devtools
```

---

### STEP 8 — TASK-056: Dead Worker Endpoints dokumentieren

**NICHT automatisch löschen** — zu riskant. Stattdessen:

```bash
# Finde alle registrierten Endpoints
grep -rn "\.get\|\.post\|\.put\|\.patch\|\.delete" worker/src/routes/ --include="*.ts" | grep -v "//" | wc -l
```

Erstelle `docs/analysis/DEAD_ENDPOINTS_TRIAGE.md`:

```markdown
# Dead Endpoint Triage — Manual Review Required

## Method
Cross-referenced Phase 3 endpoint inventory with:
1. Frontend lib/api/* imports
2. Frontend fetch() calls
3. External webhook callers (Stripe, cron)

## Candidates for Removal (50)
[Liste aus 05_gap_analysis.json → dead_endpoints_sample]

## Rules
- ❌ DO NOT delete if: admin-only, cron-triggered, webhook receiver
- ✅ SAFE to delete if: no frontend caller AND no external caller AND not in middleware chain
- ⚠️ MANUAL CHECK: run `grep -rn "ENDPOINT_PATH" . --include="*.ts"` before each deletion
```

Populliere die Liste aus den Audit-Daten.

---

### STEP 9 — TASK-057 + TASK-058: Dead Table Drop Migrationen vorbereiten

**ERSTELLE Migration-Datei** (nächste Nummer) — aber KOMMENTIERE alle DROP-Statements aus:

```sql
-- 0XX-drop-dead-tables.sql
-- ⚠️ UNCOMMENT AFTER 48h ERROR-FREE OPERATION POST-NACHT-4

-- Confirmed dead tables (no reader, no writer):
-- DROP TABLE IF EXISTS call_log;
-- DROP TABLE IF EXISTS caller_sessions;
-- DROP TABLE IF EXISTS password_reset_tokens;
-- DROP TABLE IF EXISTS rechtsrahmen;
-- DROP TABLE IF EXISTS kombinationsregeln;
-- DROP TABLE IF EXISTS foerder_kombinationen;
-- DROP TABLE IF EXISTS bafa_custom_templates;
-- DROP TABLE IF EXISTS bafa_phasen;
-- DROP TABLE IF EXISTS bafa_vorlagen;
-- DROP TABLE IF EXISTS forum_antworten;
-- DROP TABLE IF EXISTS forum_threads;
-- DROP TABLE IF EXISTS forum_upvotes;
-- DROP TABLE IF EXISTS forum_posts;
-- DROP TABLE IF EXISTS businessplaene;
-- DROP TABLE IF EXISTS foerderkonzepte;
-- DROP TABLE IF EXISTS foerderplaene;

-- Legacy tables (superseded, data migrated in Nacht 3+4):
-- DROP TABLE IF EXISTS antraege;  -- replaced by antraege_v2
-- DROP TABLE IF EXISTS berater_profile;  -- replaced by berater_profiles
```

---

### STEP 10 — TASK-059: createAntrag Response Normalization aufräumen

**Dateien:** `lib/api/fund24.ts`

Finde `createAntrag` (suche nach dem 3-Shape-Normalizer):
```typescript
return { id: r.data?.caseId ?? r.case?.id ?? r.id ?? '' }
```

- Prüfe welche Response-Shape der Worker AKTUELL returned:
```bash
grep -A 10 "POST.*antrag\|case" worker/src/routes/ --include="*.ts" -r | grep "c.json\|return.*json"
```
- Vereinfache den Normalizer auf das EINE aktuelle Format
- Dokumentiere das erwartete Format als Kommentar

---

### STEP 11 — TASK-060: Dead Frontend Calls dokumentieren

Erstelle `docs/analysis/DEAD_FRONTEND_CALLS.md`:

```markdown
# Dead Frontend API Calls — Triage

## 40 Frontend Wrappers with No Matching Worker Endpoint

These functions in lib/api/* call endpoints that don't exist on either worker:

| Function | File | Endpoint | Action |
|---|---|---|---|
| getStats | fund24.ts | GET /api/stats | DELETE — no handler |
| getFilterOptions | fund24.ts | GET /api/filter-options | DELETE — no handler |
| ... | ... | ... | ... |

## Already Fixed
- getProgramme / getProgramm → fixed in Phase A (H-P1-01)

## Needs Manual Verification
[Functions where the endpoint MIGHT exist under a different path]
```

Populliere aus `docs/analysis/full-audit/05_gap_analysis.json` oder `03_api_backend.json`:
```bash
git show origin/audit/phase-6-final-report:docs/analysis/full-audit/05_gap_analysis.json > /tmp/05_gaps.json
cat /tmp/05_gaps.json | grep -A 3 "unmatched"
```

---

### STEP 12 — COMMIT + Push + PR
```bash
git add -A
git commit -m "cleanup: Phase 7+8 — PDF export, dead code removal, triage docs

Phase 7 (Features):
- TASK-049: Real PDF export für Fördercheck-Ergebnisse
- TASK-050: BAFA-Cert upload Basis-Struktur
- TASK-051: BAFA_CERTS R2 Binding

Phase 8 (Cleanup):
- TASK-053: 10 dead frontend exports entfernt
- TASK-054: EmptyState.tsx entfernt
- TASK-055: 2 unused npm deps entfernt
- TASK-056: Dead endpoints triage dokumentiert (50 Kandidaten)
- TASK-057/058: Drop-Migration vorbereitet (auskommentiert)
- TASK-059: createAntrag Response Normalizer vereinfacht
- TASK-060: Dead frontend calls dokumentiert

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin fix/nacht5-features-cleanup

gh pr create --base main --title "cleanup: Nacht 5 — Features + Dead Code (Phase 7+8)" --body "$(cat <<'EOF'
## Summary
Implementiert Phase 7 (Features) und Phase 8 (Dead Code Cleanup).

### Phase 7 — Features
- **PDF Export**: Fördercheck-Ergebnisse als PDF downloadbar (jspdf)
- **BAFA-Cert**: Upload-Basis + R2 Binding vorbereitet
- Button auf /foerdercheck/[id]/ergebnisse ist jetzt ENABLED

### Phase 8 — Cleanup
- 10 dead API wrapper exports gelöscht
- EmptyState.tsx gelöscht
- 2 unused npm deps entfernt
- Drop-Migration für 18 dead tables VORBEREITET (auskommentiert)
- Triage-Dokumente für 50 dead endpoints + 40 dead frontend calls

### ⚠️ Dead Table Drops
Die DROP TABLE Statements in der Migration sind AUSKOMMENTIERT.
Erst uncomment NACH 48h fehlerfreiem Betrieb post-Nacht-4.

## Test plan
- [ ] /foerdercheck/[id]/ergebnisse: PDF Button klickbar → PDF Downloaded
- [ ] PDF enthält Programm-Liste mit Name, Betrag, Match-Score
- [ ] npm audit: keine neuen Vulnerabilities
- [ ] Build: keine fehlenden Imports nach Löschungen
- [ ] `npm run build` erfolgreich

🤖 Generated with Claude Code
EOF
)"
```

**STOP.** Session fertig. Alle 5 Nächte sind abgeschlossen.
