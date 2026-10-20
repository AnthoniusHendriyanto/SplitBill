# SplitBill — Competitive Feature Gap Analysis

**Date:** 2026-10-20
**Purpose:** Input for a later planning pass. This file records what competitors ship and what SplitBill is missing. It is not an implementation plan; it is the evidence-backed backlog and sequencing input.
**Status:** Research complete for the public web builds listed below. The P0 container/share/receipt work, P1 parity work, and P2 insight/default-split work are implemented; final security review and production smoke testing remain open.

**Implementation update:** P0 foundations plus GAP-04/05/06 are implemented. GAP07/08 have working category, trend, and settlement flows; GAP09/10 include default-split application and selected-row draft import. The mobile-first UI polish pass now covers navigation, dashboard ordering, groups, imports, recurring, bill details, and document-only print output. Migrations 022–025 are applied to the hosted and local databases; production smoke testing remains.

---

## 0. How to use this file

This is the single source of truth for the planning pass. Another model should be able to plan from this file alone. Do not repeat the competitor research unless a claim is disputed; the evidence IDs and URLs are recorded in §1.

**TL;DR:** SplitBill's split engine and free OCR are competitive. The social container, receipt persistence, recurring definitions, export/print, categories, import, and default splits are now implemented. Remaining work is hardening: production smoke tests, richer recurring templates, group invite/join links, advanced import mapping, and the deferred payment/multi-currency decisions.

**Suggested planning prompt:**

> Read `FEATURE-GAP-ANALYSIS.md`. Produce an implementation plan for the P0 items only (GAP-01, GAP-02, GAP-03), with migrations, API contracts, frontend states, security rules, test cases, and a parallel workstream breakdown. Preserve the existing bill contract and IDR-only scope.

**What this file intentionally does not contain**

- No day estimates; effort is S/M/L only.
- No object-storage provider decision (S3-compatible vs local disk).
- No native-app analysis; no APKs or device were available.
- No final API shapes beyond the sketch in §6; the planning model owns the contract.

---

## 1. How this was produced

Targets supplied by the user:

- https://spliit.app/
- https://www.splitmyexpenses.com/ (marketing/pricing) and https://app.splitmyexpenses.com/ (application)
- https://hipposplit.com/ (marketing) and https://app.hipposplit.com/ (application)

No APKs, installed packages, emulator, or attached device were available, so native apps could not be inspected. The public web builds were downloaded and analyzed statically with REA (`analyze_javascript_application`) and `inspect_analysis_view`.

| Target | Build shape | Files analyzed | REA evidence |
|---|---|---|---|
| `spliit.app` | Next.js | 59 JS chunks, 0 parse failures | `ev_b6b7309a6442f85da13eebeefff415b3aae2a1305e4e989d4805c73e8cb4cdd9` |
| `www.splitmyexpenses.com` | Next.js marketing | 13 JS chunks | `ev_dfa743e5eea4a3d5f93820c54d8d7879f75be7b0aa52fa7d29fa0e5fdbe0ad5d` |
| `app.splitmyexpenses.com` | Vite/Vue | 365 JS chunks, 205 module entries | `ev_a34fb52fe082e49ac2a3e4d234512d43566f6e82cc2e1a98c852c549e84bf6e8` |
| `app.hipposplit.com` | Vite/React | 82 JS chunks | `ev_98578d3e04537f06c62e153c8c8599c485c2fc1ba362031210887a910d4e3d80` |

Local analysis artifacts (ephemeral, not required for planning): `/tmp/opencode/rea-web/{spliit,splitmyexpenses,splitmyexpenses-app,hipposplit}`. Re-download from the URLs above if they no longer exist.

**Evidence caveats**

- Static analysis only; no bundle bootstrap was executed. Feature presence is inferred from recovered module names, literal strings, endpoint/storage references, and public pricing pages.
- Bundles are minified; the semantic graphs are partial where node ceilings were hit.
- Absence of a string or module is **not proof** that a feature does not exist.
- Pricing limits are from the public marketing page on 2026-10-20 and can change.

