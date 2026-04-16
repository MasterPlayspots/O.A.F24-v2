# Schema Consolidation Plan

**Phase 6 · Nacht 4**
**Branch:** `fix/nacht4-schema-consolidation`
**Scope:** document + prepare. **No** `wrangler d1 migrations apply` in this PR.

---

## Executive Summary

Phase-4 audit (docs/analysis/full-audit/04_DB_MAPPING.md, finding C-P4-01 + H-P4-02 + M-P4-01) flagged three structural drifts across the 5 D1 databases:

1. **users collision** — `DB` (zfbf-db) vs `BAFA_DB` (bafa_antraege). Schema dump showed both; code paths touch only `DB`.
2. **8 × foerdermittel_\* collision** — same table names in `DB` and `BAFA_DB`. Code paths touch only `BAFA_DB`.
3. **CHECK_DB legacy** — main worker still reads `check_sessions` from `CHECK_DB` in one place (admin dashboard).

Good news: on the **code side**, canonical DBs are already fixed. The fix is schema-level only — drop the phantom duplicates after a backup.

---

## 1. Users Table

### Current state

| Binding | DB | Column count (from live schema dump, Phase-4) | Code paths touching it |
|---|---|---:|---|
| `DB` | `zfbf-db` | 32 | **all** auth + admin + reports + me endpoints |
| `BAFA_DB` | `bafa_antraege` | 40 | **none** (confirmed by grep — only `__tests__/*` reference `env.DB`, never `env.BAFA_DB`, for any `users` query) |

### Schema diff

Documented fields on `DB.users` (from `worker/db/migrations/001-schema-base.sql` + `worker/db/migrations/schema.sql`):
```
id, email, password_hash, salt, hash_version, role, first_name, last_name,
bafa_id, company, ust_id, steuernummer, is_kleinunternehmer, phone, website,
kontingent_total, kontingent_used, email_verified, verification_token,
reset_token, reset_token_expires, bafa_status, onboarding_completed,
privacy_accepted_at, deleted_at, created_at, updated_at
```
(plus `bafa_cert_status`, `bafa_cert_uploaded_at`, `bafa_berater_nr` from migration 027).

The 40-col `BAFA_DB.users` table has no migration under version control. It was created **outside** the migrations system — likely a historical artefact from a pre-split era. Since no code reads/writes it, it is **orphan data** that only inflates the audit score.

### Canonical DB

**`DB` (zfbf-db).** Reason:
- all `requireAuth` middleware reads user via `env.DB.prepare("SELECT ... FROM users WHERE id = ?")` — see `worker/src/middleware/auth.ts:24`
- all `/api/auth/*` (login, register, refresh, verify) operate on `env.DB`
- `/api/admin/users` CRUD targets `env.DB`
- `/api/me/*` dashboard aggregation reads `env.DB.reports` (same DB)
- `cleanupAuditLogs`, `writeAuditLog`, `audit_logs` all on `env.DB`

### Migration strategy

No ALTER needed on canonical. Orphan is dropped with guard — see migration **033-drop-phantom-users-bafa.sql**.

**Backward-compat:** zero risk — no code reads `BAFA_DB.users`.

---

## 2. `foerdermittel_*` Tables (8 collisions)

### Current state

| Table | DB (canonical, code reads) | DB (phantom duplicate) |
|---|---|---|
| `foerdermittel_profile` | `BAFA_DB` | `DB` |
| `foerdermittel_cases` | `BAFA_DB` | `DB` |
| `foerdermittel_case_steps` | `BAFA_DB` | `DB` |
| `foerdermittel_matches` | `BAFA_DB` | `DB` |
| `foerdermittel_dokumente` | `BAFA_DB` | `DB` |
| `foerdermittel_funnel_templates` | `BAFA_DB` | `DB` |
| `foerdermittel_conversations` | `BAFA_DB` | `DB` |
| `foerdermittel_benachrichtigungen` | `BAFA_DB` | `DB` |

Verified by grep: every `.prepare("… foerdermittel_\* …")` in `worker/src/routes/foerdermittel/**` and `worker/src/routes/check.ts` uses `c.env.BAFA_DB`. No `c.env.DB.prepare("… foerdermittel_\* …")` anywhere.

### Canonical DB

