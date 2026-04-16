# Build-Repair Report — 2026-04-16

## TL;DR

**Code is fine. Vercel is paused.**

Local build (`npm run build`) is **green** at HEAD (`2e089af`). All 5 Nacht-merge type errors were fixed in commit `44a89a4` (already on `main`). The reason production hasn't moved off the phase-1 audit commit (`052a95e`) is that the **Vercel project is in `live: false` state** — every new deploy gets auto-canceled at the queue, never reaches the build stage.

---

## Phase 1 — Error Collection

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit --pretty false` | ✓ 0 errors |
| Next.js Build | `npm run build` | ✓ Compiled successfully, 54/54 pages generated |
| Lint | folded into `next build` | ✓ pass (warnings only — non-blocking) |

**No new errors were found.** The fixes shipped in `44a89a4` are sufficient.

## Phase 2 — Fixes already on main (commit `44a89a4`)

| Category | Files | Notes |
|---|---|---|
| Zod schema | `app/(public)/foerder-schnellcheck/bericht/page.tsx` | `z.literal(true, {errorMap})` API doesn't exist in this zod version → switched to `z.boolean().refine()`; `marketing` made optional without `.default(false)` to keep input/output type symmetric |
| TS null narrowing | `app/(public)/foerder-schnellcheck/chat/page.tsx`, `…/ergebnis/page.tsx` | After `if (shouldRedirect) return null`, TS can't narrow `store.aktiveFrage`/`store.scoring` across the `useEffect` boundary. Added local `const aktiveFrage = store.aktiveFrage!` / `const scoring = store.scoring!` |
| ProfilFormData | `lib/api/berater.ts` | Added `spezialisierungen?: string[]` + `websiteUrl?: string` to the type and wired both into the POST body — fixes Phase-1 H-P1-04 silent data loss permanently |
| jsPDF type | `lib/pdf/foerdercheck-report.ts` | `jsPDF` is a value, not a type — switched annotation to `InstanceType<typeof jsPDF>` |
| Suspense boundary | `app/(public)/foerder-schnellcheck/layout.tsx` | Wrap children in `<Suspense>` because the page now uses `useSearchParams()` (added in Nacht 1 for `?programm=` query); SSG can't prerender without the boundary |

## Phase 3 — Why deploys aren't shipping

```
GET /v1/projects/prj_cBF6Mr2U3bClGc4MKyrUhN33TfLw  →  { "live": false, … }
```

Every git push to `main` since `6641a01` produces a deployment that goes from queued → CANCELED in the same millisecond, with empty build logs:

| Commit | Author | State | buildingAt vs ready |
|---|---|---|---|
| `2e089af` chore: force rebuild | Noah | CANCELED | T=T (never built) |
| `4e41eab` chore: trigger redeploy | Noah | CANCELED | T=T (never built) |
| `44a89a4` fix: build errors | Noah | CANCELED | T=T (never built) |
| `6641a01` Nacht 5 merge | github | ERROR | original failure that triggered the pause |
| `77f7793` Nacht 3 merge | github | ERROR | |
| `e131a79` Nacht 4 merge | github | ERROR | |
| `da11471` Nacht 2 merge | github | ERROR | |
| `6137bf4` Nacht 1 merge | github | ERROR | first build with the typed bug |
| `08d4cef` quick-wins #35 | github | ERROR | |
| `052a95e` phase-1 audit #29 | github | **READY** ← currently serving prod |

The CANCELED chain doesn't have a superseding-commit pattern. With `"live": false`, Vercel rejects new deploys immediately. The dashboard likely shows a banner like "Deployments paused — resume to continue."

## What needs to happen (you)

1. **Open** https://vercel.com/team-muse-ai/fund24/settings
2. **Find** the "Deployment Protection" or "Pause Deployments" toggle (sometimes under General → Production)
3. **Set the project back to live** (toggle OFF the pause)
4. **Then** push any commit (or click "Redeploy" on the latest CANCELED entry) — it will build green

Alternatively from CLI:
```bash
cd ~/path/to/O.A.F24-v2
npx vercel link --yes --project fund24 --scope team-muse-ai
npx vercel --prod
```
This bypasses the git integration and pushes directly.

## Verification once unpaused

```bash
# Wait ~3 min after re-enabling, then:
curl -s -o /dev/null -w "%{http_code}\n" https://fund24.io                               # expect 200
curl -s https://fund24.io/datenschutz | grep -oE '<title>[^<]+'                          # expect "Datenschutzerklärung | fund24"
curl -s https://fund24.io/sitemap.xml | grep -c '<loc>'                                  # expect 28+ (3.408+ once sitemap fix lands fully)
```

## What I did NOT do

- No `git revert` — the fix already exists on main
- No new dependency changes
- No DB migrations
- No `wrangler.toml` edits
- No `.env*` edits
- No additional commits — pushing now would just create another CANCELED entry

## Status

| | |
|---|---|
| Repo state | ✓ clean, build green |
| Last commit | `2e089af` on main, pushed |
| Vercel project | ⚠ `live: false` (paused) |
| Production URL | https://fund24.io serves HTTP 200 from `052a95e` |
| Action required | manual unpause in Vercel dashboard |
