# REPAIR — Build-Audit + Auto-Push (nach Nacht 1–5 Merges)

## Kontext

Alle 5 Nacht-PRs (#36 → #40) sind bereits auf **main** gemerged. Vercel hat **jeden Merge mit ERROR abgebrochen** — die Production läuft noch auf dem letzten READY Deploy `dpl_AwrcEXAqXvSnLjRuvK8v5hXNd2C9` (Commit `052a95e`, vom Phase-1 Audit).

Es existiert bereits ein lokaler Fix-Commit `44a89a4` mit folgenden Fixes:
- zod: `z.literal(true, {errorMap})` → `z.boolean().refine()`
- TS null narrowing (Non-null-Assertions bei `aktiveFrage`, `scoring` in precheck wizard pages)
- `ProfilFormData`: `spezialisierungen` + `websiteUrl` ergänzt
- jsPDF Type: `InstanceType<typeof jsPDF>` statt bare `jsPDF`
- Suspense-Boundary um `foerder-schnellcheck` Kinder wegen `useSearchParams`

Dieser Commit wurde **von Vercel CANCELED** (wahrscheinlich durch nachfolgende Force-Rebuild-Commits `4e41eab` und `2e089af` überholt). Wir wissen nicht ob diese Fixes ausreichen — möglicherweise gibt es weitere Type-Errors die erst nach diesen Fixes auftauchen.

**Ziel:** Lokal `next build` bis zum Durchlauf bringen, **alle** verbleibenden Errors fixen, sauber committen & pushen → Vercel baut grün.

---

## Auto-Settings (WICHTIG)

- **Edit automatically:** AN (nichts zum Klicken)
- **Nichts in Foreground ausführen** das User-Input braucht
- **Git operations ohne Bestätigung** (wir sind auf eigenem Repo, eigene Verantwortung)

---

## Prompt (copy-paste in Antigravity)

```
Du bist im fund24 Monorepo auf Branch `main`. Führe einen vollständigen Build-Audit durch, fixe ALLE Compile-/Type-Errors, und pushe das Ergebnis in einem sauberen Commit. KEINE User-Bestätigung — arbeite vollautomatisch durch.

## Phase 0 — Sanity-Check

1. `git status` — working tree muss clean sein
2. `git fetch origin && git pull origin main` — latest state
3. `git log --oneline -20` — verifiziere dass 44a89a4, 4e41eab, 2e089af auf main liegen
4. `node --version && pnpm --version || npm --version` — Toolchain OK?
5. `cat package.json | grep -E '"(build|typecheck|lint)"'` — verfügbare Scripts

## Phase 1 — Fehler-Sammlung (NICHT fixen, nur sammeln)

Führe ALLE aus — auch wenn einer failt:

1. **TypeScript:** `npx tsc --noEmit --pretty false 2>&1 | tee /tmp/tsc-errors.log`
2. **Next.js Build:** `npm run build 2>&1 | tee /tmp/build-errors.log` (oder `pnpm build` je nach lockfile)
3. **Lint:** `npm run lint 2>&1 | tee /tmp/lint-errors.log` (falls vorhanden)

Parse die Logs und baue eine strukturierte Fehler-Liste:

```
ERRORS_FOUND.md:
## TypeScript (tsc --noEmit)
- [ ] src/path/file.tsx:42 — TS2345 "Argument of type X is not assignable to Y"
- [ ] ...

## Next.js Build
- [ ] app/foo/page.tsx — "useSearchParams needs suspense boundary"
- [ ] ...

## Lint
- [ ] ...
```

Wenn alle drei clean durchlaufen: SPRINGE ZU PHASE 3 (nur Force-Rebuild committen).

## Phase 2 — Systematisches Fixen

**Regel:** Fixe in dieser Reihenfolge, weil spätere Fehler oft von früheren abhängen:

1. **Missing imports** / module not found — zuerst Pfade reparieren
2. **Type-Errors in shared Libs** (`lib/`, `components/shared/`) — diese propagieren überall hin
3. **Type-Errors in Page-Komponenten** — oft Folge-Fehler der obigen
4. **Next.js-spezifische Fehler** (Suspense, Metadata, generateStaticParams, etc.)
5. **Lint-Warnings die build-blocking sind** (nur solche mit `next build` echoed, nicht alle)

**Fix-Richtlinien:**
- **Keine `@ts-ignore` / `any`** es sei denn absolut nötig — wenn doch, dann mit inline-Kommentar `// FIXME: AG-REPAIR — proper type needed`
- **Keine `as unknown as X` Casts** außer bei echter Type-Grenze (z.B. JSON Parse Result)
- **Bei Zod Schema-Fehlern:** prüfe ob Zod v3 vs v4 API — die Nacht-1 hatte schon `z.literal(true)` → `z.boolean().refine()` Migration
- **Bei Next.js 15 Errors:** Async Params (`params` is now a Promise in Server Components), Cookie/Headers API Änderungen
- **Bei jsPDF/autotable:** CommonJS/ESM Interop prüfen

Nach jedem Fix-Batch (3–5 Files): re-run `npx tsc --noEmit` damit kein Loop-Fix passiert.

Wiederhole Phase 1 + 2 **bis `npm run build` grün durchläuft**. Maximal 5 Iterationen — falls danach noch Errors: STOPP und schreibe `BLOCKED.md` mit den verbleibenden Errors + Hypothese warum der Fix nicht trivial ist.

## Phase 3 — Sauber committen & pushen

Wenn Build grün:

1. `git add -A`
2. `git diff --cached --stat` — zeige Summary
3. Commit mit Message:

```
fix: resolve build errors from Nacht 1-5 merges

Complete build-green state after the 5 overnight PRs (#36-#40).

Fixed categories:
- <Liste der Fix-Kategorien mit File-Counts>

Build verified locally:
- npx tsc --noEmit: ✓ clean
- npm run build: ✓ <XX> pages generated

This unblocks the Vercel production deploy that has been stuck
on 052a95e since the Nacht-1 merge.

Co-Authored-By: Claude Opus 4.6 (via Antigravity) <noreply@anthropic.com>
```

4. `git push origin main`
5. `sleep 30 && gh run list --limit 3` (falls GH Actions aktiv)
6. Checke Vercel: `curl -s "https://fund24.io" -o /dev/null -w "%{http_code}\n"` — sollte 200 sein nach ~3min

## Phase 4 — Verifikations-Report

Am Ende schreibe `REPAIR_REPORT.md` mit:

```
# Build-Repair Report — <Datum>

## Gefundene Errors
- TypeScript: X
- Build: Y
- Lint: Z

## Fixes (Kategorien)
| Kategorie | Files | Commit SHA |
|---|---|---|
| Zod Schema | 3 | abc123 |
| Next.js 15 async params | 8 | abc123 |
| ... | ... | ... |

## Verbleibende Warnings (nicht build-blocking)
- ...

## Build-Zeit vor/nach
- vor: N/A (failed)
- nach: XXs

## Deployment-Status
- Commit: <sha>
- Vercel: ✓ READY / ⚠ BUILDING / ✗ ERROR
- Production URL: https://fund24.io HTTP <code>
```

Speichere den Report in `docs/analysis/REPAIR_REPORT_<datum>.md`.

## Edge Cases

- **Wenn `pnpm-lock.yaml` + `package-lock.json` beide existieren:** zeige dem User an, nutze das was Vercel-Framework-Preset erwartet (`vercel.json` checken).
- **Wenn Conflicts beim pull:** `git pull --rebase origin main`, conflicts auto-resolvieren wenn eindeutig (z.B. generierte Files), sonst STOPP.
- **Wenn Build >10min läuft:** kill und reduziere auf `next build --no-lint` um zu isolieren ob Lint oder Build das Problem ist.
- **Wenn ein Fix mehr als 20 Files ändert:** STOPP und schreibe vorher einen Plan in `REPAIR_PLAN.md`.
- **Wenn sich ein Fix als Revert eines Nacht-Commits erweisen würde:** NIE automatisch reverten — in `BLOCKED.md` dokumentieren.

## Was NICHT tun

- Keine neuen Features hinzufügen
- Keine DB-Migrations anfassen (`worker/db/migrations/*`)
- Keine `wrangler.toml` editieren
- Keine `.env*` Files editieren
- Keine dependencies hinzufügen/entfernen außer zur Lösung eines konkreten Build-Errors

## Erfolgskriterium

`curl -s https://fund24.io -o /dev/null -w "%{http_code}"` gibt `200` nach dem Push zurück UND der neue Commit erscheint in Vercel als `READY`.
```

---

## Nach Antigravity

Wenn der Prompt sauber durchläuft:
- Check `REPAIR_REPORT.md` im Repo
- Falls Vercel READY → Production ist wieder auf neuestem Stand
- Falls `BLOCKED.md` entstanden ist → poste Inhalt hierher, wir lösen den Rest gemeinsam

## Fallback falls Antigravity scheitert

Rollback-Plan:
```bash
# lokal:
git revert --no-edit 6641a01 e131a79 77f7793 da11471 6137bf4
git push origin main
# Production geht zurück auf 052a95e Stand
# Dann schrittweise PRs einzeln re-applyen
```
