# Fund24 — Asset Inventory

**Snapshot date:** 2026-04-15 · All numbers from live `wrangler` calls + `package.json` / `wrangler.toml` files.

---

## 1 · Cloudflare Account

| Field | Value |
|---|---|
| Account ID | `d7bdc9212bc6f429a5f2eb82853a9e83` |
| Account name | `our.ark.@gmail.com` (per `wrangler.toml` comment) |
| Zone | `fund24.io` |
| Hardcoded in | `.github/workflows/deploy-workers.yml`, `ECOSYSTEM.md` |

---

## 2 · Workers

| Worker | Binding purpose | Deployed | Source | wrangler.toml |
|---|---|---|---|---|
| `bafa-creator-ai-worker` | Main API, `api.fund24.io` | ✅ (GH Actions paths-filter) | `worker/` | `worker/wrangler.toml` |
| `bafa-creator-ai-worker-preview` | Preview stage | (defined as env block) | same source | `worker/wrangler.toml [env.preview]` |
| `foerdermittel-check-api` | Fördercheck wizard, `*.workers.dev` | ✅ | `worker-check/` | `worker-check/wrangler.toml` |

> **Note:** 15 workers exist on the account per `ECOSYSTEM.md` A.2, but only these 3 are fund24-relevant. The rest (`cta-oa-api`, `secondbrain-growth`, `zfbf-api`, `wlw-proxy`, etc.) belong to separate projects on the same account.

---

## 3 · D1 Databases

**14 D1 databases** exist on the account. **5 are bound** to `bafa-creator-ai-worker`:

| Binding | CF name | UUID | Tables | Purpose |
|---|---|---|---|---|
| `DB` | `zfbf-db` | `9a41ed93-e2a4-440d-8ef1-a3e63cb0c6e3` | **30** | Users, auth, sessions, audit, payments, orders, Fördermittel workflow profile/cases |
| `BAFA_DB` | `bafa_antraege` | `8582e9dd-8063-4dbd-b079-f38b2bb3918f` | **71** | Antrag/Bericht workflow, Berater + Unternehmen, tracker, email outbox, news |
| `FOERDER_DB` | `foerderprogramme` | `b95adb7b-ed86-441b-841e-4cd3a9a15135` | **15** | Förderprogramm catalog (3884 programs + sources + favorites + program_documents) |
| `BAFA_CONTENT` | `bafa_learnings` | `7f5947f7-42af-455e-81ad-0c57be23b940` | **11** | AI prompts, learning cycles, wording rules, rejections |
| `CHECK_DB` | `foerdermittel-checks` | `0b2479a3-13eb-45bc-8c71-105208ed71ad` | **15** | Fördercheck session state, precheck antworten, leads, call log |

**9 unbound** (belong to other projects): `context-guardian-*`, `ourark-events`, `secondbrain-index`, `foerder_leads`, `cf-ai-workspace-db`, `skill-library`, `bafa_branchen`.

---

## 4 · R2 Buckets

