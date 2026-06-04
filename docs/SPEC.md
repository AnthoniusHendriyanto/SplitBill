# SplitMate - Application Specification

## Project Overview

**Project Name**: SplitMate  
**Type**: Bill Splitting Web Application (PWA-ready)  
**Frontend**: React (Web, installable to mobile later)  
**Backend**: Go with PostgreSQL  
**Target Users**: Groups of friends, roommates, colleagues splitting bills at restaurants, shared expenses, events

---

## Core Features

### 1. User Authentication

| Feature | Description |
|---------|-------------|
| **Register** | Email + password signup |
| **Login** | JWT-based authentication |
| **Logout** | Token invalidation |
| **Refresh Token** | Long-lived refresh tokens |

### 2. Bill Capture Methods

| Method | Description |
|--------|-------------|
| **Photo Capture** | Take photo with device camera → upload for OCR (PaddleOCR → OpenRouter → Gemini) |
| **Manual Upload** | Select existing image from gallery → OCR processing |
| **Manual Entry** | Form-based input (item name + price manually) |

### 3. Bill Management

| Feature | Description |
|---------|-------------|
| **Create Bill** | From OCR result or manual entry |
| **Edit Bill** | Modify items, prices, persons |
| **Delete Bill** | Remove bill with all related data |
| **View History** | List all past bills |
| **Bill Details** | Full breakdown with split calculations |

### 4. Split Calculation

| Method | Description |
|--------|-------------|
| **Equal Split** | Divide total evenly among all persons |
| **Custom Split** | Assign specific items to specific persons |
| **Percentage Split** | Define percentage for each person |
| **Shared Items** | Hybrid: assign items to people OR mark as shared (split equally) |

### 6. Shareable Links (No Auth)

| Feature | Description |
|---------|-------------|
| **Generate Link** | Create shareable URL from any bill |
| **No Login Required** | Collaborators can view via browser without account |
| **View-Only or Edit** | Optional allow-edit mode |
| **Expiration** | Optional link expiration in hours |
| **Max Views** | Optional view limit |

### 7. Payment as Bank Model

| Feature | Description |
|---------|-------------|
| **Who Paid** | The person who paid the bill is marked as "Bank" |
| **Debts to Bank** | Everyone else owes their share to the person who paid |
| **Mark Settled** | Each person marks their debt to the bank as paid |

### Settlement Tracking

| Feature | Description |
|---------|-------------|
| **Who Owes Who** | Calculate debt relationships |
| **Mark as Paid** | Record partial/full payments |
| **Settlement Summary** | Show minimum transactions to settle |

---

## Premium Features (Freemium Model)

| Feature | Free Tier | Premium Tier |
|---------|-----------|--------------|
| OCR Scans | Unlimited | Unlimited |
| Manual Bills | Unlimited | Unlimited |
| Bill History | 30 days | Forever |
| Export to PDF | No | Yes |
| Custom Split | No | Yes |
| Percentage Split | No | Yes |
| Shared Items Split | Yes | Yes |
| Shareable Links | Yes (unlimited) | Yes (unlimited) |
| No Login for Viewers | Yes | Yes |

---

## Data Models

### User
```
- id: UUID
- email: string (unique)
- password_hash: string
- tier: enum (free, premium)
- stripe_customer_id: string (nullable)
- created_at: timestamp
- updated_at: timestamp
```

### Bill
```
- id: UUID
- user_id: UUID (owner)
- title: string
- total_amount: decimal
- service_charge: decimal
- tax: decimal
- created_at: timestamp
- updated_at: timestamp
```

### Item
```
- id: UUID
- bill_id: UUID (FK)
- name: string
- price: decimal
- quantity: integer (default 1)
- created_at: timestamp
```

### Person
```
- id: UUID
- bill_id: UUID (FK)
- name: string
- created_at: timestamp
```

### ItemAssignment
```
- id: UUID
- item_id: UUID (FK)
- person_id: UUID (FK)
- created_at: timestamp
```

### Payment
```
- id: UUID
- bill_id: UUID (FK)
- from_person_id: UUID (FK)
- to_person_id: UUID (FK)
- amount: decimal
- is_paid: boolean
- created_at: timestamp
```

### UsageTracking
```
- id: UUID
- user_id: UUID (FK)
- action: string (ocr_scan)
- count: integer
- month: string (YYYY-MM)
- created_at: timestamp
```

### Share
```
- id: UUID
- bill_id: UUID (FK)
- share_token: string (64 chars, unique)
- view_token: string (64 chars)
- allow_edit: boolean
- max_views: integer (nullable)
- current_views: integer
- expires_at: timestamp (nullable)
- created_at: timestamp
```

### Person (updated)
```
- id: UUID
- bill_id: UUID (FK)
- name: string
- is_payer: boolean  ← NEW: marks who paid the bill (the "bank")
- percentage: decimal
- created_at: timestamp
```

---

## Non-Functional Requirements

