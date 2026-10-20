# Backend reliability — October 2026

| ID | Change | Verification |
|---|---|---|
| REL-06 | Backend batches participant lookups, propagates financial-summary query failures, and uses deterministic history ordering. | `TestFetchBatchesPeopleAndPropagatesFailure` and `ORDER BY created_at DESC, id DESC`. Requires a disposable local PostgreSQL — see harness note below |
| REL-08 | Backend batching/free-tier/pagination/failure checks added using existing test tools. | Full suite green on a disposable local PostgreSQL 16 instance. Frontend half of REL-08 is tracked in `splitbill_frontend/progress-trackers.md` |
| REL-09 | HTTP create contract test rejects missing request keys and retains linked-account/custom-amount fields. | `TestCreateWireContract`: omitting `request_key` yields 400; asserts `CustomAmount` and non-empty `UserID` survive the handler |
| DB-01 | Schema is applied on the repository-scoped Supabase project through migration 025; the local `splitmate` database was also brought through the same current migration chain. | Hosted and local table/column checks verified; Supabase advisors report the intentional deny-all RLS findings and informational FK/index findings |
| DB-02 | `DATABASE_URL` overrides the discrete `DB_*` fields so managed pooler URIs are used verbatim; `DB_*` remains the local default. `run_migrations.sh` honours the same precedence. Migration `021` locks the Data API and guards the `REVOKE` for plain PostgreSQL. | `go build`, `go vet`, `go test ./... -count=1` green incl. `TEST_DATABASE_URL`; runner exercised on both branches — 18 applied, re-run skipped 18 |
| CLEAN-01 | Removed dead config. `USAGE_LIMIT` was plumbed `env → config → usecase field` but never read; limits come only from `tier_limits`. | `go build`, `go vet`, `go test ./... -count=1`. Frontend file removals are tracked in `splitbill_frontend/progress-trackers.md` |
| OCR-01 | Dropped the PaddleOCR/Python fallback; Groq vision is the sole OCR path. Removed `extractTextWithPaddle`, `structureWithGroq`, `buildPrompt`, `isSupermarket`, the text prompt constants, `paddle_ocr.py`, and `PYTHON_PATH`. Shared parsing (`parseStructuredJSON`, `buildOCRResult`) and the chat types are retained — the vision path still uses them. | `go build`, `go vet`, `go test ./... -count=1` green; 0 residual references in Go, env, or docs |
| OCR-02 | Groq OCR model was hardcoded to `meta-llama/llama-4-scout-17b-16e-instruct`, which now returns `model_not_found` on Groq (as do Maverick and Safeguard). Switched to `qwen/qwen3.8-27b` and made it configurable via `GROQ_VISION_MODEL`, since Groq's catalog rotates under hardcoded IDs. | Live vision call returns HTTP 200 and the pipeline reports `Not a receipt.` for a blank image, proving model reachability end to end; `go build`/`vet`/`test` green |
| P0-01 | Added additive group/share/receipt persistence foundations: migration 022 creates groups, group members, bill mappings, hashed share tokens, and receipt bytes; backend routes enforce owner/member access and public shares are read-only. | Full migration chain applied to disposable PostgreSQL 16; P0 group/share/receipt integration flow and existing integration suite pass; `go test ./...`, `go vet ./...`, and `gofmt -l .` green |
| P0-02 | Receipt uploads are resized in the frontend, included in the existing idempotent create payload, persisted with MIME metadata, and served only through authorized bill access. | Unit coverage for image decoding and size/type rejection; frontend lint/test/build green |
| P0-03 | Group creation now seeds the owner membership with the user's display name instead of the group name. This keeps the Members tab and group balances readable and correctly attributed. | P0 integration test asserts the owner member name; disposable PostgreSQL 16 run and `go test ./... -count=1`, `go vet ./...`, `gofmt -l .` green |
| GAP-04 | Finalized bills can be edited by the owner through an atomic replacement of dependent rows; update UUIDs/hash snapshots make retries idempotent, paid bills are rejected to preserve settlement history, and grouped mappings are restored. | P0 integration flow covers update/retry and rejects paid-bill edits; full migration chain through 025 and backend checks green |
| GAP-06 | Recurring definitions support weekly/monthly/yearly cadence, pause/resume/cancel, occurrence claims, and a minute scheduler that creates each due bill once; failed generation releases the claim for retry. | P0 integration flow covers monthly generation and next-run advancement; full migration chain through 024 verified |
| GAP-07 | Bills now carry categories and the dashboard shows category totals from persisted bill summaries; category values do not affect allocation. | Full disposable PostgreSQL integration suite and frontend checks green |
| GAP-08 | Added net settlement aggregation across outstanding payment rows, preserving bill-scoped payment records. | `/settlements` route and dashboard section; backend/frontend checks green |
| GAP-09 | Added owner-managed group default split configuration API with validation for all four split types. | Migration 025 and backend checks green; wizard auto-application remains follow-up |
| GAP-10 | Added authenticated Splitwise-compatible CSV preview parsing with row limits and safe amount parsing; it intentionally does not auto-create bills yet. | Handler compile/lint coverage green; import UI and draft creation remain follow-up |
| GAP-10-FOLLOWUP | Frontend now converts selected IDR preview rows into ordinary draft bills; non-IDR rows remain visible but are excluded. | Frontend lint/test/build green; import parser remains authenticated and capped at 1000 rows |
| AUTH-01 | Authentication middleware now distinguishes expired access tokens from invalid-signature/invalid tokens instead of labeling every validation failure `TOKEN_EXPIRED`. | Backend tests, vet, and formatting green |
| AUTH-02 | Refresh cookies now use `Secure` only when `FRONTEND_URL` is HTTPS, fixing local HTTP development refresh loops while retaining secure cookies in production. | Backend tests/vet/formatting green; restart API and log in again to receive the corrected cookie |

Earlier plans were discarded; this file and the current source are authoritative. Frontend-side UI and
save-contract work is tracked separately in `splitbill_frontend/progress-trackers.md`.

## Integration-test harness note

`TEST_DATABASE_URL` **must** point at a disposable PostgreSQL instance. The integration suite creates its
own schema with `search_path = test_xxx, public` and injects a failure by renaming `test_xxx.payments`.
Against any database that has real tables in `public`, unqualified `FROM payments` silently falls through
to `public.payments`, so the injected failure never fires and the test also reads production rows.
Boot one with `initdb` + `pg_ctl` on a spare port; do not reuse the Supabase project.