**6 R2 buckets** on the account. **2 are fund24-relevant** after GAP-005 cleanup (PR #19):

| Bucket | Binding (in which worker) | Purpose |
|---|---|---|
| `bafa-reports` | `REPORTS` in `bafa-creator-ai-worker` | Generated PDF reports + backups |
| `foerdermittel-check-docs` | (in `foerdermittel-check-api`) | Wizard-uploaded company docs |

**4 unrelated / other-project buckets on same account:** `d1-backups`, `ourark-backups`, `secondbrain-snapshots`, `skill-assets` — leave alone.

**Deleted by PR #19 (GAP-005):** `fund24-dokumente`, `fund24-company-files` — both were empty and never bound.

---

## 5 · KV Namespaces (bound to main worker)

| Binding | ID | Purpose |
|---|---|---|
| `SESSIONS` | `8cb1b5aaf7954e7a88859f36edf8b342` (= `bafa_session_cache`) | JWT session metadata / blacklist |
| `RATE_LIMIT` | `2fddaa5f66a94e8eb89920c91b89e83d` | Per-IP / per-user rate buckets |
| `CACHE` | `2edc5ca82a3d4e609b156a8f719c44ba` | Generic cache (Fördermittel lookups, dashboard data) |
| `WEBHOOK_EVENTS` | `3ed392e35d6142e9a5330a056b6f60f3` | Stripe/Resend event idempotency |

> 13 other KV namespaces exist on the account (`bafa_branchen_cache`, `BAFA_OCR_CACHE`, `bafa_prompt_cache`, `drive-manager-status`, `ECOSYSTEM_INDEX`, `foerder-dashboard-cache`, `FUND24_RATE_LIMITS`, etc.) — not currently bound to the main worker.

---

## 6 · Workers AI

- Binding: `AI` (via `wrangler.toml[ai]`)
- Models used in code: `@cf/meta/llama-3.1-8b-instruct`, `@cf/meta/llama-3.1-8b-instruct-fp8` (both wrapped via `runLlama()` helper in `worker/src/routes/check.ts` and `foerdermittel/match.ts`, `foerdermittel/chat.ts`, `foerdermittel/cases.ts`, or inline in `services/ai.ts`)
- Pre-F-007: 4 `(c.env.AI as any).run(...)` call sites. Post-F-007: centralized in `runLlama()`.

---

## 7 · Cron Triggers

`wrangler.toml[triggers].crons = ["0 2 * * *", "30 2 * * *", "0 3 * * 1", "0 10 * * *"]`

| Cron | UTC | Job | Service file |
|---|---|---|---|
| `0 2 * * *` | 02:00 daily | R2 backup of all D1 DBs (30-day retention) | `services/backup.ts` |
| `30 2 * * *` | 02:30 daily | OA-CP + OA-VA (context guardian) | `services/oa-cp.ts`, `services/oa-va.ts` |
| `0 3 * * 1` | 03:00 Mondays | Audit-log + retention cleanup | `services/audit.ts`, `services/retention.ts` |
| `0 10 * * *` | 10:00 daily | Onboarding email sequence (day 0/3/7) | `services/onboarding.ts` |

---

## 8 · Worker Secrets (9 active)

Via `wrangler secret list` on `bafa-creator-ai-worker`:

| Secret | Purpose | Rotation history | In `.env.example`? |
|---|---|---|---|
| `JWT_SECRET` | Sign/verify auth tokens | not rotated in audit window | yes (as worker var note) |
| `PASSWORD_PEPPER` | Extra pepper for PBKDF2 | never | no |
| `RESEND_API_KEY` | Transactional email via Resend | never | yes |
| `ANTHROPIC_API_KEY` | Claude API | never | no |
| `OPENROUTER_API_KEY` | OpenRouter fallback | never | no |
| `TURNSTILE_SECRET_KEY` | CF Turnstile server verify | never | no |
| `PAYPAL_CLIENT_ID` | PayPal OAuth | never | no |
| `PAYPAL_CLIENT_SECRET` | PayPal OAuth | never | no |
| `UNLOCK_SECRET` | Report unlock token | never | no |

> Not explicitly listed but referenced in code: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE` — likely also secrets. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` mentioned in `vitest.config.ts` test fixtures only — confirm whether used in prod by inspecting `services/stripe.ts`.

---

## 9 · Frontend Env Vars (public + server)

From `.env.example`:

| Var | Scope | Purpose | Where consumed |
|---|---|---|---|
| `NEXT_PUBLIC_FUND24_API_URL` | client+server | Main worker base URL | `lib/api/config.ts::API.FUND24` |
| `NEXT_PUBLIC_CHECK_API_URL` | client+server | Fördercheck worker base URL (direct calls) | `lib/api/config.ts::API.CHECK` |
| `NEXT_PUBLIC_SEMANTIC_API_URL` | client+server | Semantic-search worker | `lib/api/config.ts::API.SEMANTIC` |
| `NEXT_PUBLIC_ZFBF_API_URL` | client+server | Legacy ZFBF worker | `lib/api/config.ts::API.ZFBF` |
| `SENTRY_DSN` | server | Node-runtime Sentry | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| `NEXT_PUBLIC_SENTRY_DSN` | client | Browser Sentry | `instrumentation-client.ts` |
| `SENTRY_TRACES_SAMPLE_RATE` | server | Default 0.1 | `sentry.*.config.ts` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | client | Default 0.1 | `instrumentation-client.ts` |
| `JWT_SECRET` | Vercel server only | Used by Next.js middleware to verify token | `middleware.ts` |

---

## 10 · External Services

| Service | Purpose | Secret/ENV | Cost model | Dashboard |
|---|---|---|---|---|
| **Sentry** | Error + perf monitoring (frontend + worker) | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Free tier (with 0.1 sample rate) | `sentry.io` |
| **Resend** | Transactional email | `RESEND_API_KEY` | Free up to 3k/mo, then $20 | `resend.com` |
| **Anthropic (Claude)** | Higher-quality AI generation | `ANTHROPIC_API_KEY` | Per-token | `console.anthropic.com` |
| **OpenRouter** | Fallback/alt AI provider | `OPENROUTER_API_KEY` | Per-token | `openrouter.ai` |
| **PayPal** | Payments | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | % per tx | `paypal.com/developer` |
| **Stripe** | Alternative payments path | (in code: `services/stripe.ts`) | % per tx | `dashboard.stripe.com` |
| **Cloudflare Turnstile** | CAPTCHA-free bot check | `TURNSTILE_SECRET_KEY` | Free | CF dashboard |
| **Cloudflare Workers AI** | Llama 3.1 8B inference | native binding, no key | Per-neuron-seconds | CF dashboard |
| **Vercel** | Frontend hosting + Analytics + Speed-Insights | Vercel project env vars | Free tier (pro for analytics) | `vercel.com/team-muse-ai/fund24` |

---

## 11 · Domains & Routing

| Domain | Provider | Served by | Notes |
|---|---|---|---|
| `fund24.io` | Cloudflare DNS → Vercel | Next.js via Vercel Git Integration | Primary UI |
| `www.fund24.io` | Same | Same | Alias |
| `api.fund24.io` | Cloudflare DNS → CF Worker | `bafa-creator-ai-worker` route | Only `/api/*` path mapped; `/` returns `1002` from CF edge |
| `foerdermittel-check-api.froeba-kevin.workers.dev` | `.workers.dev` default | `foerdermittel-check-api` | Proxied by Worker 1 via `/api/checks/*` |

> Zone `fund24.io` id is `809ef77b10e4c17bf959cfe7aadf9e28` per deprecated `ECOSYSTEM.md` A.2 — still valid for routing config.

---

## 12 · GitHub Repository

| Field | Value |
|---|---|
| Owner / Repo | `MasterPlayspots/O.A.F24-v2` |
| Default branch | `main` |
| Protected checks on `main` | Lint · Typecheck · Build, Worker Tests (vitest), API docs + migration rollback pairs |
| SHA-pinned actions | 14 / 14 (`actions/checkout`, `actions/setup-node`, `dorny/paths-filter`, `cloudflare/wrangler-action`) |
| Merged-and-dangling remote branches | **5** (cosmetic) |
| Open PRs at snapshot time | 1 (#20 post-phase-2 audit) |

---

## 13 · Dependency Summary

| Runtime | Direct deps | Dev deps | npm-audit findings |
|---|---|---|---|
| Frontend root | 39 prod | 11 dev | **3** (2 MOD, 1 HIGH next DoS — N-001) |
| Worker | 7 prod | 11 dev | **4 HIGH** (devOnly, wrangler→miniflare→undici — N-002) |

See `docs/analysis/POST_PHASE2_AUDIT.md` for finding-by-finding status.
