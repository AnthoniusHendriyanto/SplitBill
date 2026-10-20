# Project Context

## Repository layout (monorepo)

This repository is a monorepo. Both applications live on `main` and are released together.

| Path | Project | Stack |
|---|---|---|
| `frontend/` | SplitMate client | React 19, Vite 8, Zustand 5, Tailwind 3.4, Framer Motion 12 |
| `backend/` | SplitMate API | Go 1.26, gorilla/mux, PostgreSQL, Groq (OCR) |

Project-specific context lives in `frontend/AGENTS.md` and `backend/AGENTS.md`. Read the file for
the area you are changing; this file only covers repository-wide rules.

## Commands

```sh
cd frontend && npm run lint && npm test && npm run build
cd backend  && go vet ./... && gofmt -l . && go test ./... -count=1
```

PostgreSQL integration tests self-skip without `TEST_DATABASE_URL`; point that at a disposable
instance, never a production database.

## Shared contracts

- Currency is IDR only. Equal and By Item are free; Percentage and Custom require an unexpired
  Premium tier. Display preferences never change payable amounts.
- `backend/internal/domain/shares.go` is authoritative for final shares.
  `frontend/src/utils/shares.js` mirrors it. Custom amounts are final and include fees and
  discount.
- A retried save reuses the same UUID `request_key`. A changed payload uses a fresh key.
- Only the bill owner can mutate a finalized bill. Paid bills reject edits. Identity is never
  inferred from a display name or payer status.
- Group balances use explicit `group_member_id` to `person_id` mappings.
- Sharing permissions stay explicit: public bill links are read-only, time-limited, and reveal no
  account identifiers or contact details.
- Financial error states are preserved end to end; never replace a server error with a generic
  success or silent fallback.

## Security audit

The Cloudflare `security-audit` skill is vendored at `.agents/skills/security-audit/` and pinned by
hash in `skills-lock.json`. Any agent working in this repository can use it: ask for a security
audit, a vulnerability review, or a focused security question.

- `node tools/verify-skill-lock.mjs .agents/skills skills-lock.json` proves the vendored files still
  match the pin. CI runs it, so editing the skill requires refreshing the lock file and shows up in
  the diff.
- `node .agents/skills/security-audit/validate-findings.cjs <findings.json>` and
  `node .agents/skills/security-audit/validate-coverage-ledger.cjs <coverage-ledger.json>` validate
  audit artifacts against `report-schema.json`.
- The required CI job runs the skill's own validator test suites; it needs no secret and no model.
- The agent-driven audit lives in `.github/workflows/security-audit.yml`. It runs on demand or
  weekly, needs `ANTHROPIC_API_KEY`, and writes to the git-ignored `security-audit-output/`.

Never let an audit probe deployed endpoints, production identities, or shared infrastructure. Audit
the source; the repository's own tests and builds already run in CI.

## Documentation rules

Update the relevant file in the same change as the code. Never delete earlier entries; append.

| File | Update when |
|---|---|
| `frontend/progress-trackers.md` | Any frontend bug fix, feature, or audit item |
| `backend/progress-trackers.md` | Any backend bug fix, feature, or audit item |
| `frontend/business-flow.md` | Split rules, share, or payment flow changes |
| `frontend/ui-context.md` | New components, state shape, or layout changes |
| `backend/docs/API.md` | Route, request, or response contract changes |
| `backend/DATABASE.md` | Schema, migration, or query changes |
| `backend/SECURITY.md` | Auth, rate limiting, or security boundary changes |
| `FEATURE-GAP-ANALYSIS.md` | Feature status or release-gate progress |

## Rules

- One repository, one branch, one push. Do not reintroduce nested repositories or submodules.
- Keep the client and API contracts in step. A change to one side that alters a payload, route, or
  allocation rule must update the other side in the same change.
- Preserve Ink + citron branding, accessible focus handling, reduced-motion support, and the
  responsive layout contract (44–48px touch targets, 16px mobile form text).
