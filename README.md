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

Custom amounts are final payable shares (fees/discount included). Calculations use cents with
deterministic remainder allocation, not independent whole-rupiah rounding. Backend saved totals
are authoritative. IDR formatting is implemented; multi-currency is not.

Home shows assignment notifications and actual payer-based debts. Unlinked names work without
accounts but receive no automatic email. Email selection only resolves existing linked friends;
there is no global account lookup or automatic invitation. Read state and payment state are separate.
Notification/debt data refreshes on Home and every 30 seconds while visible.

Saved summaries support device sharing, WhatsApp text, and copy-text fallback. Instagram availability
depends on the device share sheet. These are text shares, not public bill URLs. Bill links require login.

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

Premium is manual bank transfer on the backend; frontend checkout is not wired. Public share-link
routes remain 501 stubs. There is no implemented PDF export, Stripe, or guaranteed direct IG send.
See [business flow](../business-flow.md), [security](../SECURITY.md), and [API](../splitbill_backend/docs/API.md).
