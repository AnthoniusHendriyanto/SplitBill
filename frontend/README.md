# SplitMate Frontend

React 19 + Vite 8 + Zustand 5 + Tailwind 3.4 + Framer Motion. Ink/citron theme, keyboard focus
indicators, reduced-motion support, and responsive layouts. Uses the Go API; no Supabase client.

## Setup

Use Node 22.12+ (Node 22 tested) and npm:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Vite serves on port 5173 by default and proxies `/api` to port 8080. Production should proxy `/api`
to the Go backend on the same origin and support SPA routes including `/bill/:id`.
There is no supplied Dockerfile or required `.env.example` copy step.

## Flow

1. **Manual / AI:** enter items directly or upload a receipt for OCR.
2. **Ledger:** review quantities, unit prices, tax, service, discount.
3. **People:** plain names or existing connected friends by email; select actual payer.
4. **Shares:** Equal; By Item, Percentage, and Custom require premium, matching the backend.
5. **Summary:** finalize, queue assignments for linked friends, then share the saved summary.

Primary navigation is **Home · Split · Groups · History · More** on mobile; Recurring, Import,
Settings, Help, and sign-out live under More. Desktop keeps the same hierarchy in the sidebar, with
Recurring and Import grouped under Tools.

Custom amounts are final payable shares (fees/discount included). Calculations use cents with
deterministic remainder allocation, not independent whole-rupiah rounding. Backend saved totals
are authoritative. IDR formatting is implemented; multi-currency is not.

Home shows assignment notifications and actual payer-based debts. Unlinked names work without
accounts but receive no automatic email. Email selection only resolves existing linked friends;
there is no global account lookup or automatic invitation. Read state and payment state are separate.
Notification/debt data refreshes on Home and every 30 seconds while visible.

Saved summaries support device sharing, WhatsApp text, and copy-text fallback. Instagram availability
depends on the device share sheet. These are text shares, not public bill URLs. Bill links require login.

Groups are available for authenticated users and can contain multiple explicitly attached bills. A
finalized bill can also create a time-limited public read-only link at `/shared/:token`; public
projections do not expose account or contact identifiers. Receipt images are resized before save and
retained with the bill when supplied.

## Main files

| File | Role |
|---|---|
| `src/App.jsx` | Wizard orchestrator and OCR integration |
| `src/components/Step1Scan.jsx` … `Step5Settlement.jsx` | Five-step flow |
| `src/store/useBillStore.js` | Persisted draft/UI, exact-save retries, API sync |
| `src/utils/shares.js` | Preview allocation and persisted share display |
| `src/components/dashboard/Dashboard.jsx` | Home balance/debt rows |
| `src/components/dashboard/AssignmentInbox.jsx` | Paginated assignment notifications |
| `src/components/ShareSummary.jsx` | Saved social-share text |
| `src/components/BillDetailsModal.jsx` | Authorized details and creator settlement actions |
| `src/components/SettingsPage.jsx` | Account, Security, Billing tabs |
| `src/lib/api.js` | HTTP client, refresh retry, timeouts |
| `src/store/useAuthStore.js` | Memory-only access token, cookie refresh |

Local persistence is for drafts/UI, not offline authenticated operation. Guest mode was removed.
Access tokens are not persisted; the refresh token is an httpOnly cookie. After an uncertain save,
retry identical values before editing or starting another bill to avoid duplicates. Resuming a saved
draft makes a copy; the original remains until explicitly deleted.

Premium is manual bank transfer on the backend; frontend checkout is not wired. Public bill share
links, finalized-bill editing, CSV/JSON export, print output, and recurring definitions are wired.
There is no direct PDF file generator, Stripe checkout, or guaranteed direct IG send.
See [business flow](business-flow.md), [security](../backend/SECURITY.md), and [API](../backend/docs/API.md).

## Current behavior (October 2026)

- Ink + citron light/dark UI, local Plus Jakarta Sans, native dialogs, three-tab settings.
- Mobile-first page headers, cards, inputs, status badges, empty/error states, and 44–48px touch targets; mobile form controls render at 16px to avoid browser zoom. Print output hides app navigation and controls.
- IDR only. Equal and By Item are free; percentage and custom require active Premium. Custom values are final amounts including fees and discount.
- Preview allocations match the backend's deterministic cent allocation. Saved bills display server-recorded shares.
- Drafts retain split settings, linked identities, and assignments. **Resume as Copy** preserves the original draft. Failed/retried saves use idempotency keys.
- Dashboard balances include all unpaid debts through `/api/v1/debts`; history is paginated with Load more. Search filters loaded history.
- Sign-in is required. Logout clears account-specific state immediately and stale responses are discarded. Guest mode and multi-currency are not supported.

Checks: `npm run lint && npm test && npm run build`.

The sections below describe earlier iterations and may mention removed features; current behavior above and `AGENTS.md` take precedence.

## Tech Stack

