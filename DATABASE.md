# Query behavior — October 2026

- Connection: `DATABASE_URL` (single URI) takes precedence over the discrete `DB_*` config fields; the `DB_*` path remains the local default. See `CONTRIBUTING.md` for the managed-host notes.
- No schema change is required by this reliability work; existing migrations including `020` remain required.
- Bill list summaries fetch participants in one batch (`persons.bill_id = ANY(...)`) and payment summaries in one batch. Query errors propagate instead of returning fabricated zeros.
- History orders by `created_at DESC, id DESC` for deterministic page boundaries when creation times tie. Offset pagination can still shift while new bills are added; refreshing restarts at page one.
- Dashboard uses the existing unpaginated debt query across all unpaid payments involving the authenticated account, independent of history pages.

## Schema state

- 18 migration files exist (`001`–`021`, with gaps at 009, 010, 012). `020` adds request-key idempotency and notifications; `021` is the Data API lockdown and is required on any hosted database.
- `021` enables RLS on all tables and revokes `anon`/`authenticated`. It guards the `REVOKE` behind a `pg_roles` check so it still applies on plain PostgreSQL where those roles do not exist — the `TEST_DATABASE_URL` integration tests rely on that.
- On the hosted Supabase project the same statements were applied as recorded migration `m021_data_api_lockdown`. The repo file is the canonical version; the hosted copy lacks the role guard, which is inert on Supabase.
- `run_migrations.sh` honours `DATABASE_URL` (passes it to `psql` as a single URI) and falls back to the `DB_*` flags when it is unset. It still tracks applied files in its own `_migrations` table, independent of Supabase's `supabase_migrations` history, so both paths can target the same database without conflict. Verified on plain PostgreSQL: 18 files applied, 13 relations in `public` (12 tables with RLS plus the runner's own `_migrations`), re-run skipped all 18.
