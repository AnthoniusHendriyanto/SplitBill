# Project Context

## Repositories
- **Frontend**: `/splitbill_frontend` (React 19 + Vite 8 + Zustand 5 + Tailwind 3.4 + Framer Motion 12)
- **Backend**: `/splitbill_backend` (Go 1.26 + gorilla/mux + PostgreSQL + PaddleOCR + OpenRouter + Gemini)

---

## Frontend — Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Wizard orchestrator (~245 lines, extracted from 3381) |
| `src/components/Step1Scan.jsx` | Camera/upload/manual → OCR |
| `src/components/Step2Ledger.jsx` | Edit items, service charge, tax |
| `src/components/Step3People.jsx` | Add people, select payer |
| `src/components/Step4Shares.jsx` | Split method + assignment grid + premium gating |
| `src/components/Step5Settlement.jsx` | Summary + DebtMap + save |
| `src/components/Dashboard.jsx` | Bill list (API + local), skeleton loading, KPI cards |
| `src/components/SettingsPage.jsx` | 7-tab settings (profile, tier, currency, subscription) |
| `src/components/HelpCenterModal.jsx` | Usage guide modal |
| `src/components/BillDetailsModal.jsx` | Completed bill breakdown |
| `src/components/SideNavBar.jsx` | Desktop nav with tier badge |
| `src/components/BottomTabBar.jsx` | Mobile nav |
| `src/components/AuthOverlay.jsx` | Login/register overlay |
| `src/store/useBillStore.js` | Bill data, UI step (persisted), calculations, API sync |
| `src/store/useAuthStore.js` | Auth state (uses centralized api.js) |
| `src/lib/api.js` | Centralized API client (AbortController, 30s, auto-refresh) |
| `src/utils/currency.js` | 9-currency formatting |
| `src/pages/LoginPage.jsx` | Login page + guest mode |
| `src/pages/RegisterPage.jsx` | Register page |
| `src/pages/BillDetailPage.jsx` | Backend-bill detail view |
| `tailwind.config.js` | 9 custom color shades defined |

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
| `internal/repository/postgres/ocr_service.go` | PaddleOCR → OpenRouter → Gemini pipeline |
| `internal/repository/postgres/paddle_ocr.py` | PaddleOCR Python wrapper |
| `internal/domain/bill.go` | Data models (Bill, Item, Person with is_payer, Payment) |
| `internal/domain/ocr_service.go` | OCRItem with Quantity, OCRResult |
| `migrations/001-012` | Database schema (12 migrations) |
| `run_migrations.sh` | Idempotent migration runner |

---

## Current Integration Status

### Frontend → Backend (Working)
| Feature | Status |
|---------|--------|
| Auth (register/login/refresh/logout) | ✅ Centralized api.js with auto-refresh |
| OCR upload (public endpoint, no auth) | ✅ IP rate limited (10/min) |
| Bill CRUD (create, list, detail, delete) | ✅ POSTs to backend when authenticated |
| Dashboard fetches from backend | ✅ Skeleton loading + error states |
| Bill detail from backend | ✅ Fallback to local store |
| Guest mode (no auth, local-only) | ✅ |
| Premium feature gating | ✅ PremiumModal on custom/percentage split |
| Tier badge + upgrade prompts | ✅ SideNavBar + Settings |

### Remaining Features
| Feature | Status |
|---------|--------|
| Stripe checkout flow | ❌ Backend + frontend needed |
| Share via link | ❌ Backend doesn't expose endpoint |
| PDF export | ❌ Non-functional button |
| WhatsApp sharing | ❌ Non-functional button |
| Payment settlement (mark paid) | ❌ Backend endpoint not wired |
| Multi-currency in backend | ❌ Schema lacks currency field |

---

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
- PaddleOCR → OpenRouter Free → Gemini Free pipeline
- No regex fallback, no paid AI, no monthly scan limit

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