---

## 2. SplitBill current state (verified in source)

| Capability | Status | Anchor |
|---|---|---|
| Receipt OCR (Groq vision, sole path) | ✅ | `backend/internal/repository/postgres/ocr_service.go` |
| Four split types: equal, shared_items, percentage, custom | ✅ | `backend/internal/domain/shares.go`, `frontend/src/utils/shares.js` |
| Fees, tax, discount, deterministic cent allocation | ✅ | `domain/shares.go` |
| Contacts + linked participants + invitations | ✅ | `migrations/015_contacts.sql`, `019_invitations.sql`, `invitation_usecase.go` |
| Assignment notifications + email job queue | ✅ | `migrations/020_assignment_notifications.sql` |
| Per-person debts + Mark Paid | ✅ | `notification_repository.go`, `payment_repository.go` |
| Drafts, request-key idempotency, atomic save | ✅ | `bill_usecase.go`, `migrations/020` |
| Dashboard balances via `/api/v1/debts` | ✅ | `docs/API.md` |
| Premium gating (percentage/custom) | ✅ | `domain/shares.go`, `BillingTab.jsx` |
| Groups / trips / persistent shared ledger | ❌ | No `groups` table in `migrations/` |
| Guest / no-account access | ❌ | Sign-in required; `publicAPI` has only `/ocr` |
| Public bill share link | ✅ P0 foundation | Expiring hashed-token route at `/shared/{token}`; final security review remains open |
| Receipt image persistence / attachments | ✅ P0 foundation | Migration 022 stores resized receipt bytes/MIME; authorized receipt endpoint added |
| Edit finalized bill | ❌ | `PUT /bills/{id}` = 501 in `router.go` |
| Recurring expenses | ❌ | No recurrence fields anywhere |
| Categories / category charts | ❌ | No category field; monthly spending total only |
| CSV / JSON / PDF export | ❌ | No export route or component; Help Center says non-functional |
| Simplified settle-up across bills | ❌ | `/debts` returns raw payment rows; API notes no netting |
| Default splits | ❌ | Not implemented |
| Multi-currency | ❌ (deliberate) | `business-flow.md`: currency is IDR only |
| Splitwise import | ❌ | Not implemented |

---

## 3. Competitor feature matrix

Legend: ✅ observed in build/public docs, ⚠️ partial or paywalled, — not observed.

