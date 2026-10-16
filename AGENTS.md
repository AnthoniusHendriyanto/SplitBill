# Project Context

## Repositories
- **Frontend**: `/splitbill_frontend` (React 19 + Vite 8 + Zustand 5 + Tailwind 3.4 + Framer Motion 12)
- **Backend**: `/splitbill_backend` (Go 1.26 + gorilla/mux + PostgreSQL + PaddleOCR + Groq)

---

## Frontend — Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Five-step wizard orchestrator and OCR integration |
| `src/components/Step1Scan.jsx` | Camera/upload/manual → OCR |
| `src/components/Step2Ledger.jsx` | Edit items, service charge, tax |
| `src/components/Step3People.jsx` | Add people, select payer |
| `src/components/Step4Shares.jsx` | Split method + assignment grid + premium gating |
| `src/components/Step5Settlement.jsx` | Summary + DebtMap + save |
| `src/components/Dashboard.jsx` | Re-exports dashboard/Dashboard: balances, assignment inbox, counterpart debts, recent splits |
| `src/components/SettingsPage.jsx` | Account, Security, Billing tabs |
| `src/components/HelpCenterModal.jsx` | Usage guide modal |
| `src/components/BillDetailsModal.jsx` | Completed bill breakdown |
| `src/components/SideNavBar.jsx` | Desktop nav with tier badge |
| `src/components/BottomTabBar.jsx` | Mobile nav |
| `src/components/AuthOverlay.jsx` | Login/register overlay |
| `src/store/useBillStore.js` | Bill data, UI step (persisted), calculations, API sync |
| `src/store/useAuthStore.js` | Auth state (uses centralized api.js) |
| `src/lib/api.js` | Centralized API client (AbortController, 30s, auto-refresh) |
| `src/utils/shares.js` | Reconciled preview shares and persisted share display; IDR only |
| `src/pages/LoginPage.jsx` | Login page |
| `src/pages/RegisterPage.jsx` | Register page |
| `src/pages/BillDetailPage.jsx` | Backend-bill detail view |
| `tailwind.config.js` | 9 custom color shades defined |

---

## UI Redesign & Anti-Slop (Ink + Citron)
- **Palette**: Ink `#151714` / off-white `#f5f6f0` surfaces, citron `#d5ed58` accent, driven by semantic CSS variables in `src/styles/design-tokens.css` with a light + `.dark` (class-based, system-preference aware) theme.
- **Glass & Glow Removal**: Stripped generic purple ambient glows and heavy backdrop blur glassmorphism across wizard steps, modals, dashboard widgets, and auth pages. Modals use native top-layer `<dialog>` (`ModalFrame`).
- **Typography & Geometry**: Plus Jakarta Sans (locally hosted woff2), 16px surfaces / 12px controls, crisp `rounded-2xl` containers, `tabular-nums` for numeric financial values, single global `:focus-visible` ring, `prefers-reduced-motion` respected.

## Backend — Key Files

| File | Purpose |
|------|---------|
| `cmd/api/main.go` | Entry point, DI, `runServer()` deduplicated |
| `internal/config/config.go` | All env-driven settings (JWT, pool, timeouts, CORS, SSL) |
| `internal/delivery/http/router.go` | Route definitions |
| `internal/delivery/http/auth_handler.go` | Auth handlers |
| `internal/delivery/http/bill_handler.go` | Bill + OCR handlers |
| `internal/delivery/http/middleware/auth.go` | JWT middleware |
| `internal/delivery/http/middleware/cors.go` | Configurable CORS |
| `internal/delivery/http/middleware/ratelimit.go` | IP rate limiter (10/min OCR) |
| `internal/usecase/bill_usecase.go` | Business logic, 4 split types, OCR, shares |
| `internal/usecase/auth_usecase.go` | Auth business logic |
| `internal/repository/postgres/ocr_service.go` | Groq vision primary → PaddleOCR + Groq text fallback |
| `internal/repository/postgres/paddle_ocr.py` | PaddleOCR Python wrapper |
| `internal/domain/bill.go` | Data models (Bill, Item, Person with is_payer, Payment) |
| `internal/domain/ocr_service.go` | OCRItem with Quantity, OCRResult |
| `migrations/` | 17 files: 001–008, 011, 013–020 |
| `run_migrations.sh` | Idempotent migration runner |

---

## Current assignment integration (October 2026)

