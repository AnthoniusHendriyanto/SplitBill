# SplitMate Backend

High-performance bill splitting API with AI-powered receipt scanning. Built with Go and PostgreSQL.

## Tech Stack

- **Language**: Go 1.26
- **Database**: PostgreSQL 15+ (pgx/v5 pool)
- **Router**: gorilla/mux
- **Auth**: JWT (golang-jwt) + bcrypt + refresh token persistence
- **OCR Pipeline**: PaddleOCR (local) → OpenRouter Free Router → Gemini Flash Free
- **UUID**: google/uuid
- **Config**: godotenv (12-factor)

## Key Features

- **AI-Powered OCR**: PaddleOCR extracts raw text → Groq (5-model rotation: Llama 4 Scout vision, Llama 3.3-70B, Qwen3-32B, GPT-OSS-20B, Llama 3.1-8B). Vision-first pipeline (image→JSON) with text fallback. No regex fallback, no paid AI.
- **Clean Architecture**: Delivery → UseCase → Domain → Repository separation for testability.
- **4 Split Types**: Equal, Custom (per-item), Percentage, Shared Items.
- **Payment-as-Bank Model**: The person who paid is the "bank"; all debts flow to them.
- **Discount Handling**: "You saved Rp X" badge shows total discounts. Monthly spending shows pre-discount amount (what would have been spent without discounts).
- **Shareable Links**: No-auth bill sharing with optional expiry and view limits.
- **Premium Gating**: Freemium model ($2.99/month) with OCR usage tracking.
- **Resilient**: Configurable connection pool, graceful shutdown, rate limiting, CORS whitelist.
- **All config env-driven**: JWT expiry, pool config, server timeouts, SSL mode, CORS origin — no hardcoded values.

## Prerequisites

- **Go** 1.26+
- **PostgreSQL** 15+
- **Python 3.8+** (for PaddleOCR; `paddleocr` v2.10.0 + `paddlepaddle` v2.6.2)
- API keys for OpenRouter and Gemini (see `.env.example`)

## Getting Started

### 1. Clone & Enter

```bash
git clone <repo-url> splitbill_backend
cd splitbill_backend
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `splitmate` |
| `PORT` | API server port | `8080` |
| `JWT_SECRET` | JWT signing key | *(required)* |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `168h` (7d) |
| `DB_POOL_MAX_OPEN` | Max open connections | `25` |
| `DB_POOL_MAX_IDLE` | Max idle connections | `5` |
| `DB_POOL_LIFETIME` | Conn max lifetime | `5m` |
| `SERVER_READ_TIMEOUT` | HTTP read timeout | `10s` |
| `SERVER_WRITE_TIMEOUT` | HTTP write timeout | `30s` |
| `SERVER_IDLE_TIMEOUT` | HTTP idle timeout | `120s` |
| `SSL_MODE` | PostgreSQL SSL mode | `disable` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `OPENROUTER_API_KEY` | OpenRouter API key | *(required for OCR)* |
| `GEMINI_API_KEY` | Google Gemini API key | *(required for OCR)* |

### 3. Database Migrations

```bash
./run_migrations.sh
```

Idempotent — uses a `_migrations` tracking table to avoid re-applying. Supports all 12 migrations (001–012).

### 4. Install Go Dependencies

```bash
go mod download
```

### 5. Run

```bash
go run ./cmd/api/main.go
```

Server starts at `http://localhost:8080`.

## Project Structure

```
cmd/api/                    # Entry point, dependency injection
  main.go
internal/
├── config/
│   └── config.go           # Env-driven configuration
├── domain/                 # Models + repository/service interfaces
│   ├── user.go
│   ├── bill.go             # Bill, Item, Person (is_payer), Payment, SplitType
│   ├── share.go
│   ├── ocr_service.go      # OCRItem (name, price, quantity), OCRResult
│   ├── usage.go
│   └── errors.go
├── delivery/http/          # HTTP handlers + middleware
│   ├── middleware/
│   │   ├── auth.go         # JWT verification
│   │   ├── cors.go         # Configurable CORS
│   │   └── ratelimit.go    # IP-based rate limiter
│   ├── auth_handler.go     # Register, Login, Refresh, Logout
│   ├── bill_handler.go     # CRUD + OCR (public endpoint)
│   └── router.go           # Route registration
├── usecase/
│   ├── auth_usecase.go     # JWT gen, bcrypt, refresh token rotation
│   └── bill_usecase.go     # Bill CRUD, 4 split types, OCR, share, usage
└── repository/postgres/
    ├── connection.go       # pgxpool setup
    ├── user_repository.go
    ├── bill_repository.go
    ├── item_repository.go
    ├── assignment_repository.go
    ├── payment_repository.go
    ├── share_repository.go
    ├── usage_repository.go
    └── ocr_service.go      # PaddleOCR → OpenRouter → Gemini pipeline
migrations/                 # 012 migrations (idempotent via run_migrations.sh)
docs/                       # Specification, architecture, API, flows
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/register` | No | Create account |
| POST | `/api/v1/auth/login` | No | Login |
| POST | `/api/v1/auth/refresh` | No | Refresh tokens |
| POST | `/api/v1/auth/logout` | Yes | Invalidate refresh |
| GET | `/api/v1/users/me` | Yes | Profile + OCR usage |
| PUT | `/api/v1/users/me` | Yes | Update profile |
| POST | `/api/v1/bills` | Yes | Create bill |
| GET | `/api/v1/bills` | Yes | List bills (paginated, filterable) |
| GET | `/api/v1/bills/{id}` | Yes | Bill detail |
| PUT | `/api/v1/bills/{id}` | Yes | Update bill |
| DELETE | `/api/v1/bills/{id}` | Yes | Delete bill |
| POST | `/api/v1/bills/{id}/share` | Yes | Generate share link |
| GET | `/api/v1/shared/{token}` | No | View shared bill |
| POST | `/api/v1/ocr` | **No** (public) | OCR receipt (10 req/min IP limit) |
| GET | `/api/v1/payments/{billId}` | Yes | Payment summary |
| POST | `/api/v1/payments/{billId}/settle` | Yes | Mark payment paid |
| POST | `/api/v1/premium/subscribe` | Yes | Stripe checkout |
| POST | `/api/v1/premium/webhook` | No | Stripe events |

## OCR Pipeline

```
Receipt Image → PaddleOCR (text extraction) → OpenRouter Free (structured parsing)
  → Gemini Flash Free (fallback) → 500 error (all fail)
```

- **Public endpoint**: no auth required, IP rate limited (10 req/min)
- `OCRItem` returns `quantity` + `price` (unit price); frontend computes total
- No regex fallback, no paid AI, no monthly scan limit

## Development

```bash
go build ./...              # Compile check
go vet ./...                # Static analysis
go run ./cmd/api/main.go    # Run server
```

## Docker

```bash
docker build -t splitmate-backend .
docker run -p 8080:8080 splitmate-backend
```

## License

MIT
