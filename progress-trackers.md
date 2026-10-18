# Backend reliability — October 2026

| ID | Change | Verification |
|---|---|---|
| REL-06 | Backend batches participant lookups, propagates financial-summary query failures, and uses deterministic history ordering. | `TestFetchBatchesPeopleAndPropagatesFailure` and `ORDER BY created_at DESC, id DESC`. Requires a disposable local PostgreSQL — see harness note below |
| REL-08 | Backend batching/free-tier/pagination/failure checks added using existing test tools. | Full suite green on a disposable local PostgreSQL 16 instance. Frontend half of REL-08 is tracked in `splitbill_frontend/progress-trackers.md` |
| REL-09 | HTTP create contract test rejects missing request keys and retains linked-account/custom-amount fields. | `TestCreateWireContract`: omitting `request_key` yields 400; asserts `CustomAmount` and non-empty `UserID` survive the handler |
| DB-01 | Schema recreated on a Supabase Postgres project via a repository-scoped MCP server (`opencode.json`, `project_ref`-scoped, OAuth). 18 migrations applied with real version history; 12 tables created; `tier_limits` seeded. | `list_tables` 12/12, `list_migrations` 18/18, `get_advisors` clean, anon key denied on read and write |
| DB-02 | `DATABASE_URL` overrides the discrete `DB_*` fields so managed pooler URIs are used verbatim; `DB_*` remains the local default. `run_migrations.sh` honours the same precedence. Migration `021` locks the Data API and guards the `REVOKE` for plain PostgreSQL. | `go build`, `go vet`, `go test ./... -count=1` green incl. `TEST_DATABASE_URL`; runner exercised on both branches — 18 applied, re-run skipped 18 |
| CLEAN-01 | Removed dead config. `USAGE_LIMIT` was plumbed `env → config → usecase field` but never read; limits come only from `tier_limits`. | `go build`, `go vet`, `go test ./... -count=1`. Frontend file removals are tracked in `splitbill_frontend/progress-trackers.md` |
| OCR-01 | Dropped the PaddleOCR/Python fallback; Groq vision is the sole OCR path. Removed `extractTextWithPaddle`, `structureWithGroq`, `buildPrompt`, `isSupermarket`, the text prompt constants, `paddle_ocr.py`, and `PYTHON_PATH`. Shared parsing (`parseStructuredJSON`, `buildOCRResult`) and the chat types are retained — the vision path still uses them. | `go build`, `go vet`, `go test ./... -count=1` green; 0 residual references in Go, env, or docs |
| OCR-02 | Groq OCR model was hardcoded to `meta-llama/llama-4-scout-17b-16e-instruct`, which now returns `model_not_found` on Groq (as do Maverick and Safeguard). Switched to `qwen/qwen3.8-27b` and made it configurable via `GROQ_VISION_MODEL`, since Groq's catalog rotates under hardcoded IDs. | Live vision call returns HTTP 200 and the pipeline reports `Not a receipt.` for a blank image, proving model reachability end to end; `go build`/`vet`/`test` green |

Earlier plans were discarded; this file and the current source are authoritative. Frontend-side UI and
save-contract work is tracked separately in `splitbill_frontend/progress-trackers.md`.

## Integration-test harness note

`TEST_DATABASE_URL` **must** point at a disposable PostgreSQL instance. The integration suite creates its
own schema with `search_path = test_xxx, public` and injects a failure by renaming `test_xxx.payments`.
Against any database that has real tables in `public`, unqualified `FROM payments` silently falls through
to `public.payments`, so the injected failure never fires and the test also reads production rows.
Boot one with `initdb` + `pg_ctl` on a spare port; do not reuse the Supabase project.