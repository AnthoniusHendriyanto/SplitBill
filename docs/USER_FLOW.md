# User Flow & Tier System

## Overview

Complete user journey from registration through bill settlement, mapped to frontend screens and backend API calls.

```
Registration/Login
       │
       ▼
   Dashboard ───► View Bill History (requires auth)
       │
       ▼
  Create Bill
       │
       ├──► Take Photo (OCR)
       ├──► Upload Image (OCR)
       └──► Manual Entry
       │
       ▼
  Review & Edit Items
       │
       ▼
  Add People
       │
       ▼
  Choose Split Method
       │
       ├──► Equal Split (Free)
       ├──► Custom Split (Premium - shows PremiumModal for free users)
        └──► Percentage Split (Premium)
       │
       ▼
  Assign Items (if custom)
       │
       ▼
  Summary & Settlement
       │
       ▼
  Save Bill ──► Dashboard
       │
       ▼
  Share / Export / Pay
```

---

## Free Tier

### Limits
- **OCR Scans**: Unlimited
- **Split Methods**: Equal split only
- **Bill History**: 30 days retention
- **Custom Split**: ❌ Locked - shows PremiumModal
- **Percentage Split**: ❌ Locked - shows PremiumModal
- **Share via Link**: ❌ Locked
- **Export PDF**: ❌ Locked

### UI Behavior
- On trying custom split: show PremiumModal "This is a Premium feature. Upgrade to unlock."
- On trying percentage split: same modal
- Settings page shows tier badge: "FREE" with "Upgrade" button
- SideNavBar shows tier badge (clickable to show PremiumModal)
- Dashboard shows skeleton loading while fetching bills

---

## Premium Tier ($2.99/month)

### Features
- Custom split (per-item assignment)
- Percentage split
- Unlimited bill history (no 30-day limit)
- Share bill via link
- Export to PDF
- Priority support

### UI Behavior
- SideNavBar shows "✨ Premium" badge
- Settings page shows badge: "PREMIUM ✨"
- All features unlocked
- No usage limit banners
- No upgrade prompts

---

## Step-by-Step User Flow

### 0. Authentication

#### Screen: Login / Register
**Frontend**: `LoginPage.jsx`, `RegisterPage.jsx`, or `AuthOverlay.jsx`
**Backend**: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`

**Flow**:
1. User enters email + password → taps Login
2. `useAuthStore.login()` → POST /api/v1/auth/login
3. On success: store `user`, `accessToken`, `refreshToken`
4. Update UI state to Dashboard (activeTab: 'dashboard')
5. Redirect to Dashboard
6. If 401: show error "Invalid email or password"
7. If registering: POST /api/v1/auth/register → auto-login → Dashboard

#### Guest Mode
- Users can tap "Continue as Guest" on login page
- No account required
- All local features work
- Cannot access Dashboard (requires API)
- Can create bills and see settlement
- Can upgrade to Premium (shows modal)