# Unique Features Proposal for SplitMate

## Core Differentiation Strategy

**Positioning**: "The frictionless bill splitter that works without accounts or app downloads"

---

## Unique Features (USP)

### 1. Zero-Friction Onboarding (Key Differentiator)

**Problem**: Every competitor forces all participants to download an app and create account.

**Solution**:
- Create bill → Generate shareable link
- Collaborators open link in browser → View/Pay without downloading anything
- No login required for both creator and collaborators

**Competitor with this**: Lily Split, Are We Even (they charge for it)

**Our approach**: FREE for everyone

---

### 2. Smart Receipt AI

**Problem**: Manual entry is tedious; basic OCR only gets total.

**Solution**:
- AI detects individual line items (name + price)
- Auto-suggests who ordered what based on item names
- Tap to assign items to people
- Auto-calculate tax & tip proportionally

**Competitor with this**: SuperDivide (paid), Tab (limited)

**Our approach**: Include in free tier, use LLM for better parsing

---

### 3. "Shared Items" Split Type

**Problem**: Current split types are limited (equal/custom/percentage).

**Solution**:
- New split type: **"Shared Items"**
- Some items (e.g., "Garlic Bread", "Platter") split equally among all
- Individual items assigned to specific people
- Hybrid approach for restaurant bills

**Example**:
```
Items:
- Pizza Margherita (₹120,000) → John
- Pizza Pepperoni (₹100,000) → John, Sarah
- Garlic Bread (₹40,000) → Shared (split 4 ways)
- Soft Drinks (₹60,000) → Shared (split 4 ways)

John pays: 120,000 + (40,000/4) + (60,000/4) = 145,000
Sarah pays: 50,000 + (40,000/4) + (60,000/4) = 75,000
Other 2: 25,000 each
```

**Competitor with this**: None

---

### 4. Built-in Budget Tracking

**Problem**: Need separate app for budgeting + bill splitting.

**Solution**:
- Track monthly spending per category
- Set budget limits with notifications
- View spending trends over time

**Competitor with this**: GoodShare (paid features)

**Our approach**: FREE with unlimited tracking

---

### 5. Integrated Payment Links

**Problem**: Must switch to Venmo/CashApp to pay.

**Solution**:
- One-tap settlement via integrated payment links
- Support: Venmo, PayPal, Cash App, GoPay, DANA
- Generate QR code for local payment apps

**Competitor with this**: SuperDivide (paid), Splitwise (Pro)

**Our approach**: Free with major payment providers

---

### 6. Offline-First with Sync

**Problem**: Can't add expenses without internet.

**Solution**:
- Add expenses offline (stored locally)
- Auto-sync when online
- Show sync status indicator

**Competitor with this**: Splid, Settle Up

**Our approach**: PWA can work offline via service workers

---

### 7. Event-Based Grouping

**Problem**: Mixing personal + trip expenses.

**Solution**:
- Create "Events" (Trip, Dinner, Roommates)
- Each event has its own ledger
- Easy to see "How much for Bali trip?"

**Competitor with this**: Tricount (basic)

---

### 8. Recurring Bills

**Problem**: Manually re-entering rent, utilities.

**Solution**:
- Set up recurring bill templates
- Auto-create monthly bills
- Remind when due

**Competitor with this**: Zedger, Platuni

---

### 9. Multi-Currency with Auto-Convert

**Problem**: Converting manually when traveling.

**Solution**:
- Select base currency
- Add expenses in any currency
- Auto-convert using live exchange rates

**Competitor with this**: Tricount, Settle Up

---

### 10. Bill History Export

**Problem**: Can't export data for taxes/accounting.

**Solution**:
- Export to CSV, PDF, JSON
- Include all details (items, people, splits)
- Filter by date range

**Competitor with this**: Tricount (paid), GoodShare (paid)

**Our approach**: FREE export in all formats

---

## Feature Comparison Table

| Feature | SplitMate | Splitwise | Tricount | Tab | SuperDivide | Lily Split |
|---------|-----------|----------|----------|-----|-------------|------------|
| **No login needed** | ✅ Implemented | ❌ | ❌ | ❌ | ❌ | ✅ |
| **No app for collaborators** | ✅ Implemented | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Line-item OCR** | ✅ Implemented | ❌ (paid) | ❌ | ✅ | ✅ | ❌ |
| **Smart split suggestions** | 🔄 Planned | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Shared items split** | ✅ Implemented | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Budget tracking** | 🔄 Planned | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Offline mode** | 🔄 Planned | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Payment links** | 🔄 Frontend | ✅ (Pro) | ❌ | ❌ | ✅ | ❌ |
| **Multi-currency** | 🔄 Planned | ✅ (Pro) | ✅ | ❌ | ❌ | ❌ |
| **Export (CSV/PDF)** | 🔄 Planned | ✅ (Pro) | ❌ | ❌ | ✅ | ❌ |
| **Unlimited free** | ✅ Implemented | ❌ (3-5/day) | ✅ (ads) | ✅ | ✅ | ✅ |

---

## Implementation Status (Updated)

### Phase 1: MVP (Implemented ✅)
- ✅ User registration/login (JWT-based)
- ✅ Create bill with manual entry
- ✅ OCR receipt scanning (Google Gemini Flash 2.5 API, complete with high-accuracy guardrails and crowd-sourced venue pricing intelligence)
- ✅ Equal, Custom, Percentage, Shared Items splits
- ✅ Generate shareable link (no app needed for viewers)
- ✅ Payment settlement with Bank model (payer owes)

### Phase 2: Enhanced (Available 🔄)
- ✅ "Shared Items" split type (hybrid assign/shared)
- 🔄 Smart split suggestions (AI-assisted item assignment)
- 🔄 Offline mode (PWA)
- 🔄 Budget tracking
- 🔄 Payment integrations (handled on frontend)

### Phase 3: Advanced (Planned 📋)
- 📋 Event-based grouping
- 📋 Recurring bills
- 📋 Multi-currency
- 📋 Export features
- 📋 Analytics dashboard

---

## Unique Selling Proposition (One-Liner)

> **SplitMate is the only bill splitting app that combines smart AI receipt scanning with zero-friction sharing — no accounts, no downloads, no limits.**

---

## Next Steps (Updated)

1. ✅ **MVP Backend Complete** - Auth, Bills, 4 split types, OCR, Shareable links
2. ✅ **Shareable links** - Database schema + API implemented
3. 🔄 **Smart Split Suggestions** - Use LLM/AI to auto-assign items to people
4. 🔄 **Offline PWA** - Service worker for offline bill creation
5. 🔄 **Payment Integrations** - Frontend handles bank transfers
6. 📋 **Multi-currency** - Support for international trips
7. 📋 **Budget Tracking** - Monthly budget goals per category