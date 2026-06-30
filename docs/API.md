# API Documentation

## Base URL

```
Production: https://api.splitmate.app/v1
Development: http://localhost:8080/api/v1
```

## Response Envelope

All API responses follow a consistent envelope:

**Success (2xx/3xx):**
```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

**Error (4xx/5xx):**
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "details": null
  }
}
```

The `data` field contains the endpoint-specific payload. On `204 No Content`, no body is returned.

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <access_token>
```

Refresh tokens are stored in an httpOnly cookie (`refresh_token`, Path=/api/v1/auth) — set automatically by Login/Register/Refresh endpoints.

---

## Endpoints Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create new account | No |
| POST | /auth/login | Login to account | No |
| POST | /auth/refresh | Refresh access token | No |
| POST | /auth/logout | Invalidate refresh token | No (uses cookie) |
| PUT | /users/me | Update user profile | Yes |
| POST | /bills | Create new bill | Yes |
| GET | /bills | List user's bills | Yes |
| GET | /bills/:id | Get bill details | Yes |
| PUT | /bills/:id | Update bill | Yes |
| DELETE | /bills/:id | Delete bill | Yes |
| POST | /bills/:id/share | Generate shareable link | Yes |
| GET | /shared/:token | View shared bill (no auth) | No |
| POST | /ocr | Process receipt image | No (public, IP rate limited) |
| GET | /payments/:bill_id | Get payment summary | Yes |
| POST | /payments/:bill_id/settle | Mark payment as paid | Yes |

| POST | /premium/subscribe | Subscribe to premium | Yes |
| POST | /premium/callback | Payment confirmation callback | No (requires X-Callback-Secret header) |
| POST | /premium/subscribe | Generate premium subscription payment link | Yes |

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201 Created)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free",
    "created_at": "2024-01-15T10:00:00Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Validation Rules**
- Email: valid format, unique, max 255 chars
- Password: min 8 chars, max 72 chars
- Name: min 1 char, max 100 chars

---

### POST /auth/login

Login with email and password.

**Request**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK)**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "free"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error (401 Unauthorized)**
```json
{
  "success": false,
  "message": "Email or password is incorrect",
  "error": {
    "code": "INVALID_CREDENTIALS",
    "details": null
  }
}
```

---

### POST /auth/refresh

Refresh expired access token. Reads refresh token from httpOnly cookie (set by Login/Register).

**Request**: empty body

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### POST /auth/logout

Invalidate refresh token.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (204 No Content)**

---

## User Endpoints

### GET /users/me

Get current user profile.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Response (200 OK)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "tier": "free",
  "ocr_usage": {
    "current": 3,
    "limit": 5,
    "reset_at": "2024-02-01T00:00:00Z"
  },
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### PUT /users/me

Update user profile.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "name": "John Updated",
  "password": "newPassword123"
}
```

**Response (200 OK)**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Updated",
  "tier": "free",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

---

## Bill Endpoints

### POST /bills

Create a new bill.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request (from OCR result)**
```json
{
  "title": "Dinner at Restaurant",
  "items": [
    {"name": "Burger", "price": 50000, "quantity": 2},
    {"name": "Fries", "price": 25000, "quantity": 1},
    {"name": "Coke", "price": 15000, "quantity": 3}
  ],
  "service_charge": 10.0,
  "tax": 11.0,
  "persons": [
    {"name": "Alice"},
    {"name": "Bob"}
  ],
  "split_type": "equal",
  "assignments": []
}
```

> Items can optionally include `quantity` (default 1). Frontend computes total = price × quantity per item.

**Request (with custom split)**
```json
{
  "title": "Dinner at Restaurant",
  "items": [
    {"name": "Burger", "price": 50000, "quantity": 2},
    {"name": "Fries", "price": 25000, "quantity": 1},
    {"name": "Coke", "price": 15000, "quantity": 3}
  ],
  "service_charge": 10.0,
  "tax": 11.0,
  "persons": [
    {"name": "Alice"},
    {"name": "Bob"}
  ],
  "split_type": "custom",
  "assignments": [
    {"item_id": "item-uuid-1", "person_id": "person-uuid-1"},
    {"item_id": "item-uuid-2", "person_id": "person-uuid-2"},
    {"item_id": "item-uuid-3", "person_id": "person-uuid-1"}
  ]
}
```

**Request (percentage split)**
```json
{
  "title": "Dinner at Restaurant",
  "items": [...],
  "service_charge": 10.0,
  "tax": 11.0,
  "persons": [
    {"name": "Alice", "percentage": 60},
    {"name": "Bob", "percentage": 40}
  ],
  "split_type": "percentage"
}
```

