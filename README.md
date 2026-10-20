# SplitBill

Split the bill, keep the good times. A free OCR-first split engine with shared groups, public
bill links, receipt attachments, recurring bills, exports, and spending insights.

This repository is a monorepo. The React client and the Go API are versioned, reviewed, and
released together from a single `main` branch.

## Layout

```text
SplitBill/
├── frontend/   React 19 + Vite 8 + Zustand 5 + Tailwind 3.4 client
├── backend/    Go 1.26 + gorilla/mux + PostgreSQL API
└── .github/    CI for both projects
```

| Path | Contents |
|---|---|
| `frontend/README.md` | Client setup, flow, and current behaviour |
| `backend/README.md` | API setup, routes, and configuration |
| `backend/docs/API.md` | HTTP contract |
| `backend/DATABASE.md` | Schema, indexes, and migrations |
| `frontend/business-flow.md` | Split, share, and payment rules |
| `frontend/progress-trackers.md` | Frontend change log with verification |
| `backend/progress-trackers.md` | Backend change log with verification |
| `FEATURE-GAP-ANALYSIS.md` | Competitive analysis and delivery status |

## Prerequisites

- Node 22.12+ (Node 24 is what CI uses)
- Go 1.26+
- PostgreSQL 16

## Run locally

Start the API first, then the client.

```sh
# API on :8080
cd backend
go run ./cmd/api

# Client on :5173 (proxies /api to :8080)
cd frontend
npm ci
npm run dev
```

The client is served at <http://localhost:5173> and the API at <http://localhost:8080>. Copy
`backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env` to change
ports, database credentials, or the JWT secrets.

## Checks

```sh
cd frontend && npm run lint && npm test && npm run build
cd backend  && go vet ./... && gofmt -l . && go test ./... -count=1
```

PostgreSQL integration tests skip unless `TEST_DATABASE_URL` is set. Point it at a disposable
instance, never a production database. See `backend/CONTRIBUTING.md`.

CI runs both suites on every push and pull request against `main`.

## Product contract

- Currency is IDR only. Equal and By Item splits are free; Percentage and Custom require Premium.
- Custom amounts are final payable amounts, including service charge, tax, and discount.
- The backend is authoritative for saved totals. The client mirrors the same cent allocation.
- Only the bill owner can edit a finalized bill, and paid bills are locked.
- Groups use explicit member identities; names never establish cross-bill identity.
- Payment integrations and multi-currency are intentionally out of scope for now.

## Deployment notes

The client and API are separate deployable units inside one repository.

- A static host for the client should use `frontend` as its root directory and build with
  `npm run build`; `dist/` is the output. SPA routes such as `/bill/:id` need a rewrite to
  `index.html`.
- An API host should use `backend` as its root directory and build with `go build ./cmd/api`.
- Serve the client and API from the same origin, or forward `/api` to the API host, so the
  refresh cookie stays same-origin.