| Feature | Spliit | SplitMyExpenses | HippoSplit | SplitBill |
|---|---|---|---|---|
| Groups / shared spaces | ✅ `Groups`, `GroupForm` | ✅ `ExpenseGroupPage`, `ExpenseGroupsList`, `ExpenseGroupTabs` | ✅ chat groups | ✅ groups, members, attached bills, balances |
| Friends / member management | ✅ `Participants` | ✅ `FriendsPage`, `FriendGridItem`, `PeopleSearch` | ✅ member avatars | ⚠️ contacts plus explicit group members |
| No-account / guest access | ✅ literal `"No account, no identity"`, `shareLink` | ✅ `guest-*.js`, `AuthJoinGroupHeader` | ✅ `_inviteCode`, `use-invite` | ⚠️ bill-level read-only share; group invites deferred |
| Invite link / QR | ✅ share link | ✅ `AddInviteFriendsModal`, `ConfirmFriendReferralPage` | ✅ invite code | ⚠️ 7-day bill share link; no group join link |
| Recurring expenses | ✅ `recurrenceRule` | ✅ `RecurringExpensesTab`, `RecurringInterval` | ✅ marketed + app chunks | ✅ weekly/monthly/yearly definitions, idempotent scheduler |
| Multi-currency | ✅ `CurrencyCodeField`, `Currencies` | ✅ `CurrencyRegistry`, `ConvertCurrenciesModalLogic` | ✅ 150+ currencies | ❌ IDR only (GAP-12 deferred) |
| Export / print | ✅ `exportJson`, `exportCsv` | ✅ `ExpenseGroupPrintableSummaryPage` | ✅ `pdf-*.js`, `export-photos` | ✅ CSV/JSON export plus document-only print |
| Categories | ✅ `Categories`, `ByCategory` | ✅ `ExpenseCategorySelector` | ✅ category charts | ✅ bill categories and dashboard totals |
| Charts / reports | ✅ `chartTypeLabel`, `groupSpendings` | ✅ `HomePageBalancesGridGraph`, trend charts | ✅ `expense-category-chart`, daily/monthly trends | ⚠️ category bars and six-month totals |
| Receipt scan / AI itemization | ✅ `CreateFromReceipt`, `scanner` | ✅ premium; free tier says `AI receipt itemization: none` | ✅ `scanner-overlay` | ✅ free (advantage) |
| Receipt / attachment storage | — not observed | ✅ `ExpenseAttachmentManager`, uploader, slideover | ✅ receipts/photos | ✅ resized receipt bytes with authorized viewing |
| Edit expense | ✅ `expenseUpdated` | ✅ `useExpenseEditLockToast` | ✅ expense editor dialog | ✅ owner-only finalized edit; paid bills locked |
| Default splits | — not observed | ✅ `DefaultSplitsCore` | ✅ | ✅ group-level default split |
| Split methods | ✅ `byShares` + others | ✅ shares, %, manual, adjustment | ✅ `split-calc` | ✅ equal, item, %, custom |
| Simplified settle-up | ✅ reimbursement suggestions, `settledUp` | ✅ `SettleUpButton`, `Balances` | ✅ settlement view | ✅ net settlement view while bill payments stay authoritative |
| Payment services | — not observed | ✅ `PaymentServiceInput`, `PaymentModalLogic` | — | ❌ (GAP-11 deferred) |
| Splitwise import | — not observed | ✅ `SplitwiseImportsPage`, `SplitwiseImportFileUploader` | — | ✅ CSV preview and selected IDR rows converted to drafts |
| Push / activity feed | ✅ `Activity` | ✅ `UpdateNotificationsForm`, nudges | ✅ chat activity | ⚠️ in-app assignment notifications |
| Offline | ⚠️ some `offline` strings | ✅ `(Browser is offline)` handling | ⚠️ PWA | ❌ |
| Pricing | free / open | free limited + premium | free + premium | free + manual premium |

### Notable competitor positioning

- **Spliit:** no account, share-link-first, free, with groups, recurring, categories, CSV/JSON export, receipt scanning. Closest to SplitBill's receipt-first wedge, but with a group container and no account wall.
- **SplitMyExpenses:** broadest feature set. Paywalls AI receipt itemization, currency conversion, large imports, and recurring volume. Ships a **Splitwise importer**, which is an acquisition feature.
- **HippoSplit:** chat-first AI, guest invite codes, 150+ currencies, category/trend charts, premium upsell for unlimited scans. No native mobile app yet (marketing states web/PWA).
- **SplitBill advantage:** free OCR and free equal/By Item, with deterministic cent allocation. The gap is the social container and the retention loop, not the split engine.

---

## 4. Gap register (input for planning)

Priority is product impact for SplitBill's receipt-first consumer wedge. Effort is a rough planning hint: S ≤ 1 sprint, M = 1–2 sprints, L = architectural.

