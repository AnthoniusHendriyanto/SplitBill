# User Flow Documentation

## Overview

This document describes the step-by-step user journey through SplitMate, from account creation to bill settlement.

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           User Journey Map                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Sign Up   │───►│  Dashboard  │───►│  New Bill   │───►│   Review    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                 │              │
                                                 ▼              ▼
                                         ┌──────────────────────────┐
                                         │    Capture Method        │
                                         │  ┌────┐ ┌────┐ ┌────┐  │
                                         │  │ 📷 │ │ 📁 │ │ ✏️ │  │
                                         │  │Photo│ │File│ │Form│  │
                                         │  └────┘ └────┘ └────┘  │
                                         └──────────────────────────┘
                                                 │
                        ┌─────────────────────────┼─────────────────────────┐
                        ▼                         ▼                         ▼
                 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                 │   OCR Flow   │         │  Upload Flow │         │  Manual Flow │
                 └──────────────┘         └──────────────┘         └──────────────┘
                        │                         │                         │
                        ▼                         ▼                         ▼
                 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                 │Review Items  │         │Review Items  │         │ Enter Items  │
                 │ from OCR     │         │ from OCR     │         │ manually     │
                 └──────────────┘         └──────────────┘         └──────────────┘
                        │                         │                         │
                        └─────────────────────────┼─────────────────────────┘
                                                  ▼
                                         ┌──────────────┐
                                         │ Add Persons  │
                                         │   (Names)    │
                                         └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │Choose Split  │
                                         │   Method     │
                                         └──────────────┘
                                                  │
                        ┌─────────────────────────┼─────────────────────────┐
                        ▼                         ▼                         ▼
                 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
                 │   Equal      │         │   Custom     │         │ Percentage   │
                 │   Split      │         │   Split      │         │   Split      │
                 └──────────────┘         └──────────────┘         └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │   Calculate  │
                                         │   Payments   │
                                         └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │  Save Bill   │
                                         └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │   Payment    │
                                         │   Summary    │
                                         └──────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────┐
                                         │ Mark as Paid │
                                         │(Optional)    │
                                         └──────────────┘
```

---

## Detailed Steps

### 1. Account Registration

**Screen**: Sign Up Page

**Fields**:
- Email address (required, unique)
- Password (min 8 characters)
- Display name (optional, for bill sharing)

**Actions**:
1. User enters email, password, name
2. Tap "Create Account"
3. System validates input
4. System creates user in database
5. System generates JWT tokens
6. User redirected to Dashboard

**Validation**:
- Email format validation
- Password strength check
- Email uniqueness check

**Error Handling**:
- Show inline validation errors
- "Email already exists" if duplicate

---

### 2. Dashboard

**Screen**: Home/Dashboard

**Features**:
- Recent bills list
- Quick action buttons (New Bill, Scan Receipt)
- Monthly spending summary
- Premium upgrade prompt (if free tier)

**Actions**:
1. View recent bills
2. Tap bill to view details
3. Tap "New Bill" to create
4. Tap "Scan" for quick capture

---

### 3. Create New Bill - Capture Method Selection

**Screen**: New Bill Page

**Options**:

| Option | Icon | Description |
|--------|------|-------------|
| **Take Photo** | 📷 | Open camera, capture receipt |
| **Upload Image** | 📁 | Select from gallery |
| **Manual Entry** | ✏️ | Enter items manually |

**User Decision Flow**:
```
User taps "New Bill"
        │
        ▼
Show 3 capture options
        │
   ┌────┼────┐
   ▼    ▼    ▼
  📷   📁   ✏️
Photo Upload Manual
   │    │    │
   └───┬┴────┘
       ▼
   Next step
```

---

### 4. Option A: Photo Capture Flow

**Screen**: Camera Interface

**Steps**:
1. User taps "Take Photo" button
2. Native camera opens
3. User captures receipt image
4. Preview shown with "Retake" / "Use Photo" options
5. User confirms photo
6. Image sent to server for OCR processing
7. Loading state shown (spinner)
8. OCR results displayed

**OCR Processing**:
```
Sending to server...
[████████░░░░░] 80%
Processing receipt...
        │
        ▼
