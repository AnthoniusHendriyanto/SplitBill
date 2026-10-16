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
must already exist. Python/PaddleOCR is needed only for the OCR fallback; configure `PYTHON_PATH`.
The migration runner tracks files in `_migrations`. There are 17 migrations:
001–008, 011, 013–020. Do not renumber the gaps or alter applied migration files.

## Implemented behavior

- Manual and AI inputs converge on the same bill payload.
- OCR: Groq Llama-4-Scout vision primary (1024px image cap), then PaddleOCR + Groq text fallback.
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
Bill limits come from `tier_limits`; `USAGE_LIMIT` remains a legacy config value, not the OCR limit.

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
