# Session Memory

## Mandatory: Document Updates

After EVERY code change, update relevant `.md` files in the workspace root (the parent of this repository). Use workspace-relative paths, never another machine's absolute paths.

### Which files to update

| File | Update when... |
|------|----------------|
| `progress-trackers.md` | ANY bug fix, feature, or audit item resolved |
| `ocr-tests.md` | OCR prompt changes, new test cases added, test results |
| `ai-workflows.md` | OCR pipeline, prompt, or model changes |
| `code-standards.md` | Conventions, patterns, or tooling changes |
| `ui-context.md` | New components, state changes, layout changes |
| `business-flow.md` | Business logic, split algorithms, or payment flow changes |
| `SECURITY.md` | Auth, rate limiting, or security boundary changes |
| `DATABASE.md` | Schema, migration, or query changes |
| `CONTRIBUTING.md` | Build commands, setup, or dep changes |

### How to update

1. Add a row to the relevant table in `progress-trackers.md` with ID, issue, and fix description
2. Update field descriptions in the content files if the behavior changed
3. Never delete old entries — append new ones

---

## Project Structure

### Repos
- Backend: `splitbill_backend/` (Go)
- Frontend: `splitbill_frontend/` (React + Vite)

### Docs (workspace root)
- `progress-trackers.md` — all fixes, pending items, known issues
- `ocr-tests.md` — test cases, iterations, lessons learned for OCR
- `ai-workflows.md` — OCR pipeline architecture and prompt details
- `code-standards.md` — Go + React conventions, naming, patterns
- `ui-context.md` — component tree, store shape, themes
- `business-flow.md` — split algorithms, premium, payment flow
- `SECURITY.md` — JWT design, rate limits, CSP, OWASP
- `DATABASE.md` — schema, indexes, migrations
- `CONTRIBUTING.md` — setup guide

## Current assignment flow (October 2026)

- Equal and shared_items (By Item) are free; custom/percentage require active premium. Frontend payloads must include UUID `request_key`, explicit linked `user_id`, and final `custom_amount` values.
- Bill-list participant lookups are batched. Financial/participant query failures propagate; they never silently become zero. History ordering breaks timestamp ties by bill ID.
- The existing `/api/v1/debts` endpoint supplies all outstanding dashboard balances independently of history pagination.
- New tests cover the create HTTP contract, participant batching/error propagation, and free-tier By Item plus 21-bill pagination. DB tests require `TEST_DATABASE_URL`; without it they skip.

- Domain `shares.go` is authoritative for payable allocation: Custom means final amounts,
  discount reduces total, cent remainders are deterministic.
- CreateFull atomically saves linked user IDs, payments, notification/email jobs, usage, and an
  idempotent response snapshot. Migration 020 is required; migration 021 locks the Data API
  (18 migration files total).

## Database hosting (October 2026)

- `DATABASE_URL` overrides the discrete `DB_*` keys when set; `DB_*` stays the local default. Managed
  pooler URIs must be used verbatim because their password and `sslmode=require` do not survive
  being assembled from parts.
- Supabase uses the **session pooler** (5432), not the transaction pooler (6543): the repository
  layer holds transactions across statements. Hosted projects cap total connections, so use
  `DB_MAX_CONNS=5` / `DB_MIN_CONNS=1` for one instance.
- The hosted project has all migrations applied as `m0NN_*` records plus `m021_data_api_lockdown`.
  A repo-scoped MCP server in `opencode.json` drives it; see `DATABASE.md`.
- Migration 021 must never gain RLS policies or `anon`/`authenticated` grants without adding an
  equivalent authorization surface. The Go API authorizes every request itself.
- Link only self or existing contacts. Names grant no bill access. Creator-only mutation; recipient-only inbox.
- Home debts use actual payment counterpart IDs. Email uses Resend and generic authenticated links;
  missing credentials leave jobs queued. See README and workspace SECURITY/DATABASE notes.
- Public sharing is still a stub; frontend shares saved text. Draft resumption copies without deleting.
- Documentation list above is conditional: OCR files need updating when OCR changes; do not fabricate
  results for historical documents that are absent. Current docs live in this workspace.

### Historical Phase 7 — Comprehensive Audit Fixes (July 2026)

The following entries preserve history. Current behavior above and source supersede earlier claims.

- **C1-C7**: All critical backend items fixed — panic recovery middleware, rate limiter Stop(), OCR body defer+check, `errors.Is()` everywhere, graceful shutdown, race-free `calculatePayments` (in-memory data)
- **N1-N10**: CHECK constraints (migration 018), payments indexes, stub routes for unimplemented endpoints, focus traps on modals, `useCallback` for memo'd props, `setTimeout` cleanup, premium expiry at auth time, rounding in equal split, ContactUsecase layer
- **N3 Premium callback auth**: Added `X-Callback-Secret` header check (config via `PREMIUM_CALLBACK_SECRET` env var)
- **Clean bill_usecase.Create()**: Removed redundant `Update()` call after `CreatePayments()`

### Key Recent Fixes

- `personTotals` `useMemo` dep `[calculateTotals]` → `[bill, settings, assignments]`
- OCR prompt: Indonesian receipt support, column-merge anti-pattern, modifier price handling
- Auth refresh loop: `useRef` guard + dedup + raw fetch logout
- OCR endpoint moved to public subrouter
- Page refresh on upload: `type="button"` on all buttons
- OCR: Groq vision (image→JSON) is the only path; the PaddleOCR/Python fallback was removed. Model comes from `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`) because Llama-4 Scout/Maverick now 404 on Groq.
- `resizeImage()` caps longest side at 1024px to control vision token cost
- `completeBill()` passes client-side UUIDs for item/person FK assignment
- Item-person `assignments` now stored for ALL split types (not just `custom`) — previously `assigned_to` was empty for shared_items/equal bills
- Quantity fix: vision prompt strengthened with visual quantity reading, server-side guard for all-qty=1 + high prices