| ID | Gap | Priority | Effort | Depends on | Why it matters | Evidence |
|---|---|---|---|---|---|---|
| GAP-01 | Groups / trips: persistent shared space containing multiple bills, members, and running balances | P0 | L | — | Every competitor is group-first; SplitBill bills are orphaned. Required before recurring, cross-bill balances, and simplified settlement. | Spliit `Groups`; SME `ExpenseGroupPage`; Hippo chat groups |
| GAP-02 | Invite / share link with guest read-only access | P0 | M | — (bill-level); GAP-01 for group invites | Removes the account wall for participants; bill-level share link is implemented. Group invite/join remains separate. | Spliit `"No account, no identity"`; SME `guest`; Hippo `_inviteCode` |
| GAP-03 | Persist receipt image / attachment on the bill | P0 | S | — | Protects the core promise; resized receipt bytes are persisted and authorized viewing is available. External object storage is not used in this phase. | SME `ExpenseAttachmentManager`; Hippo receipts |
| GAP-04 | Edit finalized bill (owner-only, recompute shares, audit) | P1 | M | — | Implemented with atomic dependent-row replacement and update request snapshots. | Spliit `expenseUpdated`; SME edit-lock; Hippo editor |
| GAP-05 | CSV / JSON export and printable summary | P1 | S | — | Implemented from saved `share_amount` snapshots; direct PDF generation remains deferred. | Spliit `exportCsv`/`exportJson`; SME printable page; Hippo PDF |
| GAP-06 | Recurring expenses (rent, utilities, subscriptions) | P1 | M | GAP-01 (recommended) | Implemented with recurring definitions, idempotent occurrence claims, and a minute scheduler. | Spliit `recurrenceRule`; SME `RecurringExpensesTab`; Hippo recurring |
| GAP-07 | Categories + category/trend charts | P2 | M | — | Categories, dashboard totals, and six-month trend totals are implemented; richer charting remains. | Spliit `ByCategory`; SME `ExpenseCategorySelector`; Hippo category charts |
| GAP-08 | Simplified settle-up across bills/group | P2 | M | GAP-01 | Implemented as a net settlement view while preserving raw bill payments. | Spliit reimbursement suggestions; SME `SettleUpButton`; Hippo settlement |
| GAP-09 | Default splits for new expenses | P2 | S | GAP-01 | Owner configuration API and wizard auto-application are implemented. | SME `DefaultSplitsCore` |
| GAP-10 | Splitwise import | P3 | M | GAP-01 | Authenticated CSV preview, IDR selection, and draft creation are implemented; richer mapping remains. | SME `SplitwiseImportsPage` |
| GAP-11 | Payment service integrations | P3 | L | — | Regional/payment-provider dependent; competitors limited here too. | SME `PaymentServiceInput` (US-centric) |
| GAP-12 | Multi-currency with stored FX snapshot | P3 (deferred) | L | — | Competitor table stakes, but SplitBill explicitly commits to IDR-only. Revisit only if travel becomes the target. | `business-flow.md`; all three competitors support 100+ |

---

## 4a. Task breakdown and acceptance criteria

Use these as the planning checklist. Each item names the likely files to touch and the minimum bar for “done”. The planning model may split or merge them, but must not drop an acceptance criterion without recording why.

### GAP-01 — Groups / trips

**Touches:** new migration(s), `internal/domain/group.go`, `internal/repository/postgres/group_repository.go`, `internal/usecase/group_usecase.go`, `internal/delivery/http/group_handler.go`, `router.go`, `docs/API.md`, `DATABASE.md`, frontend groups pages/store/API client.

**Acceptance**

- A user can create a group, add/remove members, and attach an existing bill via nullable `bills.group_id`.
- Standalone bills keep working exactly as today; no change to `POST /bills` semantics.
- Group balances are derived from persisted `share_amount`/payments, never recalculated from names.
- Another account cannot read or mutate the group; bill-level access rules still apply.
- Group deletion is explicit and does not silently delete financial history.

### GAP-02 — Invite / share link with guest read-only access

**Touches:** `migrations/` (share token table), new handler, `router.go` public subrouter, rate limiter, frontend `/shared/:token` page, `ShareSummary.jsx`.

**Acceptance**

