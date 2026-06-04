# Feature Gap Analysis

## Legend
- ✅ Built (Frontend)
- ❌ Not Built (Frontend)
- 🟡 Partially Built
- ⚡ Backend Issues

## 1. Authentication & User

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Register | ✅ | ✅ | useAuthStore + LoginPage |
| Login | ✅ | ✅ | useAuthStore + RegisterPage |
| Logout | ✅ | ✅ | Frontend clears local state, navigates to /login |
| Token Refresh | ✅ | ✅ | Centralized api.js with auto-refresh interceptor |
| Guest Mode | ✅ | ❌ | Works offline without backend |
| User Profile | ✅ | ✅ | Settings page shows user info + OCR usage |
| Update Profile | ❌ | ❌ | Not in either side |
| Show User Tier | ✅ | ✅ | SideNavBar shows tier badge (Free/Premium) |

## 2. Bill Creation Flow

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Step 1: Photo/Upload/Manual | ✅ | ✅ | Uses centralized API client with auth header |
| Step 2: Edit Items | ✅ | ✅ | Item list editor works |
| Step 3: Add People | ✅ | ✅ | Person management works |
| Step 4: Assign Items | ✅ | ✅ | Assignment checkboxes work |
| Step 5: Summary & Settlement | ✅ | ✅ | Shows totals + DebtMap |
| Save & Finish (completeBill) | ✅ | ✅ | POSTs to backend when authenticated |

### OCR Flow - All Fixed
- ✅ Auth header now sent via centralized api.js
- ✅ Accepts both `image` and `receipt` field names
- ✅ PremiumModal shown on 429 (OCR_LIMIT_EXCEEDED)

## 3. Dashboard & Bill History

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Dashboard Page | ✅ | ✅ | Shows completed bills from local + backend |
| Bill Detail Page | ✅ | ✅ | Fetches from backend when not found locally |
| Bill List | ✅ | ✅ | Paginated fetch from backend |
| Delete Bill | ✅ | ✅ | Works with API + local fallback |
| Date Filter | 🟡 | ✅ | Backend supports — frontend UI not wired |
| Running Balance | ✅ | ❌ | Calculated from local `completedBills` |

## 4. Split Types

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Equal Split | ✅ | ✅ | Current default |
| Custom Split (per-item) | ✅ | ✅ (Premium) | Step 4 UI exists, PremiumModal for free users |
| Percentage Split | ✅ | ✅ (Premium) | Store logic exists, UI in progress |
| Shared Items Split | 🟡 | ✅ | Step 4 supports it but not prominently exposed |
| Premium Gating | ✅ | ✅ (back) | PremiumModal shown to free users |

## 5. Premium / Tier System

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Free Tier | ✅ | ✅ | `tier: "free"` on registration |
| Premium Tier | 🟡 | 🟡 | DB + model exist, UI ready, Stripe not in router |
| OCR Usage Display | 🟡 | ✅ | Settings shows usage, endpoint not wired |
| OCR Limit Handling | ✅ | ✅ | PremiumModal shown on 429 |
| Upgrade UI | ✅ | ❌ | PremiumModal with $2.99/month pricing |
| Stripe Checkout Flow | ❌ | ❌ | `/premium/subscribe` not in router |
| Stripe Webhook | ❌ | ❌ | `/premium/webhook` not in router |

## 6. Settlement & Payments

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Who Owes Whom | ✅ | ✅ | DebtMap component shows debt architecture |
| Mark as Paid | ❌ | ❌ | `/payments/{bill_id}/settle` not in backend router |
| Payment History | ❌ | ❌ | `/payments/{bill_id}` not in backend router |
| Minimum Transfers | ✅ | 🟡 | Backend bill_usecase calculates payments, settlement_summary returned |

## 7. Sharing & Export

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Share via Link | ❌ | ❌ | Share repository exists but no HTTP handler |
| Copy Settlement Text | ✅ | ❌ | "Copy Professional Template" button exists (client-side only) |
| Download PDF | ❌ | ❌ | Button exists but non-functional |
| Share with Friends | ❌ | ❌ | Button exists but non-functional |
| WhatsApp Integration | ❌ | ❌ | No WA share functionality |
| Transfer Notes (Bank/QRIS) | 🟡 | ❌ | Input fields for bank/account exist but not saved to backend |

## 8. Multi-Currency

| Feature | Frontend | Backend | Notes |
|---------|----------|---------|-------|
| Currency Selection | ✅ | ❌ | Settings page has currency picker (9 currencies) |
| FormattedPrice Component | ✅ | ❌ | Currency-aware display |
| Backend Currency Support | ❌ | ❌ | DB schema doesn't have currency field in bills table |
| Auto-Conversion | ❌ | ❌ | Not implemented anywhere |

## Summary: What MUST Be Built Next

### Completed
- ✅ Fixed backend: `GetByID` and `Delete` handlers use `mux.Vars` instead of query params
- ✅ Fixed frontend: Send `image` field name (not `receipt`) in OCR upload
- ✅ OCR endpoint is public (no auth) — centralized api.js handles it
- ✅ Created centralized API client with auto-refresh
- ✅ POST bill to backend after Save & Finish
- ✅ Fetch bills list from backend for Dashboard (with skeleton loading)
- ✅ Fetch bill detail from backend for BillDetailPage
- ✅ Premium upgrade UI + Stripe flow (UI done, backend needed)
- ✅ Percentage split logic in store
- ✅ Feature gating in Step 4 - PremiumModal for free users
- ✅ Delete bill from dashboard
- ✅ Token refresh interceptor in centralized api.js
- ✅ 46 backend audit items resolved (env-driven config, TIMESTAMPTZ, CHECK constraints, deduplication)
- ✅ App.jsx extracted 3381→245 lines, 9 standalone components
- ✅ 9 undefined Tailwind color shades defined
- ✅ UI state (step/tab) persists across refresh
- ✅ Accessibility: focus-visible, aria attributes, reduced-motion, typography hierarchy
- ✅ Skeleton loading + error states on Dashboard

### Remaining
1. Share via link — backend endpoint not exposed
2. PDF export — non-functional button
3. WhatsApp sharing — non-functional button
4. Payment settlement tracking — backend endpoint not wired
5. Stripe checkout — frontend UI ready, backend not wired