# Frontend reliability updates

- Dashboard balances come from the existing authenticated `/api/v1/debts` endpoint, independently of paginated bill history. Balance failures show an error and retry action.
- History preserves pagination and exposes Load more. Search explicitly filters loaded bills.
- Saved detail screens render recorded `share_amount` values, with payment-ID fallback for old finalized bills. Draft shares are not shown as final debts.
- Resuming drafts waits for successful loading and preserves split settings/assignments; saving creates a copy. Failed deletion remains visible.
- IDR is the only currency. Equal and By Item are free; percentage/custom require active premium.
- ErrorBoundary uses theme-aware text. Legacy white hover backgrounds/borders use semantic surface/border aliases after generated utilities. The unused AuthOverlay was removed; authentication remains in the routed login/register pages.
- Receipt controls use opaque theme surfaces and remain visible on keyboard focus; scan errors use the semantic error surface and alert role.
