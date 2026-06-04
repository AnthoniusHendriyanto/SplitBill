# Architecture Documentation

## Overview

SplitMate follows **Clean Architecture** with clear separation between layers, ensuring testability, maintainability, and scalability.

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│                  Web App / PWA (Mobile)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                  (Nginx / Cloud Load Balancer)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Go)                              │
├─────────────────────────────────────────────────────────────┤
│  Delivery Layer                                             │
│  ├── Auth Handlers (register, login, refresh)               │
│  ├── Bill Handlers (create, read, update, delete)           │
│  ├── OCR Handlers (image upload, processing)                │
│  ├── Share Handlers (generate link, view shared bill)       │
│  └── User Handlers (profile, premium)                       │
├─────────────────────────────────────────────────────────────┤
│  UseCase Layer                                              │
│  ├── AuthUsecase (validation, token generation)            │
│  ├── BillUsecase (business logic, split calculation)        │
│  ├── OCRUsecase (image processing, result parsing)         │
│  └── UserUsecase (profile, tier management)                │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer                                               │
│  ├── Models (User, Bill, Item, Person, Payment, Share)      │
│  ├── Interfaces (Repository, Service contracts)             │
│  └── Business Rules (split algorithms, validation)          │
├─────────────────────────────────────────────────────────────┤
│  Repository Layer                                           │
│  ├── PostgreSQL Repositories (bills, users, items, shares)  │
│  ├── OCR Service (PaddleOCR → OpenRouter Free → Gemini Free)│
│  └── Cache (Redis - optional for scaling)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (PostgreSQL)                      │
│                Primary DB + Read Replicas                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. Delivery Layer (HTTP Handlers)
- Parse incoming requests (JSON input validation)
- Call appropriate use cases
- Format responses (JSON)
- Handle HTTP status codes and errors

### 2. UseCase Layer (Business Logic)
- Orchestrate business operations
- Apply business rules and validation
- Coordinate between domain and repositories
- **Never access HTTP request/response directly**

### 3. Domain Layer (Business Rules)
- Define data models (structs)
- Define repository interfaces
- Define service interfaces
- Pure Go - no external dependencies

### 4. Repository Layer (Data Access)
- Implement repository interfaces
- Handle database operations (PostgreSQL)
- Handle external services (PaddleOCR, OpenRouter, Gemini)

---

## Database Architecture

### Connection Pool Configuration

For medium volume (100-10K users):

```sql
-- PostgreSQL settings in postgresql.conf
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Connection Pool (Go)

```go
// In repository/postgres.go
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)
```

### Scaling Strategy (Future)

```
                    ┌──────────────────┐
                    │   Load Balancer   │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ API Pod 1│        │ API Pod 2│        │ API Pod 3│
   └────┬─────┘        └────┬─────┘        └────┬─────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │  Primary │      │  Read    │      │  Read    │
   │    DB    │◄────►│ Replica 1│◄────►│ Replica 2│
   └──────────┘      └──────────┘      └──────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Register
   User ──POST /api/v1/auth/register──► Server
                                          │
                                          ▼
                                    Validate input
                                          │
                                          ▼
                                    Hash password (bcrypt)
                                          │
                                          ▼
                                    Create user in DB
                                          │
                                          ▼
                                    Generate JWT pair
                                          │
                                          ▼
   User ◄─── Response (tokens) ─── Server

2. Login
   User ──POST /api/v1/auth/login──► Server
                                      │
                                      ▼
                                Verify credentials
                                      │
                                      ▼
                                Generate JWT pair
                                      │
                                      ▼
   User ◄─── Response (tokens) ─── Server

3. Access Protected Route
   User ──GET /api/v1/bills (with JWT) ──► Server
                                          │
                                          ▼
                                    Validate JWT
                                          │
                                          ▼
                                    Extract user_id
                                          │
                                          ▼
                                    Fetch data from DB
                                          │
                                          ▼
   User ◄─── Response ── Server

