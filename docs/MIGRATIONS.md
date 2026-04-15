# Fund24 — Database Migration Workflow

All D1 migrations live in `worker/db/migrations/`. CI blocks PRs that add a new forward migration without a `*-rollback.sql` companion (see `.github/workflows/docs-check.yml`).

## Conventions

| Rule | Details |
|---|---|
| **Location** | `worker/db/migrations/` |
| **Naming** | `NNN-short-description.sql` — 3-digit zero-padded, kebab-case description |
| **Rollback** | `NNN-short-description-rollback.sql` alongside the forward file |
| **Target DB** | Stated in a comment at the top of the forward file (`-- Target: DB (zfbf-db)`, `BAFA_DB`, `FOERDER_DB`, etc.) |
| **FK constraints** | Cross-DB FKs are not enforceable in SQLite → migrations 024–026 drop them deliberately |

## Databases

| Binding | CF Database | Purpose | Key Tables |
|---|---|---|---|
| `DB` | `zfbf-db` | Auth + ownership | `users`, `refresh_tokens`, `audit_logs`, `reports`, `payments`, `gutscheine`, `orders`, `promo_redemptions`, `email_verification_code` |
| `BAFA_DB` | `bafa_antraege` | Antrag workflow + BAFA tables | `antraege`, `antrag_bausteine`, `download_tokens`, `unternehmen`, `berater_profiles`, `netzwerk_anfragen`, `nachrichten`, `foerdermittel_profile`, `foerdermittel_cases`, `foerdermittel_matches`, `foerdermittel_case_steps`, `foerdermittel_funnel_templates`, `foerdermittel_dokumente`, `foerdermittel_conversations`, `foerdermittel_benachrichtigungen`, `provisionen`, `email_outbox`, `news_artikel` |
| `FOERDER_DB` | `foerderprogramme` | Förderprogramm-Katalog | `foerderprogramme`, `favorites`, `program_documents` |
| `CHECK_DB` | `foerdermittel-checks` | Fördercheck sessions | `check_sessions` |
| `BAFA_CONTENT` | `bafa_learnings` | AI learning store | `learning_entries` |

## Adding a migration

```bash
# 1. Pick next number
cd worker
ls db/migrations | grep -v rollback | tail -5

# 2. Forward + rollback files
NNN=028
vi db/migrations/${NNN}-my-change.sql
vi db/migrations/${NNN}-my-change-rollback.sql

# 3. Apply + test locally
npx wrangler d1 execute <db-binding> --local --file=db/migrations/${NNN}-my-change.sql
npm test    # vitest re-creates schema in a fresh in-memory DB

# 4. Open PR — CI enforces the rollback pair

# 5. After merge, user applies remote (DESTRUCTIVE, gated on review)
npx wrangler d1 execute <db-binding> --remote --file=db/migrations/${NNN}-my-change.sql
```

## Rollback-SQL rules

- `DROP COLUMN` reverses `ADD COLUMN` (SQLite ≥ 3.35 supports this directly; older versions need the recreate-table pattern).
- `CREATE TABLE` reverses `DROP TABLE` — include the **original** schema verbatim.
- `DROP INDEX` reverses `CREATE INDEX`.
- When dropping a column that has an index on it, drop the index **first**.
- **Never rollback a migration that's been in production > 7 days** without a database snapshot first — live data may have diverged from the rollback SQL's assumptions.

### Migrations that can't be rolled back safely

Some migrations are intentionally marked *NOT REVERSIBLE* in their rollback file:

- **Legacy-schema migrations** (001–012): the schema they add is load-bearing for every subsequent feature. Rolling them back means starting over from an empty database.
- **Data-loss migrations**: any migration that moves or deletes user-owned data.
- **Drop-FK migrations** (024/025/026): the foreign-key constraint being dropped was already unenforceable across databases; re-adding it via rollback would fail on any row inserted after the migration landed.

In those cases the rollback file contains a `-- NOT REVERSIBLE` marker and a note describing the recovery procedure (typically: restore from the R2 `backups/` bucket written by `performBackup()` in `worker/src/services/backup.ts`).

## Emergency rollback

```bash
cd worker

# 1. Confirm target (there is no "undo" button)
grep "^-- Target" db/migrations/NNN-*.sql

# 2. Apply the rollback SQL
npx wrangler d1 execute <db-binding> --remote --file=db/migrations/NNN-my-change-rollback.sql

# 3. Verify
npx wrangler d1 execute <db-binding> --remote --command "PRAGMA table_info('<touched-table>')"
```

## Cross-DB FK workaround

Users live in `zfbf-db` but most feature tables live in `bafa_antraege`. SQLite can't enforce foreign keys across databases, so tables that point at `users.id` declare the column as `TEXT NOT NULL` without a `REFERENCES users(id)` constraint. Migrations 024/025/026 dropped the originally-declared FKs on `berater_profiles`, `unternehmen`, and `netzwerk_anfragen` to match.

Orphaned rows are cleaned up by the soft-delete flow: `auth` middleware blocks requests from users with `deleted_at IS NOT NULL`, and the GDPR purge job periodically drops rows whose `user_id` no longer exists in `zfbf-db.users`.