- Unauthenticated `GET` returns only the read-only projection: title, merchant, date, items, per-person shares, payer. No emails, user IDs, contact IDs, or mutation links.
- Token is stored as SHA-256 only, never logged, expires, and can be revoked by the creator.
- Expired/revoked tokens return a non-enumerating error (404/410) and are rate-limited.
- No mutation endpoint accepts a share token.
- The route is genuinely public; it must not remain inside the authenticated `protected` subrouter.
- A group invite and a bill share link have distinct lifecycles and permissions.

### GAP-03 — Receipt image / attachment persistence

**Touches:** migration, storage abstraction, OCR upload path in `bill_handler.go`/`bill_usecase.go`, bill detail, shared view.

**Acceptance**

- The uploaded receipt image is persisted and linked to the bill; the OCR response path is unchanged.
- Read access follows the same checks as bill detail; the guest view may show a thumbnail but must not expose a raw storage key.
- Deletion of a bill cleans up the object; orphan cleanup is defined.
- Type/size validation matches the existing 10 MB OCR limit.
- Existing bills without an image render cleanly.

### GAP-04 — Edit finalized bill

**Touches:** `bill_handler.go`, `bill_usecase.go`, repository update methods, frontend edit flow/store.

**Acceptance**

- Owner-only; participants cannot edit.
- Editing recomputes shares with the same authoritative allocator and persists new snapshots atomically.
- Retries are idempotent; a changed payload uses a fresh request key.
- An audit marker (`updated_at`, and optionally a revision/audit row) records the change.
- Totals and payments reconcile after edit; no stale notification/debt rows remain.

### GAP-05 — CSV / JSON export and printable summary

**Touches:** export handler or client generator, frontend `ShareSummary`/bill detail, docs.

**Acceptance**

- CSV/JSON values come from saved `share_amount`/payment snapshots, not a fresh preview calculation.
- IDR formatting and UTF-8 are correct; empty/legacy bills export safely.
- Printable summary is read-only and does not expose more than the bill detail.
- Export does not require a new premium tier unless the product owner decides otherwise.

### GAP-06 — Recurring expenses

**Touches:** recurrence fields/migration, scheduler/worker, group UI, notification hooks.

**Acceptance**

- Create/pause/cancel a recurrence; next occurrence generation is idempotent.
- Restarting the worker cannot duplicate an occurrence.
- Date/timezone policy is explicit (use the bill/group date, not server local time).
- Generated occurrences obey the same split/validation rules as manual bills.
- Free/premium gating is a recorded product decision.

### GAP-07/08/09 — Categories, simplified settle-up, default splits

**Acceptance**

- Categories are additive and do not change payable amounts.
- Charts read persisted categories/shares; no client-side recomputation drift.
- Simplified settle-up is a view over authoritative balances; it never mutates or nets away payment rows.
- Default splits are opt-in per group and validated by the same backend allocator.

---

## 5. Recommended sequencing

### Sprint 1 — Close the receipt loop and the account wall

1. **GAP-03 Receipt image persistence** — smallest change, immediate trust win.
2. **GAP-02 Public read-only share link** — move `GET /shared/{token}` out of the protected subrouter; token hashed at rest, expiry, revoke, rate limit; no mutations; minimal projection.

Outcome: a scanned bill can be verified and shared with a guest without an account.

### Sprint 2 — Give bills a home

3. **GAP-01 Groups/trips** — schema, membership, group ledger, group-scoped balances.
4. Fold the share link into group invites (GAP-02) so a group invite works for guests.

Outcome: the core retention container exists.

### Sprint 3 — Utility and correction parity

5. **GAP-04 Edit finalized bill.**
6. **GAP-05 CSV/JSON export + printable summary.**
7. **GAP-06 Recurring expenses** on top of groups.

### Sprint 4 — Insight and simplification

8. **GAP-07 Categories + charts.**
9. **GAP-08 Simplified settle-up.**
10. **GAP-09 Default splits.**

### Later / opportunistic