- Preserve Manual/AI → Ledger → People → Shares → Summary. Finalize before notification/sharing.
- Custom is final amounts including fees/discount; all non-Equal methods remain premium-gated.
- Step3 links self or existing friends by validated user ID; names/unmatched emails stay unlinked.
- Atomic backend save persists accounts, shares, payments, recipient events, usage, and retry snapshot.
- Home AssignmentInbox and debts refresh every 30 seconds while visible. Reading is not paying.
- ShareSummary uses saved totals, Web Share/WhatsApp/copy. No public links or direct IG guarantee.
- SMTP is not used: Resend key/sender configure delivery; absent keys leave jobs queued. Registration
  lacks mailbox verification, so emails contain generic authenticated links, not financial details.
- Only creators can mutate bills. Identity is never inferred from name or payer status.
- Settings has three tabs; no multi-currency formatter, Stripe checkout, or offline guest mode.

## Historical notes (superseded where conflicting with current behavior)

Preserved below as an append-only history. In particular, prior localStorage-token and name-matching
descriptions are not current implementation guidance. See README and workspace business-flow.md.

### Known Consideration — Resolved

**Monthly Spending by participant name**: ~Resolved. `user_id` FK added to `persons` (migration 017). `Create()` sets `user_id` on payer person. Queries match by `user_id` directly, with `is_payer + bills.user_id` fallback for old records. No more name-based matching.~

# Current Integration Status

### Frontend → Backend (Working)
| Feature | Status |
|---------|--------|
| Auth (register/login/refresh/logout) | ✅ Centralized api.js with auto-refresh |
| OCR upload (public endpoint, no auth) | ✅ IP rate limited (10/min) |
| Bill CRUD (create, list, detail, delete) | ✅ POSTs to backend when authenticated |
| Dashboard fetches from backend | ✅ Skeleton loading + error states |
| Bill detail from backend | ✅ Fallback to local store |
| Guest mode | ❌ Removed — free tier, must sign in |
| Premium feature gating | ✅ PremiumModal on custom/percentage split |
| Tier badge + upgrade prompts | ✅ SideNavBar + Settings |

### Remaining Features
| Feature | Status |
|---------|--------|
| Stripe checkout flow | ❌ Backend + frontend needed |
| Share via link | ❌ Backend doesn't expose endpoint |
| PDF export | ❌ Non-functional button |
| WhatsApp sharing | ❌ Non-functional button |
| Payment settlement (mark paid) | ✅ Per-person Mark Paid |
| Multi-currency in backend | ❌ Schema lacks currency field |

---

### Phase 7 — Frontend Fixes (July 2026)

- **N4**: Focus traps on HelpCenterModal and BillDetailsModal (Tab trapping + focus restoration)
- **N5**: `handleServiceModeChange`, `handleTaxModeChange`, `onNext`, `onBack`, `onNewBill`, `handleSelectBill` wrapped in `useCallback` — memo'd StepHeader/ActivityFeed preserved
- **N6**: `setTimeout` cleanup in Step1Scan stagger effect — no more state-update-on-unmounted warning

## Quality Improvements Applied

### Architecture
- `App.jsx` extracted from 3381→245 lines into 9 standalone components
- UI state (step/tab) persists via Zustand `partialize`
- Auth store uses centralized `api.js` (AbortController, 30s timeout, auto-refresh)
- Unused deps removed: `axios`, `lucide-react`

### Accessibility
- Global `*:focus-visible` ring on all elements
- `prefers-reduced-motion` disables animations
- `aria-current="page"` on nav items
- `aria-label` on icon-only buttons

### Visual
- 9 undefined Tailwind color shades defined
- `font-black` → `font-bold`/`font-semibold` on small labels
- Skeleton loading states on Dashboard
- Empty/error states for all data views

### Backend
- All config values env-driven (46 audit items resolved)
- `runServer()` deduplicated (~50 lines)
- TIMESTAMP → TIMESTAMPTZ, CHECK constraint on payments
- OCR public endpoint with IP rate limiting
- Groq vision primary → PaddleOCR + Groq text fallback
- Image resize to 1024px to control vision token cost
- No regex fallback, no monthly scan limit

---

## Commands

```bash
# Frontend
npm run dev       # Dev server (:5173)
npm run build     # Production build
npm run preview   # Preview production build

# Backend
go run ./cmd/api/main.go    # Dev server (:8080)
go build ./...              # Compile check
go vet ./...                # Static analysis
./run_migrations.sh         # Apply DB migrations
```

## Merchant field — Added

**What**: `merchant` column on `bills` table (migration 016). Stores the original restaurant/cafe name from OCR, separate from user-editable `title`. Ready for future analytics.