4. Token Refresh
   User ──POST /api/v1/auth/refresh (with refresh token) ──► Server
                                                              │
                                                              ▼
                                                        Validate refresh token
                                                              │
                                                              ▼
                                                        Generate new JWT pair
                                                              │
                                                              ▼
   User ◄─── Response (new tokens) ── Server
```

---

## OCR Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     OCR Processing Flow                      │
└─────────────────────────────────────────────────────────────┘

User uploads image
        │ (public endpoint, no auth required)
        ▼
┌───────────────────┐
│  Validate image   │ ──► Check file type, size (<10MB)
│     format        │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  IP Rate Limit    │ ──► 10 requests/minute per IP
│     Check         │     (middleware/ratelimit.go)
└────────┬──────────┘
         │
         ▼ (if allowed)
┌───────────────────┐
│  PaddleOCR        │ ──► Local Python OCR (paddle_ocr.py)
│  (text extraction)│     Returns raw text lines
└────────┬──────────┘
         │
         ▼
┌───────────────────────┐
│  OpenRouter Free      │ ──► Send raw OCR text to
│  (structured parsing) │     openrouter/free (auto-failover
│                       │     across free models)
└───────────┬───────────┘
            │
       ┌────┴────┐
       ▼         ▼
    Success   OpenRouter fails
       │         │
       │         ▼
       │  ┌───────────────────┐
       │  │  Gemini Flash Free│ ──► Fallback parse
       │  │  (Gemini 2.5)     │
       │  └────────┬──────────┘
       │           │
       │      ┌────┴────┐
       │      ▼         ▼
       │   Success   Both fail
       │      │         │
       │      │         ▼
       │      │    Return 500 error
       ▼      ▼
┌──────────────────────────┐
│  Parse & validate result │ ──► Extract items, prices,
│  (parseStructuredJSON)   │     quantities, totals
└───────────┬──────────────┘
            │
            ▼
┌───────────────────┐
│  Build OCRResult  │ ──► Items with name, price, quantity
│  (buildOCRResult) │     + service_charge, tax, confidence
└────────┬──────────┘
         │
         ▼
   Return OCR Result
   (items, service_charge, tax)
```

---

## Split Calculation Logic

### Equal Split Algorithm
```
1. Calculate total = sum(items) + (service_charge %) + (tax %)
2. per_person = total / number_of_persons
3. Create payment records for each person
```

### Custom Split Algorithm
```
1. For each item assignment (item_id → person_id)
2. Track running total per person
3. Calculate service_charge & tax proportionally
4. Create payment records
```

### Percentage Split Algorithm
```
1. total = sum(items) + service_charge + tax
2. For each person: amount = total * (percentage / 100)
3. Validate percentages sum to 100%
4. Create payment records
```

### Shared Items Split Algorithm
```
1. Separate items into two categories:
   a. Assigned items → assigned to specific person(s)
   b. Unassigned items → shared equally among ALL persons
2. For each assigned item, split amount among assigned persons
3. For each shared item, split amount equally among all persons
4. total_individual = sum of assigned items for that person
5. total_shared = sum of shared items / number_of_persons
6. subtotal = total_individual + total_shared
7. Calculate service_charge & tax proportionally per person
8. person_pays = subtotal + (proportion of service_charge & tax)
9. Create payment record for each person
```

### Settlement Optimization (Minimum Transactions)
```
Input: List of payments (who owes whom)
Output: Minimum transactions to settle all debts

Algorithm (Greedy):
1. Calculate net balance for each person
2. Separate into creditors (+) and debtors (-)
3. Match largest creditor with largest debtor
4. Transfer min(credit, debt) amount
5. Repeat until all balances are zero
```

---

## Error Handling

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success (GET, PUT) |
| 201 | Created (POST) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation failed) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "details": {}
  }
}
```

---

## Security Measures

1. **Password**: bcrypt with cost factor 12
2. **JWT**: HS256, configurable expiry (default 15min access, 7 day refresh)
3. **HTTPS**: TLS 1.3 in production
4. **Rate Limiting**: Auth 10 req/min (global), OCR 10 req/min (per IP), Bills 60 req/min (per user), Users 30 req/min (per user)
5. **CORS**: Configurable origin whitelist (env var `CORS_ORIGIN`)
6. **Input Sanitization**: No raw SQL, parameterized queries only
7. **Refresh Token Persistence**: Refresh tokens stored in DB, enabling revocation

---

## Shareable Link Flow (No Auth Required)

```
┌─────────────────────────────────────────────────────────────┐
│                    Shareable Link Flow                       │
└─────────────────────────────────────────────────────────────┘

