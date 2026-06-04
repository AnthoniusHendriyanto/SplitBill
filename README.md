# SplitMate Frontend

Premium bill-splitting PWA built with React 19, Vite 8, Zustand 5, and Tailwind CSS 3.4 — featuring a "Scan-First" wizard flow and accessible fintech-luxury UI.

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
- **AI Receipt Scanning**: Upload photo → backend PaddleOCR + OpenRouter + Gemini parsing.
- **4 Split Types**: Equal, Custom (per-item), Percentage, Shared Items — with premium gating.
- **Payment Intelligence**: Real-time `useMemo`-driven totals (subtotal, tax, service charge, grand total, per-person).
- **Authentication**: JWT-based login/register with auto-refresh and guest mode.
- **Premium Tier**: Freemium ($2.99/month) with feature gating and upgrade modals.
- **Multi-Currency**: 9 currencies (IDR, USD, EUR, etc.) with formatting.
- **Accessibility**: `focus-visible` rings, `aria-current`/`aria-label` on nav, `prefers-reduced-motion` support, typography hierarchy.
- **PWA-Ready**: Manifest, theme-color, apple-mobile-web-app meta tags.
- **Offline-First**: Guest mode works fully offline; authenticated mode syncs to backend.

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
│   ├── SettingsPage.jsx    # 7-tab settings (profile, tier, currency, etc.)
│   ├── HelpCenterModal.jsx # Usage guide
│   ├── BillDetailsModal.jsx# Completed bill breakdown
│   ├── SideNavBar.jsx      # Desktop nav (with tier badge)
│   ├── BottomTabBar.jsx    # Mobile nav
│   ├── AuthOverlay.jsx     # Login/register overlay
│   ├── DebtMap.jsx         # Debt visualization
│   ├── FormattedPrice.jsx  # Currency-aware price
│   └── ...                 # StepHeader, PremiumModal, etc.
├── store/
│   ├── useBillStore.js     # Bill data, UI step, calculations, API sync
│   └── useAuthStore.js     # Auth state (uses centralized api.js)
├── lib/
│   └── api.js              # Centralized API client (AbortController, 30s timeout, auto-refresh)
├── hooks/
│   └── useIsMobile.js      # Responsive breakpoint hook
├── utils/
│   ├── currency.js         # 9-currency formatting
│   └── ...                 # Calculations, formatters
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
git clone <repo-url> splitbill_frontend
cd splitbill_frontend
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
