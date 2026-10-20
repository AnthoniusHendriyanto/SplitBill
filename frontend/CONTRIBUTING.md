# Contributing — frontend

## Checks

```sh
npm run lint
npm test
npm run build
```

CI runs all three on every push and pull request to `main`.

## Cross-repo contract

Paths below are relative to the repository root. Allocation cases are deliberately duplicated between
`frontend/src/test/bills.test.js` and
`backend/internal/domain/shares_test.go`. The frontend mirrors the backend's
final-cent rules so the wizard preview matches what is actually persisted. **If you change one,
change both** — a divergence here means the amount a user sees differs from the amount charged.

See `backend/CONTRIBUTING.md` for the database connection and test-database notes.