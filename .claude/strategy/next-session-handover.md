# fund24 — Next Session Handover

**Erstellt:** 2026-04-19 (Update nach Sovereign-Apply-Session)
**Vorgänger-Session:** Strategie-Planung 4 Topics → Sovereign-Patch-Apply → Revert → strukturelle Fixes

---

## Wo wir stehen

Produktion ist stabil auf reverted main. fund24.io zeigt die pre-Sovereign Version (Stand 2026-04-19 ~07:40). Die Nacht-Sprint-Sovereign-Patches (Phase 1 Token Root + Phase 2 Semantic Sweep) wurden angewendet, verursachten Light-Mode-Probleme, und wurden als Merge-Revert auf main rückgängig gemacht. Kein Code verloren — die Patches leben noch als Branch `feat/sovereign-design` auf origin.

Strategie-Planung aus der ersten Session dieses Tages ist unverändert gültig. 13 Entscheidungen + 31 Action Items in den Companion-Docs.

**Companion-Dokumente** im selben Ordner (`.claude/strategy/`):

- `strategy-plan.md` — Planungs-Ergebnisse aller 4 Topics + Synthese + Session-1-Plan
- `action-tracker.xlsx` — 6-Tab-Tracker mit Backlog, Roadmap, Open Questions
- `strategy-handover.md` — ursprünglicher Nacht-Sprint-Handover (falls separat committet)

---

## Was seit dem letzten Handover passiert ist

1. Sovereign-Patches aus `~/Downloads/sovereign-final/` wurden auf Branch `feat/sovereign-design` applied:
   - `06a4046 feat(design): apply Sovereign token root (Phase 1)`
   - `e42a572 refactor(design): raw palette → semantic tokens (Phase 2 sweep)`
2. PR #45 aufgemacht — CI zeigte erwartbare 3 Fails (Worker Tests, Docs Check, Vercel canceled), matched Phase-0-Baseline
3. Vercel-Preview failed mit: `Fehlende Umgebungsvariable: NEXT_PUBLIC_SEMANTIC_API_URL`
4. Lesson gelernt: Production-Env-Vars werden NICHT automatisch auf Preview geklont. Folgende zwei Vars fehlen (waren zumindest) im Preview-Environment:
   - `NEXT_PUBLIC_SEMANTIC_API_URL=https://api.fund24.io/semantic`
   - `NEXT_PUBLIC_FUND24_API_URL=https://api.fund24.io`
   Web-UI geöffnet, aber Verifikation steht aus ob sie tatsächlich gesetzt wurden.
5. Dark-Mode-Hotfix committed auf feat/sovereign-design: `5bf6867 fix(design): default to Sovereign dark mode` — Light-Mode war nach Phase 2 visuell kaputt, `className="dark"` im layout.tsx war der Hotfix
6. PR #45 wurde auf unklare Weise gemerged trotz CI-Rot (Vercel Agent Review? UI-Klick?)
7. Production-Deploy live mit kaputter Darstellung
8. Merge-Revert auf main: `ae048e5 Revert "feat/sovereign design (#45)"`, gepusht, produktiv
9. `vercel --prod --yes` wurde zweimal gegen die vereinbarte Regel benutzt → ab jetzt strukturell geblockt (siehe unten)

---

## Phase 0 Status

| # | Task | Owner | Status |
| --- | --- | --- | --- |
| P0.1 | Vercel Commit-Verification-Policy | Noah | ✅ DONE |
| P0.1b | `vercel --prod` strukturell blocken | Noah | ✅ DONE (~/.zshrc function) |
| P0.1c | Git-Identity global setzen | Noah | ✅ DONE (`froeba.kevin@gmail.com` / `Noah`) |
| P0.4 | vercel.json + CLI-Default-Quirk | — | ✅ bestätigt (`--prod --yes` deployed zu prod), Fix via P0.1b |
| P0.2 | Worker-Tests-Failure auf main fixen | Claude | ⏳ unverändert broken |
| P0.3 | Docs-Check-Pipeline fixen oder disablen | Claude | ⏳ unverändert broken |

**Noch offen:** P0.2 + P0.3. Das sind die echten CI-Blocker die jeden PR rot markieren.

---

## Erste Aktion in der nächsten Session — Reihenfolge