┌─────────────────────────┐
│   OCR Results           │
├─────────────────────────┤
│ ✅ Burger      Rp 50.000│
│ ✅ Fries       Rp 25.000│
│ ✅ Coke        Rp 15.000│
│                 ─────── │
│ Service: 10%            │
│ Tax: 11%                │
│ Total: Rp 100.000       │
└─────────────────────────┘
```

**User Actions**:
- Review extracted items
- Tap item to edit (name/price)
- Tap "+" to add missed item
- Tap "-" to remove wrong items

---

### 5. Option B: Upload Image Flow

**Screen**: File Picker

**Steps**:
1. User taps "Upload Image" button
2. System file picker opens
3. User selects image from gallery
4. Same as Photo Capture step 6+ (OCR processing)

**Supported Formats**: JPEG, PNG, WebP  
**Max Size**: 10MB

---

### 6. Option C: Manual Entry Flow

**Screen**: Manual Entry Form

**Steps**:
1. User taps "Manual Entry" button
2. Empty item list shown
3. User taps "+ Add Item"
4. Modal form appears:
   - Item name (text input)
   - Price (number input with currency)
5. User saves item
6. Repeat for all items
7. User adds service charge % (optional)
8. User adds tax % (optional)

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Add Items                          │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Burger           Rp 50.000  ✕ │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Fries            Rp 25.000  ✕ │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Coke             Rp 15.000  ✕ │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ Add Item]                       │
│                                      │
├──────────────────────────────────────┤
│ Service Charge: [10] %              │
│ Tax:           [11] %                │
│                          ─────────  │
│ Subtotal:     Rp 90.000             │
│ Total:        Rp 111.000            │
└──────────────────────────────────────┘
```

---

### 7. Add Persons

**Screen**: Add People to Split

**Steps**:
1. After items are ready
2. User enters person names
3. One name per input field
4. Tap "+ Add Person" for more

**Minimum**: 2 persons required

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Who's Splitting?                   │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Alice                      ✕  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Bob                        ✕  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Charlie                    ✕  │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ Add Person]                     │
│                                      │
│  Minimum 2 people                    │
└──────────────────────────────────────┘
```

---

### 8. Choose Split Method

**Screen**: Select Split Type

**Options**:

| Method | Icon | Description |
|--------|------|-------------|
| **Equal** | ⚖️ | Split evenly among all |
| **Custom** | 👤 | Assign specific items to people |
| **Percentage** | % | Define percentage for each person |
| **Shared Items** | 🔄 | Assign items OR mark as shared (split equally) |

---

### 9. Split Method: Equal Split

**Logic**:
1. Calculate total = items + service + tax
2. Per person = total / number of people
3. Show preview before saving

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Equal Split                        │
├──────────────────────────────────────┤
│  Total: Rp 111.000                  │
│  3 people                            │
│  ─────────────────                  │
│  Alice    → Rp 37.000               │
│  Bob      → Rp 37.000               │
│  Charlie  → Rp 37.000               │
│                                      │
│  [Save Bill]                        │
└──────────────────────────────────────┘
```

---

### 10. Split Method: Custom Split

**Logic**:
1. Show list of items
2. For each item, tap to assign to person(s)
3. Multiple persons can share one item (split it)

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Custom Split                       │
├──────────────────────────────────────┤
│  Assign items to people:            │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Burger (Rp 50.000)            │  │
│  │ 👤 Alice ✓   👤 Bob ✓         │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Fries (Rp 25.000)             │  │
│  │ 👤 Alice ✓                    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Coke (Rp 15.000)              │  │
│  │ 👤 Bob ✓                      │  │
│  └────────────────────────────────┘  │
│                                      │
│  [Calculate & Save]                 │
└──────────────────────────────────────┘
```

---

### 11. Split Method: Percentage Split

**Logic**:
1. User enters percentage for each person
2. Validation: must total 100%
3. Calculate amount = total × percentage

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Percentage Split                   │
├──────────────────────────────────────┤
│  Total: Rp 111.000                  │
│                                      │
│  Alice    [40]%  → Rp 44.400        │
│  Bob      [30]%  → Rp 33.300        │
│  Charlie  [30]]%  → Rp 33.300       │
│  ─────────────────                  │
│  Total:    100%                     │
│                                      │
│  [Save Bill]                        │
└──────────────────────────────────────┘
```

---

### 11.5 Split Method: Shared Items Split