**Files**:
- Backend: `domain/bill.go` (Bill, BillSummary, CreateBillRequest), `bill_repository.go` (all queries), `bill_usecase.go` (Create, Fetch), `migrations/016_add_merchant.sql`
- Frontend: `useBillStore.js` (initial state, resetBill, completeBill, loadBillDraft, fetchCompletedBills), `App.jsx` (set from OCR)

## Saved contacts — Added

**What**: Contacts stored in DB (`contacts` table, migration 015). Backend CRUD at `/api/v1/contacts`. Frontend fetches on Step3People mount, auto-saves new names via POST, shows clickable chips with add/check/delete.

**Files**:
- Backend: `domain/contact_repository.go`, `postgres/contact_repository.go`, `delivery/http/contact_handler.go`, `migrations/015_contacts.sql`
- Frontend: `api.js` (getContacts, createContact, deleteContact), `Step3People.jsx` (fetches + renders + auto-saves)

## Mark as Paid button — Added

**What**: BillDetailsModal now shows per-person "Mark Paid" toggles for pending bills. Each person can be individually marked as paid via `PATCH /api/v1/bills/{id}/payments/{personId}`. Backend marks all their payments as paid; if everyone has paid, auto-completes the bill. Also fixed CORS (PATCH was missing from Allow-Methods).

**Files**:
- Backend: `bill_handler.go` (UpdateStatus, MarkPersonPaid), `bill_usecase.go` (UpdateStatus, MarkPersonPaid), `router.go` (PATCH routes), `domain/bill_repository.go` (MarkPersonPaymentsPaid, AllPaymentsPaid), `postgres/payment_repository.go` (implementations), `middleware/cors.go` (added PATCH)
- Frontend: `BillDetailsModal.jsx` (per-person toggles, Rp 0 fallback for old bills), `api.js` (markPersonPaid)

## Stale wizard after finalize — Fixed

**Problem**: After finalizing a split, switching back to the Bills tab showed the previous wizard state (step 5 with old bill data) instead of a fresh Step1Scan.

**Fix** (`Step5Settlement.jsx:14-25`): `handleSave` now calls `resetBill()` + `updateUI({ step: 1 })` before `setActiveTab('dashboard')`, so the wizard is fully reset on completion.

## BillDetailsModal Rp 0 — Fixed

**Problem**: Person subtotals/tax/service showed Rp 0 despite correct grand total.

Two root causes:
1. Backend `Create()` only stored item-person assignments for `custom` split type — `item.assigned_to` was empty for shared_items/equal bills, so `personItems.filter(...)` matched nothing
2. Modal computed `serviceShare = subtotal × (service_charge / 100)` and `taxShare = subtotal × (tax / 100)` without checking `service_mode`/`tax_mode` — for absolute amounts, dividing by 100 produced near-zero values

**Fix**:
1. Backend `bill_usecase.go:158-167`: removed `SplitTypeCustom` guard — assignments stored for all split types
2. `BillDetailsModal.jsx:40-54`: subtotal uses `item.price × (item.quantity || 1)`, service/tax amounts computed via mode check (`percent` vs `amount`), then split proportionally by `personSubtotal / totalAmount`
3. Additional fallback for old bills (pre-fix): if no items have `assigned_to`, fall back to equal split across all participants

## Monthly Spending — Fixed (shows all bills you participate in)

**Problem**: Monthly Spending only counted bills the user created (`WHERE user_id = $1`). Bills the user participated in but others created were excluded.

**Fix**: `GetByUserID` query widened to `WHERE user_id = $1 OR id IN (SELECT bill_id FROM persons WHERE name = $2)`. User's name fetched from `userRepo` in the `Fetch` usecase. Same fix applied to `GetByUserIDAndID` so participants can view bill details.

## CORS PATCH — Fixed

**Problem**: `cors.go` only allowed `GET, POST, PUT, DELETE, OPTIONS` — PATCH requests (`/status`, `/payments`) were rejected by browser preflight.

**Fix**: Added `"PATCH"` to `Access-Control-Allow-Methods`.

## Per-person Payment Tracking — Added

**What**: Each person in BillDetailsModal now has their own "Mark Paid" toggle. Calls `PATCH /api/v1/bills/{id}/payments/{personId}`, marks all their payments as paid. When all persons pay, bill auto-completes.

**Backend**: `MarkPersonPaymentsPaid` + `AllPaymentsPaid` in PaymentRepository. `MarkPersonPaid` usecase. `MarkPersonPaid` handler + route.

**Frontend**: `api.markPersonPaid()`. Per-person button in BillDetailsModal People section. Single "Mark as Paid" button replaced.

## Page-Refresh Login Loop — Fixed

