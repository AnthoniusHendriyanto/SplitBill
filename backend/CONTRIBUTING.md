# Contributing — backend

## Checks

```sh
go vet ./...
gofmt -l .
go test ./... -count=1
```

CI runs vet, a `gofmt` gate, and the test suite on every push and pull request to `main`.

### Integration tests need a disposable database

PostgreSQL integration tests create isolated schemas and apply all migrations, and they
inject failures by renaming tables. `TEST_DATABASE_URL` **must** point at a disposable instance:

```sh
TEST_DATABASE_URL='postgres://.../disposable_test_database' go test ./... -count=1
```

Unsetting it skips the database tests, which does **not** verify the queries. Against a database
that already has real tables in `public`, unqualified names fall through to `public`, the injected
failure never fires, and the run reads production rows. CI therefore runs unit and HTTP contract
tests only; run the database suite locally before touching query code.

## Database connection

`DATABASE_URL` overrides the discrete `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASS`/`DB_NAME`/`DB_SSLMODE`
fields when set; the `DB_*` fields still work for local development. Managed hosts (Supabase) need
the full URI because their pooler password and `sslmode=require` do not survive being assembled
from parts.

Use the **session pooler** (port 5432), not the transaction pooler (6543) — the repository layer
holds transactions across multiple statements. Hosted projects also cap total connections, so set
`DB_MAX_CONNS=5` / `DB_MIN_CONNS=1` for a single backend instance.

## Cross-repo contract

Paths below are relative to the repository root. Allocation cases are deliberately duplicated between
`backend/internal/domain/shares_test.go` and
`frontend/src/test/bills.test.js`. **If you change one, change both.**

See `frontend/CONTRIBUTING.md` for the frontend checks.