- **GAP-10 Splitwise import** as an acquisition campaign.
- **GAP-11 Payment integrations** only with a concrete market/provider decision.
- **GAP-12 Multi-currency** only if the product scope changes from IDR-only.

---

## 5a. Parallel execution tracks

If multiple agents/models execute at the same time, freeze the contracts first, then run tracks that do not share files. The main collision points are `migrations/`, `internal/delivery/http/router.go`, `internal/usecase/bill_usecase.go`, `frontend/src/store/useBillStore.js`, and `docs/API.md`.

| Track | Items | Can start | Must not run concurrently with |
|---|---|---|---|
| A — Schema & API | GAP-01, GAP-02, GAP-03 | Immediately; contract first | Any other migration author |
| B — Export | GAP-05 | Immediately; independent of groups | Track C if both touch `ShareSummary` or bill handlers |
| C — Edit bill | GAP-04 | Immediately; independent of groups | Track B if both touch bill handlers |
| D — Guest/share UI | GAP-02 frontend | After Track A freezes the public response shape | Track A while the route contract changes |
| E — Categories/charts | GAP-07 | After GAP-01 schema lands | — |
| F — Recurring | GAP-06 | After GAP-01 and the scheduler design | — |

**Execution order**

1. Product owner/model writes the frozen API + schema contract for GAP-01/02/03 into this file or a linked plan.
2. Track A creates migrations and handlers; Tracks B and C proceed independently.
3. Track D builds the guest page against the frozen response shape (mock data allowed until Track A lands).
4. Merge order: migrations → backend handlers → frontend integration → docs.
5. Only one agent edits `migrations/` and `router.go` at a time; everyone else rebases on the contract.

**Definition of done for any track**

- The acceptance criteria for its GAP are met.
- Backend and frontend checks in §9 pass.
- API/DATABASE/business-flow docs are updated.
- No existing bill-contract or IDOR regression is introduced.

---

## 6. Minimal schema sketch for the P0/P1 work (not final)

```sql
-- GAP-01
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id),
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE bills ADD COLUMN group_id UUID NULL REFERENCES groups(id);

-- GAP-02
CREATE TABLE share_tokens (
  id UUID PRIMARY KEY,
  group_id UUID NULL REFERENCES groups(id),
  bill_id UUID NULL REFERENCES bills(id),
  token_hash TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  CHECK (group_id IS NOT NULL OR bill_id IS NOT NULL)
);

-- GAP-03
ALTER TABLE bills ADD COLUMN receipt_image_key TEXT NULL;
-- store bytes in object storage; keep only the key/URL metadata in Postgres
```

Security rules for guest/share links:

- Token is a bearer secret: store SHA-256 only, never log it.
- Read-only projection: title, date, merchant, items, per-person shares, payer. No emails, no user IDs, no contact details, no mutations.
- Expiry and explicit revoke; rate-limit public reads.
- The Go API remains the only authorization boundary; do not add `anon` grants.

---

## 7. Constraints and non-goals

- **IDR only** is an explicit current product contract (`frontend/business-flow.md`). Do not plan multi-currency unless that contract is intentionally reopened.
- **No public mutation links.** Guest access is read-only.
- **Backend is the authorization boundary.** Migration 021 locks the Supabase Data API; do not add RLS policies/grants without an equivalent Go-side check.
- **Keep the existing bill contract.** `group_id` and attachments should be additive; `POST /bills` request-key/idempotency semantics must not regress.
- **Receipt OCR is the differentiator.** Do not paywall equal/By Item or basic receipt scanning the way SplitMyExpenses paywalls AI itemization.
- **No mobile native app work** is implied by this analysis; competitors are web-first except Splitwise/Splid.

---

## 8. Open questions for the planning model

