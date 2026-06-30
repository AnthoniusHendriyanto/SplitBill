# Session Memory

## Mandatory: Document Updates

After EVERY code change, you MUST update all relevant `.md` files in the workspace root (`/home/je22z/Desktop/Project Split Bill/`). Do NOT skip this step.

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
- Backend: `/home/je22z/Desktop/Project Split Bill/splitbill_backend` (Go)
- Frontend: `/home/je22z/Desktop/Project Split Bill/splitbill_frontend` (React + Vite)

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

### Phase 7 — Comprehensive Audit Fixes (July 2026)

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
- Primary OCR: Groq Llama 4 Scout vision (image→JSON), fallback PaddleOCR+Groq text
- `resizeImage()` caps longest side at 1024px to control vision token cost
- `completeBill()` passes client-side UUIDs for item/person FK assignment
- Item-person `assignments` now stored for ALL split types (not just `custom`) — previously `assigned_to` was empty for shared_items/equal bills
- Quantity fix: vision prompt strengthened with visual quantity reading, server-side guard for all-qty=1 + high prices
