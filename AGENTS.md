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

### Key Recent Fixes

- `personTotals` `useMemo` dep `[calculateTotals]` → `[bill, settings, assignments]`
- OCR prompt: Indonesian receipt support, column-merge anti-pattern, modifier price handling
- Auth refresh loop: `useRef` guard + dedup + raw fetch logout
- OCR endpoint moved to public subrouter
- Page refresh on upload: `type="button"` on all buttons