**`BAFA_DB` (bafa_antraege).** Reason: all live code targets it; the sub-routers use `const bafaDb = c.env.BAFA_DB` at handler entry.

### Migration strategy

Drop orphan duplicates from `DB` (zfbf-db). See migration **034-drop-phantom-foerdermittel-zfbf.sql**.

---

## 3. CHECK_DB Unbinding

### Current state

One remaining consumer in the main worker:

```ts
// worker/src/routes/admin.ts:113
c.env.CHECK_DB
  .prepare("SELECT COUNT(*) AS n FROM check_sessions WHERE date(created_at) = date('now')")
  .first<{ n: number }>()
```

This is the `checksHeute` KPI on the admin dashboard.

### Plan

Do NOT unbind yet. Two reasons:
1. worker-check still writes `check_sessions` (that's what counts as "checks today"). Unbinding breaks the KPI.
2. worker-check retirement is a separate track (Phase-3 finding H-P3-02). Only then can `CHECK_DB` be removed from the main worker.

**Action taken in this PR:**
- Code comment added at the call site documenting the dependency.
- `wrangler.toml` unchanged (binding stays).
- `MIGRATION_CHECKLIST.md` notes the deferred work.

---

## Migration Files (this PR)

| # | File | Target DB | Purpose |
|---|---|---|---|
| 033 | `033-drop-phantom-users-bafa.sql` | `bafa_antraege` | Drop orphan `users` table after backup |
| 033-rollback | `033-drop-phantom-users-bafa-rollback.sql` | — | **NOT automatic** — requires hand-restore from backup |
| 034 | `034-drop-phantom-foerdermittel-zfbf.sql` | `zfbf-db` | Drop 8 orphan `foerdermittel_*` tables |
| 034-rollback | `034-drop-phantom-foerdermittel-zfbf-rollback.sql` | — | **NOT automatic** — requires hand-restore from backup |

Both migrations are **destructive on the source DB** and have no automatic rollback because DROP TABLE is one-way. `wrangler d1 export` backups before apply are **mandatory**.

---

## Manual Migration Steps (post-merge)

See `docs/analysis/MIGRATION_CHECKLIST.md` for the full runbook. High-level:

1. `wrangler d1 export bafa_antraege --output backup-bafa-$(date +%Y%m%d).sql`
2. `wrangler d1 export zfbf-db --output backup-zfbf-$(date +%Y%m%d).sql`
3. `wrangler d1 execute bafa_antraege --file worker/db/migrations/033-drop-phantom-users-bafa.sql --remote`
4. `wrangler d1 execute zfbf-db --file worker/db/migrations/034-drop-phantom-foerdermittel-zfbf.sql --remote`
5. **48 h monitoring** — watch Sentry + Cloudflare worker logs for any `no such table: users` or `no such table: foerdermittel_*` errors originating from handlers (which shouldn't happen, but confirms).
6. Only after clean monitoring window: close this plan.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Phantom `BAFA_DB.users` turns out to have live writers we missed | **very low** (grep exhaustive) | auth outage | Backup → restore in < 5 min |
| Phantom `foerdermittel_*` in `zfbf-db` has hidden readers | low | stale data on dashboard (no crash) | Pre-apply grep (`rg 'env.DB.prepare' `); backup + restore |
| `wrangler d1 migrations apply` runs drop twice | low | error on second run, no damage | SQL uses `DROP TABLE IF EXISTS` |
| Live data in phantom users (e.g. from scraped-during-registration) | very low | PII remnant | Backup captures it; DB security audit already covered retention |

---

## Not in scope (future work)

- `berater_profile` (DB, singular, 11 cols) vs `berater_profiles` (BAFA_DB, plural, 17 cols). **Different shapes, different features** — consolidation requires column merge + backfill + code migration. Tracked in `worker/src/repositories/netzwerk.repository.ts` header comment.
- Legacy `antraege` (BAFA_DB, 16 cols, BAFA-beratungsbericht) vs `antraege_v2` (BAFA_DB, 19 cols, new funding platform). Same-DB name collision. Renames + query migration — deferred.
- Forum tables (forum_threads/posts/answers/upvotes across both DBs) — feature never launched; drop in future cleanup.
- `audit_logs` in both DBs — consolidation prep was included in Nacht 3 (migration 032 added `source` column + index).