1. Should a bill belong to exactly one group, or can it be standalone and later attached? (Recommended: nullable `group_id`.)
2. Are guests first-class members with a display name, or purely read-only viewers? (Recommended: read-only viewers with an optional claim-on-signup path.)
3. Do group balances net across bills, or stay bill-scoped with a separate group ledger? (Recommended: group ledger, bill rows remain authoritative.)
4. Where do receipt images live: local disk for dev, S3-compatible object storage for production? What retention/deletion policy?
5. Is recurring in scope for free users, or premium-gated like percentage/custom?
6. Does export need PDF for Indonesian users, or is CSV/JSON + print CSS enough for v1?
7. Should the Splitwise importer be planned now as a growth bet, or after groups stabilize?
8. What is the group invite lifecycle: expiry, revoke, re-invite, and what happens to a guest's access after the group is deleted?

---

## 9. Verification checklist for the eventual plan

- [ ] Backend `go test ./... -count=1`, `go vet ./...`, `gofmt -l .` clean.
- [ ] Frontend `npm run lint`, `npm test`, `npm run build` clean.
- [ ] DB integration suite run against a disposable `TEST_DATABASE_URL` (not Supabase).
- [ ] Guest link: expired/revoked handling, read-only enforcement, no PII leakage.
- [ ] Group isolation: another account cannot read or mutate a group; bill access still respects creator/participant rules.
- [ ] Existing create-bill contract and request-key retry behavior unchanged.
- [ ] Receipt image access checks match bill access checks.
- [ ] Migration order and rollback documented; no `CASCADE` on financial history.

---

## 10. Execution checklist

Use this as the shared status board. One file, one source of truth; do not fork a second planning doc.

**P0 — first release**

- [x] GAP-03 receipt image persistence: schema + storage + access checks + cleanup (cleanup is database cascade; orphan object storage is not applicable to the current bytea implementation).
- [x] GAP-02 bill-level public read-only share link: token table, public route, expiry/revoke, rate limit, frontend page. Group invite/join links remain a separate follow-up to avoid conflating guest viewing with authenticated group membership.
- [x] GAP-01 groups: schema, membership, group ledger, group-scoped balances, frontend group views.
- [x] Contract frozen and recorded: request/response shapes for groups, invites, share links, uploads.
- [ ] P0 security review: guest read-only, no PII, no cross-account access, no Data API grants.

**P1 — parity**

- [x] GAP-04 edit finalized bill: owner-only, recompute, audit marker, idempotent retry.
- [x] GAP-05 CSV/JSON export + printable summary from saved shares.
- [x] GAP-06 recurring expenses: recurrence model, idempotent scheduler, pause/cancel, gating decision (currently available to authenticated users without a new premium gate).

**P2 — insight**

- [x] GAP-07 categories + six-month spending trend totals.
- [x] GAP-08 simplified settle-up view over authoritative balances.
- [x] GAP-09 default split configuration per group with wizard auto-application.

**P3 — opportunistic**

- [x] GAP-10 Splitwise-compatible CSV preview, import UI, and selected IDR rows converted into drafts; richer mapping remains.
- [ ] GAP-11 payment-provider decision and plan.
- [ ] GAP-12 multi-currency decision (only if IDR-only is reopened).

**Cross-cutting UX**

- [x] Mobile-first polish pass: Home · Split · Groups · History · More navigation; shared page/header/input/badge/empty-state primitives; balance-first dashboard; group Bills/Balances/Members/Settings tabs; Import Upload → Review → Result; recurring pause/resume/cancel states; grouped share/export and separated destructive actions; document-only print output.
- [x] Responsive verification at 375, 390, 768, and 1440px in light and dark themes with zero horizontal overflow, 16px mobile form text, and no browser console/request failures.

**Release gate (every item)**

- [x] Backend tests/vet/gofmt green; frontend lint/test/build green.
- [x] Docs updated: `docs/API.md`, `DATABASE.md`, `business-flow.md`, `progress-trackers.md`.
- [x] No regression to the existing create-bill contract or request-key retry behavior.