**Request (shared items split)**
```json
{
  "title": "Dinner at Restaurant",
  "items": [
    {"name": "Pizza Margherita", "price": 120000},
    {"name": "Pasta Carbonara", "price": 100000},
    {"name": "Garlic Bread", "price": 40000},
    {"name": "Soft Drinks", "price": 60000}
  ],
  "service_charge": 5.0,
  "tax": 11.0,
  "persons": [
    {"name": "Alice", "is_payer": true},
    {"name": "Bob", "is_payer": false},
    {"name": "Charlie", "is_payer": false},
    {"name": "Diana", "is_payer": false}
  ],
  "split_type": "shared_items",
  "assignments": [
    {"item_id": "item-uuid-1", "person_id": "person-uuid-1"},
    {"item_id": "item-uuid-2", "person_id": "person-uuid-2"}
  ]
}
```

**Response (201 Created)**
```json
{
  "id": "uuid",
  "title": "Dinner at Restaurant",
  "total_amount": 100000,
  "service_charge": 10000,
  "tax": 11000,
  "grand_total": 121000,
  "items": [...],
  "persons": [...],
  "split_type": "equal",
  "payments": [
    {
      "from_person": "Alice",
      "to_person": "Restaurant",
      "amount": 60500
    },
    {
      "from_person": "Bob",
      "to_person": "Restaurant",
      "amount": 60500
    }
  ],
  "created_at": "2024-01-15T12:00:00Z"
}
```

---

### GET /bills

List user's bills with pagination.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| limit | int | 20 | Items per page |
| from_date | string | - | Filter from date (ISO8601) |
| to_date | string | - | Filter to date (ISO8601) |

**Example**: `/api/v1/bills?page=1&limit=10&from_date=2024-01-01`

**Response (200 OK)**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Dinner at Restaurant",
      "grand_total": 121000,
      "person_count": 2,
      "created_at": "2024-01-15T12:00:00Z"
    },
    {
      "id": "uuid",
      "title": "Grocery Shopping",
      "grand_total": 250000,
      "person_count": 3,
      "created_at": "2024-01-14T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total_items": 50,
    "total_pages": 5
  }
}
```

---

### GET /bills/:id

Get bill details with full breakdown.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Response (200 OK)**
```json
{
  "bill": {
    "id": "uuid",
    "title": "Dinner at Restaurant",
    "total_amount": 100000,
    "service_charge": 10.0,
    "tax": 11.0,
    "grand_total": 121000,
    "items": [
      {
        "id": "item-uuid-1",
        "name": "Burger",
        "price": 50000,
        "quantity": 1,
        "assigned_to": ["Alice"]
      },
      {
        "id": "item-uuid-2",
        "name": "Fries",
        "price": 25000,
        "quantity": 1,
        "assigned_to": ["Alice"]
      },
      {
        "id": "item-uuid-3",
        "name": "Coke",
        "price": 15000,
        "quantity": 2,
        "assigned_to": ["Bob"]
      }
    ],
    "persons": [
      {"id": "person-uuid-1", "name": "Alice", "is_payer": true},
      {"id": "person-uuid-2", "name": "Bob", "is_payer": false}
    ],
    "split_type": "custom",
    "payments": [
      {
        "id": "payment-uuid-1",
        "from_person": "Alice",
        "to_person": "Alice",
        "amount": 15000,
        "is_paid": true
      },
      {
        "id": "payment-uuid-2",
        "from_person": "Bob",
        "to_person": "Alice",
        "amount": 45000,
        "is_paid": false
      }
    ],
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  },
  "settlement_summary": {
    "Bob owes Alice": 45000
  }
}
```

---

### PUT /bills/:id

Update bill (add/edit items, persons, split type).

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "title": "Updated Title",
  "items": [
    {"id": "existing-item-uuid", "name": "Burger", "price": 55000},
    {"name": "New Item", "price": 20000}
  ],
  "persons": [
    {"id": "existing-person-uuid", "name": "Alice"},
    {"name": "Charlie"}
  ],
  "split_type": "equal"
}
```

**Response (200 OK)**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  ...
}
```

---

### DELETE /bills/:id

Delete a bill and all related data.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Response (204 No Content)**

---

## Share Endpoints

### POST /bills/:id/share

Generate a shareable link for a bill (no auth required for collaborators).

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "allow_edit": false,
  "expires_in_hours": 48
}
```

**Response (200 OK)**
```json
{
  "share_token": "a1b2c3d4e5f6...64charhex",
  "share_url": "https://splitmate.app/shared/a1b2c3d4e5f6...",
  "allow_edit": false,
  "expires_at": "2024-01-17T10:00:00Z"
}
```

---

### GET /shared/:token

View shared bill via link (no authentication required).