- **Framework**: React 19.2
- **Build Tool**: Vite 8.0
- **State Management**: Zustand 5 (persist middleware)
- **Animations**: Framer Motion 12
- **Styling**: Tailwind CSS 3.4 + tailwind-merge + clsx
- **Icons**: Material Symbols Outlined
- **API Client**: Centralized `src/lib/api.js` (AbortController, 30s timeout, auto-refresh)
- **Routing**: React Router

## Key Features

- **Scan-First Wizard**: 5-step sequential flow (Scan → Ledger → People → Shares → Settlement) with validation locks.
- **AI Receipt Scanning**: Upload photo → backend Groq vision parsing. Extracts items, tax, service, discount.
- **4 Split Types**: Equal, Custom (per-item), Percentage, Shared Items — with premium gating.
- **Payment Intelligence**: Real-time `useMemo`-driven totals (subtotal, tax, service charge, grand total, per-person).
- **Discount Handling**: "You saved Rp X" badge shows total discounts. Monthly spending shows pre-discount amount.
- **Authentication**: JWT-based login/register with auto-refresh.
- **Premium Tier**: Freemium ($2.99/month) with feature gating and upgrade modals.
- **IDR formatting**: Indonesian rupiah display with no multi-currency conversion.
- **Accessibility**: `focus-visible` rings, `aria-current`/`aria-label` on nav, native dialog focus handling, `prefers-reduced-motion` support, responsive typography hierarchy.
- **PWA-Ready**: Manifest, theme-color, apple-mobile-web-app meta tags.
- **Online authenticated use**: no offline mode and no guest mode; drafts persist locally while authenticated data syncs to the backend.

## Architecture

```
src/
├── components/             # UI components
│   ├── Step1Scan.jsx       # OCR upload / camera / manual entry
│   ├── Step2Ledger.jsx     # Edit items, service charge, tax
│   ├── Step3People.jsx     # Add participants, select payer
│   ├── Step4Shares.jsx     # Split method + assignment grid
│   ├── Step5Settlement.jsx # Summary, DebtMap, save
│   ├── Dashboard.jsx       # Bill list with skeleton loading, KPI cards
│   ├── SettingsPage.jsx    # 3-tab settings (Account, Security, Billing)
│   ├── HelpCenterModal.jsx # Usage guide
│   ├── BillDetailsModal.jsx# Completed bill breakdown
│   ├── SideNavBar.jsx      # Desktop nav (with tier badge)
│   ├── BottomTabBar.jsx    # Mobile nav
│   ├── DebtMap.jsx         # Debt visualization
│   ├── FormattedPrice.jsx  # Currency-aware price
│   └── ...                 # StepHeader, PremiumModal, etc.
├── store/
│   ├── useBillStore.js     # Bill data, UI step, calculations, API sync
│   └── useAuthStore.js     # Auth state (uses centralized api.js)
├── lib/
│   └── api.js              # Centralized API client (AbortController, 30s timeout, auto-refresh)
├── utils/
│   └── ...                 # shares.js allocation, formatters
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── BillDetailPage.jsx
├── config/
│   └── api.js              # API base URL config
├── App.jsx                 # Wizard orchestrator (~245 lines, extracted from 3381)
├── main.jsx                # Entry + router setup
└── index.css               # Global focus rings, reduced-motion, base styles
```

## Wizard Flow (Steps 1–5)

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | `Step1Scan` | Camera / upload / manual entry → OCR |
| 2 | `Step2Ledger` | Edit item names, prices, qty; adjust service charge & tax |
| 3 | `Step3People` | Add people, mark who paid |
| 4 | `Step4Shares` | Choose split type (Equal/Custom/Percentage) + assignment grid |
| 5 | `Step5Settlement` | Review totals, DebtMap, save bill |

## Quality & Accessibility

- **Extracted architecture**: `App.jsx` reduced from 3381→245 lines (9 standalone components).
- **UI persistence**: Step/tab survives page refresh (Zustand `partialize`).
- **Skeleton loading**: Dashboard shows skeleton UI while fetching bills, with error state handling.
- **Focus indicators**: Global `*:focus-visible` ring on all interactive elements.
- **Reduced motion**: `prefers-reduced-motion` media query disables all animations.
- **Typography hierarchy**: `font-black` reduced to `font-bold`/`font-semibold` on all small label text.
- **Nav accessibility**: `aria-current="page"` on active items, `aria-label` on icon-only buttons.
- **Custom Tailwind shades**: 9 undefined colors defined (indigo-455/650, slate-350/355/360/850/905/955, emerald-450).

## Prerequisites

- **Node.js** 20+
- **npm** 10+ or **pnpm**

## Getting Started

```bash
git clone <repo-url> splitbill
cd splitbill/frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8080/api/v1
npm run dev             # → http://localhost:5173
```

## Build & Deploy

```bash
npm run build           # Outputs to dist/
```

Optimized for Vercel / Netlify (auto-detect Vite). Also supports Docker:

```bash
docker build -t splitmate-frontend .
docker run -p 5173:5173 splitmate-frontend
```

## License

MIT