1. Repo mounten: `/Users/our.ark./Developer/O.A.F24-v2` (aktiver Clone — von dort wurde gepusht und deployed)
2. Strategy-Bundle installieren — wurde zwei Sessions geplant, nie gemacht. `install.sh` aus Cowork-Output per Drag-Drop aus Finder ins Terminal ziehen. Das schreibt `.claude/strategy/` ins Repo und committet. Nach dem Install sind diese drei Dokumente permanent Teil der Repo-Historie.
3. Preview-Env-Vars verifizieren: `vercel env ls | grep -E "(SEMANTIC|FUND24)_API_URL.*Preview"` — müssen beide existieren, sonst Preview-Deploys weiter broken.
4. **P0.2:** `cd worker && npm test` → Fehlerbild diagnostizieren → fixen oder mit `.skip` temporär stillstellen, Issue aufmachen.
5. **P0.3:** `.github/workflows/docs-check.yml` + `scripts/gen-api-docs.ts` anschauen → entweder fixen oder Check temporär disablen (nicht wegwerfen, er hat einen Grund).
6. Dann Entscheidung Sovereign — siehe unten.

---

## Sovereign — Entscheidung für nächste Session

**Zwei Pfade:**

**A) Revert stehen lassen, Strategy-Plan Session-1-Plan linear folgen.**
Das heißt: globals.css selbst strippen (shadcn-Neutral als Baseline), Hero/Navbar/Footer mit Figma-First-Mock designen, als neue feature-Branches bauen. Saubere Trajektorie. Keine Patches zu re-applyen.

**B) Sovereign re-apply als neuer Branch.**
Dazu Phase-2-Patch kritisch reviewen bevor re-apply — der hatte Light-Mode-Gaps die im Merge nicht auffielen. Dark-Mode-Hotfix (commit `5bf6867`) rauslassen — das war Patch-over-Symptom, nicht Fix.

**Empfehlung:** Pfad A. Sauberer, synchron mit Strategy-Plan, vermeidet Re-Apply-Risiko. Die Sovereign-Patches liegen auf origin und sind Referenz wenn nötig.

---

## Wichtige Regeln (jetzt strukturell enforced)

`vercel --prod` ist geblockt — versuchst du's, kommt `BLOCKED. Use --target preview or push to main.` zurück. Die Funktion lebt in `~/.zshrc`, kann bewusst gelöscht werden aber nicht versehentlich.

**Deploy-Pfade:**

- Preview: `vercel deploy --target preview` oder Branch-Push → Vercel auto-deploys
- Production: `git push origin main` → Vercel auto-deploys (nie via CLI)
- Notfall-Rollback: `vercel rollback <deployment-url> --yes` erlaubt

Preview-Env-Vars sind separat zu setzen — werden NICHT automatisch von Production geklont.

---

## Nebenbefund für Session 1 (unverändert, Revert hat's restored)

In `app/globals.css` ist `--background: #737688` **zweimal definiert**. Light/Dark-Mode haben dieselbe Hintergrundfarbe — Sovereign-Rest. Wird in Session-1-Schritt-1 (globals.css strippen) mit-aufgeräumt.

---

## Strategische Kern-Wahrheiten (unverändert aus Planning-Session)

1. **Haftung = Hybrid-C** (KMU rechtlich, fund24 = Plattform, Berater zusätzlich für eigene Arbeit). AGB-Review beim Anwalt als Pre-Launch-Gate.
2. **Hero-Story = 3 Ebenen, nicht 4.** Empirisch geprüft: keine Kommune-Daten in D1. Neuer Claim: "3.500+ Programme · EU · Bund · alle 16 Bundesländer · wöchentlich aktualisiert".
3. **Berater-Workflow strukturiert** (Multi-Choice, nicht Freitext) — RLHF-Constraint, nicht verhandelbar.
4. **GEO voll committen** ab Tag 1 (Schema.org, atomare Fakten, Q&A, Datum-Marker). Top-10 Queries pending Keyword-Recherche.
5. **Build-Modus ab Session 1 = Figma-First.** Mocks vor Code.

---

## Lessons aus dieser Session

- Nacht-Patches blind re-applyen ist Risiko auch wenn sie "fertig" aussehen. Phase 2 Semantic Sweep hatte Light-Mode-Gaps die im Review nicht auffielen.
- Preview-Env-Vars sind ein häufig übersehener Fallstrick bei neuen Preview-Branches — immer explizit checken.
- Regeln die nur mental enforced sind halten gegen Müdigkeit nicht. Strukturelle Fixes > Willenskraft.
- Wer um 7 Uhr morgens einen Merge revertet sollte eigentlich schon 2h offline sein.
- `vercel promote <preview-url>` ist der legitime Weg von Preview zu Prod wenn nötig — aber Standard-Pfad ist `git push origin main`.