**Response (200 OK)**
```json
{
  "bill": {
    "id": "uuid",
    "title": "Dinner at Restaurant",
    "items": [
      {"name": "Burger", "price": 50000, "assigned_to": ["Alice"]},
      {"name": "Fries", "price": 25000, "assigned_to": []},
      {"name": "Coke", "price": 15000, "assigned_to": ["Bob"]}
    ],
    "persons": [
      {"id": "uuid-1", "name": "Alice", "is_payer": true},
      {"id": "uuid-2", "name": "Bob", "is_payer": false}
    ],
    "total_amount": 90000,
    "service_charge": 9000,
    "tax": 9900,
    "grand_total": 108900,
    "split_type": "shared_items",
    "payments": [
      {"from_person": "Alice", "to_person": "Alice", "amount": 58500, "is_paid": true},
      {"from_person": "Bob", "to_person": "Alice", "amount": 50400, "is_paid": false}
    ],
    "created_at": "2024-01-15T12:00:00Z"
  },
  "share": {
    "allow_edit": false,
    "current_views": 3,
    "created_at": "2024-01-15T12:00:00Z"
  }
}
```

**Error (404 Not Found)**
```json
{
  "error": {
    "code": "SHARE_NOT_FOUND",
    "message": "Share link is invalid or expired"
  }
}
```

---

## OCR Endpoints

### POST /ocr/process

Process receipt image and extract items. **Public endpoint** — no auth required. Rate limited to 10 requests/minute per IP address.

**Request Headers**
```
Content-Type: multipart/form-data
```

**Form Data**
| Field | Type | Description |
|-------|------|-------------|
| image | file | Receipt image (JPEG, PNG, WebP) — also accepts `receipt` for compatibility |

**Response (200 OK)**
```json
{
  "title": "Restaurant Name",
  "items": [
    {"name": "Burger", "price": 50000, "quantity": 2},
    {"name": "Fries", "price": 25000, "quantity": 1},
    {"name": "Coke", "price": 15000, "quantity": 3}
  ],
  "service_charge": 10.0,
  "service_mode": "amount",
  "tax": 11.0,
  "tax_mode": "amount",
  "total": 185000
}
```

> `quantity` is the number of units. Frontend computes total = price × quantity per item.
> `total` = sum(items) + service_charge + tax.

**Error (429 Too Many Requests)** — IP rate limit exceeded
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  }
}
```

---

## Payment Endpoints

### GET /payments/:bill_id

Get payment summary and settlement details.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Response (200 OK)**
```json
{
  "bill_id": "uuid",
  "payments": [
    {
      "id": "payment-uuid",
      "from_person": "Alice",
      "to_person": "Bob",
      "amount": 15000,
      "is_paid": false
    }
  ],
  "settlement": {
    "total_owed": 121000,
    "settled": 45000,
    "remaining": 76000,
    "minimum_transfers": [
      {"from": "Alice", "to": "Bob", "amount": 15000}
    ]
  }
}
```

---

### POST /payments/:bill_id/settle

Mark a payment as paid.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "payment_id": "payment-uuid",
  "amount_paid": 15000
}
```

**Response (200 OK)**
```json
{
  "id": "payment-uuid",
  "from_person": "Alice",
  "to_person": "Bob",
  "amount": 15000,
  "is_paid": true,
  "paid_at": "2024-01-15T14:00:00Z"
}
```

---

## Premium Endpoints

### POST /premium/subscribe

Create Stripe checkout session.

**Request Headers**
```
Authorization: Bearer <access_token>
```

**Request**
```json
{
  "price_id": "price_premium_monthly"
}
```

**Response (200 OK)**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_session_xxx"
}
```

---

### POST /premium/webhook

Handle Stripe webhooks.

**Headers**: Stripe signature required

**Events Handled**:
- `checkout.session.completed` - Activate premium
- `customer.subscription.updated` - Update tier
- `customer.subscription.deleted` - Downgrade to free

**Response (200 OK)**

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_CREDENTIALS | 401 | Email or password incorrect |
| USER_ALREADY_EXISTS | 409 | Email already registered |
| TOKEN_EXPIRED | 401 | JWT access token expired |
| TOKEN_MISSING | 401 | Missing authorization header |
| TOKEN_INVALID | 401 | JWT token is invalid |
| BILL_NOT_FOUND | 404 | Bill ID doesn't exist |
| UNAUTHORIZED | 401 | Not authenticated |
| PREMIUM_REQUIRED | 403 | Feature requires premium subscription |
| MISSING_ID | 400 | Bill ID is required |
| INVALID_INPUT | 400 | Invalid request body |
| VALIDATION_ERROR | 400 | Invalid request data |
| INVALID_FILE | 400 | Image file is required |
| INVALID_FILE_FORMAT | 422 | Unsupported image format or file too large |
| RATE_LIMITED | 429 | IP rate limit hit |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Scope |
|----------|-------|-------|
| /ocr/* | 10 requests/minute | Per IP (public endpoint) |

---

## Versioning

- API version in URL: `/api/v1/`
- Backward-compatible changes will not bump version
- Breaking changes will result in new version (v2)