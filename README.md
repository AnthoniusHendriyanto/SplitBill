# SplitMate Backend

Go 1.26, gorilla/mux, PostgreSQL 15+ through pgx/v5. Custom JWT authentication with an
httpOnly refresh cookie. No Supabase SDK, Supabase Auth, or Stripe integration.

## Setup

```sh
cp .env.example .env
# Configure database, JWT secrets, GROQ_API_KEY; optional assignment email keys below.
go mod download
./run_migrations.sh
go run ./cmd/api
```

The API defaults to `http://localhost:8080`; routes use `/api/v1`. A PostgreSQL database
must already exist.
The migration runner tracks files in `_migrations`. There are 17 migrations:
001–008, 011, 013–020. Do not renumber the gaps or alter applied migration files.

## Implemented behavior

- Manual and AI inputs converge on the same bill payload.
- OCR: Groq vision (1024px image cap). Sole OCR path — there is no local fallback. The model is `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`); Llama-4 Scout and Maverick now return `model_not_found` on Groq.
  `/ocr` is public and rate-limited to 10 requests/minute/IP. There is no monthly OCR counter.
- Splits: Equal; Custom **final amounts**; Percentage; Shared Items. All except Equal require
  active premium. Tax/service percentages use the item subtotal; discount is an absolute deduction
  after fees. Shares reconcile to final payable cents using deterministic remainder allocation.
- The actual payer is the creditor; the creator is not automatically the payer's account.
- Friends are selected through existing linked contacts. Plain names never resolve to accounts.
- Finalization atomically saves payments, linked assignment notifications, and durable email jobs.
  Drafts send nothing. `request_key` makes identical retries idempotent.
- Home debts come from unpaid payments. Read notifications do not settle payments.
- Bill participants can read; only the creator can delete or mark payments paid.
- Premium subscription returns manual bank-transfer instructions; activation requires an authenticated
  callback plus `X-Callback-Secret`. Usage counts bill creations, not receipt scans.

## Assignment email

Set `RESEND_API_KEY` and `EMAIL_FROM` (a verified sender). The small PostgreSQL-backed worker
starts with the API. Without these settings, jobs stay queued and in-app notifications still work.
Registration currently has no mailbox-verification step: email contains a generic assignment notice
and authenticated `/bill/:id` link, not amounts, participant names, or bank information.

Provider acceptance is recorded as `sent`, not guaranteed inbox delivery. Transient failures retry up
to six attempts with backoff. `notifications.email_status`, `attempts`, and `last_error` expose failures.
Resend idempotency keys reduce ambiguous-send duplicates within its 24-hour window; expired retries
fail rather than risk automatic re-sending. Review provider logs before manually requeuing a failed job.

## Configuration

`.env.example` lists the exact config keys. JWT expiration is in minutes, refresh expiry in days,
server timeouts in seconds. `FRONTEND_URL` is both the allowed CORS origin and email link origin.
Use strong independent JWT secrets and appropriate `DB_SSLMODE` for your deployment.
Bill limits come from the `tier_limits` table. The old `USAGE_LIMIT` config key was removed: it was plumbed into the usecase but never read, and `tier_limits` is the only limit source.

### Supabase

Set `DATABASE_URL` to the **session pooler** URI and it takes precedence over the discrete `DB_*`
keys. Use port 5432, not the transaction pooler (6543) — the repository layer holds transactions
across statements. Hosted projects cap total connections, so set `DB_MAX_CONNS=5` / `DB_MIN_CONNS=1`
for one backend instance.

The schema is applied on the hosted project and migration `021` disables the Data API
(`ENABLE ROW LEVEL SECURITY` on every table, plus `REVOKE` from `anon`/`authenticated`).
The Go API is the only intended client and authorizes every request itself, so no RLS policies exist
by design. Verified: the anon key receives `permission denied` on read and write.

## API and checks

See [docs/API.md](docs/API.md), [workspace business flow](../business-flow.md), and
[database notes](../DATABASE.md). Public share-link and bill-update routes return 501; no PDF or
Stripe endpoints are implemented. Social text sharing happens in the frontend.

```sh
go test ./...
go vet ./...
go build ./...
```

No Dockerfile is supplied by this repository. Configure TLS, secrets, the PostgreSQL instance,
frontend SPA routing, and sender-domain verification in your deployment environment.
# October 2026 reliability update

- Equal and By Item (`shared_items`) are free. Percentage/custom require an unexpired premium tier.
- Create requires UUID `request_key`. Retry the same payload with the same key; changed payloads need new keys. Participants link only through explicit `user_id`; custom amounts are final payable values.
- Frontend draft resumption creates a copy without deleting the original. Saved shares are returned as `share_amount`.
- `/api/v1/debts` returns all outstanding debts for the account; `/api/v1/bills` remains paginated. List participant queries are batched and financial-query errors propagate.
- No new migration is introduced; all existing migrations, including 020, remain required.
- Validate with `go test ./...` and `go vet ./...`. Run DB integration tests with `TEST_DATABASE_URL` pointing to a **disposable PostgreSQL database**; otherwise those tests skip.