### Performance
- API response time < 200ms (p95)
- OCR processing < 5 seconds
- Database connection pool: 20-50 connections

### Scalability
- Horizontal scaling via read replicas
- Stateless API (JWT auth)
- CDN for static assets (frontend)

### Security
- Password hashing: bcrypt
- JWT expiration: 15 min access, 7 days refresh
- HTTPS only in production
- Rate limiting on auth endpoints

### Data Retention
- Free tier: 30 days bill history
- Premium tier: indefinite

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | Go 1.22+ |
| Database | PostgreSQL 15+ |
| ORM | GORM or raw SQL |
| Auth | JWT (golang-jwt) |
| OCR | PaddleOCR (local) → OpenRouter Free Router → Gemini Flash Free |
| Frontend | React 18+ |
| Styling | Tailwind CSS |
| State | React Query / Zustand |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | Yes |
| `DB_USER` | Database username | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `DB_NAME` | Database name | Yes |
| `PORT` | API server port | Yes |
| `JWT_SECRET` | JWT signing key | Yes |
| `JWT_ACCESS_EXPIRY` | Access token TTL (default `15m`) | No |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL (default `168h`) | No |
| `DB_POOL_MAX_OPEN` | Max open connections (default `25`) | No |
| `DB_POOL_MAX_IDLE` | Max idle connections (default `5`) | No |
| `DB_POOL_LIFETIME` | Conn max lifetime (default `5m`) | No |
| `SERVER_READ_TIMEOUT` | HTTP read timeout (default `10s`) | No |
| `SERVER_WRITE_TIMEOUT` | HTTP write timeout (default `30s`) | No |
| `SERVER_IDLE_TIMEOUT` | HTTP idle timeout (default `120s`) | No |
| `SSL_MODE` | PostgreSQL SSL mode (default `disable`) | No |
| `CORS_ORIGIN` | Allowed CORS origin (default `http://localhost:5173`) | No |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes (for OCR) |
| `GEMINI_API_KEY` | Google Gemini API Key | Yes (for OCR fallback) |
| `STRIPE_SECRET_KEY` | Stripe API key | Yes (for premium) |

---

## Project Structure (Implemented)

```
splitbill_backend/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point, wires all dependencies
├── internal/
│   ├── config/
│   │   └── config.go               # PostgreSQL, JWT, Stripe config
│   ├── domain/
│   │   ├── user.go                 # User model + auth request/response
│   │   ├── bill.go                 # Bill, Item, Person (with is_payer), Payment, SplitType
│   │   ├── share.go                # Share model + repository interface
│   │   ├── ocr_service.go          # OCR service interface
│   │   ├── usage.go                # Usage tracking model
│   │   ├── errors.go               # Domain-specific errors
│   │   ├── auth_usecase.go         # Auth use case interface
│   │   ├── bill_usecase.go         # Bill use case interface
│   │   ├── bill_repository.go      # Bill repository interface
│   │   ├── user_repository.go      # User repository interface
│   │   └── usage_repository.go     # Usage repository interface
│   ├── delivery/
│   │   └── http/
│       │       ├── middleware/
│       │       │   ├── auth.go         # JWT auth middleware
│       │       │   ├── cors.go         # Configurable CORS origin
│       │       │   └── ratelimit.go    # IP-based rate limiter (10/min OCR)
│   │       ├── auth_handler.go     # Register, Login, Refresh handlers
│   │       ├── bill_handler.go     # CRUD + OCR handlers
│   │       └── router.go           # Route registration (gorilla/mux)
│   ├── usecase/
│   │   ├── auth_usecase.go        # JWT generation, bcrypt password
│   │   └── bill_usecase.go        # Bill CRUD, split calculations, OCR
│   └── repository/
│       └── postgres/
│           ├── connection.go       # pgxpool connection setup
│           ├── user_repository.go
│           ├── bill_repository.go
│           ├── item_repository.go  # Items + Persons repositories
│           ├── assignment_repository.go
│           ├── payment_repository.go
│           ├── share_repository.go
│           ├── usage_repository.go
│           ├── ocr_service.go      # PaddleOCR → OpenRouter → Gemini pipeline
│           └── paddle_ocr.py       # PaddleOCR Python wrapper
├── migrations/
│   ├── 001_users.sql
│   ├── 002_bills.sql
│   ├── 003_items.sql
│   ├── 004_persons.sql             # With is_payer field
│   ├── 005_item_assignments.sql
│   ├── 006_payments.sql
│   ├── 007_usage_tracking.sql
│   ├── 008_refresh_tokens.sql
│   ├── 009_shares.sql              # Shareable links
│   ├── 010_venue_intelligence.sql
│   ├── 011_split_type.sql
│   └── 012_timestamptz_checks.sql  # TIMESTAMPTZ + CHECK constraints
├── run_migrations.sh           # Idempotent migration runner
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── USER_FLOW.md
│   ├── PREMIUM_RECOMMENDATION.md
│   └── UNIQUE_FEATURES.md
└── go.mod
```