**Problem**: Zustand v5 `persist` middleware called `setItem()` on **every** `set()` call. During `login()`, the first `set({ isLoggingIn: true })` saved `refreshToken: null` to localStorage, overwriting any previously stored value. Subsequent `set({ refreshToken: token })` saved the correct value, but another intermediate `set()` later would overwrite it back to `null`. On page refresh, hydration found `refreshToken: null`, `silentRefresh` was skipped, and the navigation effect redirected to `/login`.

**Fix** (`src/store/useAuthStore.js`): Replaced `persist` middleware with manual `subscribe`-based persistence:
  - Hydrates from localStorage **synchronously** at module init (no async race)
  - `subscribe` saves **only when `accessToken` or `refreshToken` actually changes** — intermediate `set()` calls (like loading flags) never touch storage
  - Both `accessToken` and `refreshToken` are persisted
  - App.jsx hydration effect and `hydrated` state removed (no longer needed)

**If login loop returns**: Check whether an intermediate `set()` is saving `null` tokens to localStorage. The `subscribe` callback at `useAuthStore.js:163` is the gatekeeper — verify it only fires on actual token changes.

## httpOnly Cookie Auth — Added

**Problem**: Auth tokens stored in localStorage — XSS-vulnerable (JS can read both tokens). Also caused login-loop bug where `persist` middleware overwrote tokens with `null` on intermediate `set()` calls.

**Fix**:
- Backend: Login/Register/Refresh now set `refresh_token` as `httpOnly, Secure, SameSite=Strict` cookie (Path=/api/v1/auth). Refresh/Logout endpoints read from cookie, not request body.
- Frontend: `accessToken` stored in Zustand memory only (no persistence). `refreshToken` removed from store entirely.
- `silentRefresh()` POSTs to `/auth/refresh` with `credentials: 'include'` — browser sends cookie automatically.
- Vite proxy (`vite.config.js`) proxies `/api` → `http://localhost:8080` so cookie stays same-origin.
- Stale `splitmate-auth` localStorage key auto-cleared on import.

**Files**:
- Backend: `auth_handler.go` (cookie set/read/clear), `middleware/cors.go` (Allow-Credentials)
- Frontend: `useAuthStore.js` (no persistence, no refreshToken), `api.js` (credentials:include), `App.jsx` (no refreshToken dep), `vite.config.js` (proxy), `config/api.js` (empty base URL)

## Guest Mode — Removed

**Problem**: Guest mode (local-only, no auth) is unnecessary — the free tier already exists for authenticated users. Guest mode added complexity (isGuest checks everywhere) and confusion.

**Fix**: Removed `isGuest` state and `setGuest` from `useAuthStore.js`. Removed "Continue as guest" buttons from `LoginPage.jsx` and `RegisterPage.jsx`. Removed all guest-related logic from `App.jsx`.

## Name Matching — Removed (user_id used everywhere)

**Problem**: Backend matched persons to users by `persons.name == users.name`. If a user named their person "AnthonPayer" instead of "Anthon", no match → user_share = 0.

**Fix**:
- `Create()`: sets `user_id` on payer person (`p.IsPayer`), no name matching
- `GetUserPaymentSummaryByBillIDs`: matches by `user_id` directly or `is_payer + bills.user_id` for old records
- `GetByUserID`: same pattern — no name fallback
- `participantName` parameter removed from all functions

## Balance Summary & Upcoming Settlements — Fixed

**Problem**: `FriendsBalanceSummary` iterated `b.persons`/`b.totals` (not available in bill summaries) → always showed "No one owes you". `UpcomingSettlements` was hardcoded to `debts = []`.

**Fix**:
- `FriendsBalanceSummary`: sums `receivable`/`payable` from bill summaries directly
- `UpcomingSettlements`: filters pending bills where `receivable > 0` or `payable > 0`, shows bill-level amounts

## Monthly Spending Month Selector — Added

**What**: Dashboard Monthly Spending card now has prev/next month navigation. Trend calculated month-over-month from actual `bill_date` field.

**Files**:
- `Dashboard.jsx` — `selectedMonth` state, `getBillMonthKey` util, `monthMetrics` useMemo (filters bills by selected month's bill_date, compares previous month for trend %)
- `MetricCard.jsx` — accepts `subtitle` prop (renders in place of label, used for the month picker UI)
- `useBillStore.js` — `billDate` field added to `completedBills` mapping from API response

**Trend calculation**: `(currentMonthSum - prevMonthSum) / prevMonthSum * 100`, rounded. 100% if no previous data but current > 0. 0 if both zero.