1. Bill Creator (authenticated)
   User ──POST /api/v1/bills/{id}/share──► Server
                                           │
                                           ▼
                                     Generate share_token
                                     (64 char hex string)
                                           │
                                           ▼
   User ◄─── { share_token, share_url } ── Server

2. Collaborator (no auth, any browser)
   Collaborator opens link ──GET /api/v1/shared/{token}──► Server
                                                            │
                                                            ▼
                                                      Validate token
                                                      (check expiration,
                                                       max views)
                                                            │
                                                            ▼
                                                      Increment view count
                                                            │
                                                            ▼
   Collaborator ◄─── Bill details (read-only or edit) ── Server
```

## Payment as Bank Model

```
1. Mark who paid the bill (is_payer = true)
2. Calculate each person's share via split algorithm
3. Everyone owes their share to the Payer (the "Bank")
4. Payment records: from_person = person, to_person = payer
5. Each person marks their debt as paid when they transfer money

Example:
Payer: Alice (paid Rp 500,000)
Shares: Bob = Rp 150,000, Charlie = Rp 200,000, Alice = Rp 150,000

Debts:
- Bob owes Alice: Rp 150,000
- Charlie owes Alice: Rp 200,000
- Alice owes herself: Rp 0
```

## File Structure (Clean Architecture)

```
cmd/
└── api/
    └── main.go                 # Entry point, wire dependencies

internal/
├── config/
│   └── config.go               # Environment config loader

├── domain/
│   ├── user.go                 # User model + auth request/response
│   ├── bill.go                 # Bill, Item, Person (with is_payer), Payment
│   ├── share.go                # Share model + repository interface
│   ├── errors.go               # Domain-specific errors
│   ├── usage.go                # Usage tracking model
│   ├── bill_usecase.go         # Bill use case interface
│   ├── auth_usecase.go         # Auth use case interface
│   ├── user_repository.go      # Repository interface
│   ├── bill_repository.go      # Repository interface
│   ├── usage_repository.go     # Usage repository interface
│   └── ocr_service.go          # OCR service interface

├── delivery/
│   └── http/
│       ├── middleware/
│       │   ├── auth.go         # JWT authentication middleware
│       │   ├── cors.go         # Configurable CORS origin
│       │   └── ratelimit.go    # IP-based rate limiter (10 req/min for OCR)
│       ├── auth_handler.go     # Auth HTTP handlers
│       ├── bill_handler.go     # Bill + OCR HTTP handlers
│       └── router.go           # Route registration

├── usecase/
│   ├── auth_usecase.go        # JWT generation, bcrypt password
│   └── bill_usecase.go       # Bill CRUD, 4 split types, OCR, shares

└── repository/
    └── postgres/
        ├── connection.go       # pgxpool connection
        ├── user_repository.go
        ├── bill_repository.go
        ├── item_repository.go  # Items + Persons
        ├── assignment_repository.go
        ├── payment_repository.go
        ├── share_repository.go
        ├── usage_repository.go
        ├── ocr_service.go      # PaddleOCR → OpenRouter → Gemini pipeline
        └── paddle_ocr.py       # PaddleOCR Python wrapper

migrations/
├── 001_users.sql
├── 002_bills.sql
├── 003_items.sql
├── 004_persons.sql             # with is_payer
├── 005_item_assignments.sql
├── 006_payments.sql
├── 007_usage_tracking.sql
├── 008_refresh_tokens.sql
├── 009_shares.sql              # shareable links table
├── 010_venue_intelligence.sql
├── 011_split_type.sql
└── 012_timestamptz_checks.sql  # TIMESTAMPTZ + CHECK constraints

run_migrations.sh               # Idempotent migration runner
```