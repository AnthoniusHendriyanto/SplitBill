# Account isolation — October 2026

- Frontend logout clears account-specific drafts, bill lists, balances, pending save keys, errors, and loading state immediately.
- Session versions prevent requests and refresh responses from an earlier login/logout lifecycle from updating or retrying against a newer account. Store request generations discard stale list/balance responses.
- Backend authorization remains authoritative: only the creator mutates a bill; linked participant IDs grant read access. Names never grant access.
- `splitbill_frontend/src/components/BillDetailsModal.jsx` hides owner-only mutations for participants; this complements server checks.

## Database access surface (October 2026)

- The backend connects over the raw `pgx` pool using its own JWT authorization. It does **not** use the Supabase Data API, `auth.users`, or RLS policies.
- Migration `021` enables RLS on all 12 tables with zero policies and revokes table/sequence grants from `anon` and `authenticated`. Deny-all is intentional: there is no client-side or Data API access path to policy.
- Verified empirically against the hosted project: the anon key returns `permission denied for table users` on `SELECT` and `INSERT`. Do not add policies or re-grant to `anon`/`authenticated` without adding an equivalent authorization surface.
- Adopting Supabase Auth or exposing tables via `supabase-js` would require replacing this section — RLS policies would then become a live authorization boundary, not a deny-all lock.