**Logic**:
1. Show list of items with toggle
2. For each item, choose: "Assign to person" or "Share with everyone"
3. Assigned items → split among selected people
4. Shared items → split equally among ALL persons
5. Tax & service charge proportionally distributed

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Shared Items Split                 │
├──────────────────────────────────────┤
│  Toggle each item:                  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Pizza (Rp 120.000)             │  │
│  │ 🔘 Share with all              │  │
│  │ 👤 Alice ✓   👤 Bob ✓         │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Garlic Bread (Rp 40.000)       │  │
│  │ 🔘 Shared equally among all    │  │
│  │    ✓ All (4 people)            │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Drinks (Rp 60.000)             │  │
│  │ 🔘 Shared equally among all    │  │
│  │    ✓ All (4 people)            │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│  Who Paid the Bill?                  │
│  ○ Alice  ● Bob  ○ Charlie  ○ Diana │
│                                      │
│  Summary:                            │
│  Alice → Rp 37.000 (owes to Bob)    │
│  Charlie → Rp 37.000 (owes to Bob)  │
│  Diana → Rp 37.000 (owes to Bob)    │
│                                      │
│  [Save Bill]                        │
└──────────────────────────────────────┘
```

**Note**: The person who paid the bill (is_payer) acts as the "Bank". Everyone else owes their share to this person.

---

### 12. Review & Save Bill

**Screen**: Bill Summary

**Actions**:
1. Review all details (title, items, persons, split, total)
2. Edit any section if needed
3. Tap "Save Bill" to persist

**Confirmation**:
```
┌──────────────────────────────────────┐
│  ✅ Bill Saved Successfully!        │
│                                      │
│  Total: Rp 111.000                  │
│  Split between: Alice, Bob, Charlie  │
│                                      │
│  [View Bill Details]                │
│  [Create Another]                   │
└──────────────────────────────────────┘
```

---

### 13. Payment Summary & Settlement

**Screen**: Bill Detail > Payments Tab

**Features**:
- Shows who owes whom
- Minimum transfer calculation
- Mark as paid functionality

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Payment Summary                     │
├──────────────────────────────────────┤
│                                      │
│  Alice owes Bob: Rp 5.000    [Mark] │
│  Bob owes Charlie: Rp 12.000 [Mark] │
│                                      │
│  ─────────────────────              │
│  Minimum transfers to settle:       │
│  Alice → Charlie: Rp 7.000          │
│                                      │
│  [Share Bill]  [Download PDF]       │
└──────────────────────────────────────┘
```

---

### 13.5 Share Bill via Link

**Screen**: Bill Detail > Share Tab

**Steps**:
1. User taps "Share via Link" button
2. Optionally set: allow edit, expiration time, max views
3. Tap "Generate Link"
4. Copy generated URL or send directly via messaging app

**UI Mockup**:
```
┌──────────────────────────────────────┐
│  Share This Bill                     │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │ https://splitmate.app/        │  │
│  │ shared/abc123def456...  [Copy]│  │
│  └────────────────────────────────┘  │
│                                      │
│  Share options:                     │
│  □ Allow edit                        │
│  □ Expires in 48 hours              │
│  □ Max 10 views                     │
│                                      │
│  ─────────────────                  │
│  Share via:                         │
│  [WhatsApp] [Telegram] [Copy Link]  │
│                                      │
│  Current views: 3                   │
└──────────────────────────────────────┘
```

**Collaborator Experience (No Auth)**:
1. Opens link in browser
2. Sees bill details immediately
3. No app download, no account creation
4. If allow_edit is on: can add/remove items
5. If read-only: can view breakdown and who owes what

---

### 14. Mark Payment as Paid

**Steps**:
1. User taps "Mark" button on payment
2. Confirmation dialog
3. User confirms
4. Payment status updated to "Paid"
5. Summary recalculated

**Payment Flow (Bank Model)**:
```
Payer: Bob (paid the bill)
    
Bob → paid Rp 500,000 to restaurant
Alice → owes Bob Rp 150,000  [Mark as Paid]
Charlie → owes Bob Rp 200,000  [Mark as Paid]
Diana → owes Bob Rp 150,000  [Mark as Paid]

When Alice sends Rp 150,000 to Bob:
She taps "Mark as Paid" → status updated
```

**Steps**:
1. User taps "Mark" button on payment
2. Confirmation dialog: "Mark as paid?"
3. User confirms
4. Payment status updated to "Paid"
5. Summary recalculated

---

### 15. Bill History & Management

**Screen**: Bills List

**Features**:
- List all past bills
- Filter by date range
- Search by title
- Sort by date/amount

**Actions**:
- Tap bill → View details
- Long press/Edit → Modify bill
- Swipe/Delete → Remove bill

---

## Edge Cases & Error Handling

### OCR Failures
- **Low confidence**: Show warning, let user confirm/edit
- **No text detected**: Prompt "Couldn't read receipt. Enter manually?"
- **Partial read**: Show what's detected, allow manual additions

### Split Validation
- **Custom split - item unassigned**: Show warning
- **Percentage doesn't equal 100%**: Block save, show error
- **Single person**: Show error "Need at least 2 people"

### Network Errors
- **Offline**: Save to local storage, sync when online
- **Timeout**: Retry with exponential backoff

### Session Handling
- **Token expired**: Redirect to login
- **Refresh token expired**: Force re-login

---

## Premium User Flows

### Upgrade Prompt (Free User)
- On trying custom split: show PremiumModal
- On trying percentage split: show PremiumModal

### Premium Features
- Custom split (per-item assignment)
- Percentage split
- Share bill via link (read-only)
- Export to PDF
- Custom split available

---

## Mobile Considerations

### Camera Integration
- Use native camera via Web API or Capacitor
- Auto-focus and flash for receipt clarity
- Guide overlay showing receipt boundaries

### Offline Support
- Cache recent bills
- Queue OCR uploads for when online
- Show offline indicator in UI

### PWA Installation
- Service worker for offline capability
- Add to home screen prompt
- App-like experience