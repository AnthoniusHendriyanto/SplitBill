# Current bill contract

- `splitbill_backend/internal/domain/shares.go` is authoritative for final shares. Equal and By Item are free; percentage and custom require an unexpired premium tier.
- Custom amounts are final payable amounts. Subtotal plus service and tax minus discount is rounded to cents; other splits allocate those cents using largest fractional remainders, with participant input order breaking ties.
- `splitbill_frontend/src/utils/shares.js` mirrors this contract. OCR totals are reference observations; edited item totals drive previews and saves.
- A retry of the same save payload uses the same UUID `request_key`. A changed payload uses a fresh key. Resuming a saved draft creates a copy and preserves the original for explicit deletion.
- Linked participants carry `user_id`; typed names alone never link accounts.
- Currency is IDR only. Cent precision matches the current backend; display preferences do not change debts.
- Bills may optionally attach to an explicit group. Group balances use explicit `group_member_id` to `person_id` mappings; names never establish cross-bill identity.
- Finalized bills can produce a time-limited, read-only share URL. The public projection contains bill items and saved shares but no account/contact identifiers or mutation actions.
- Receipt images are resized before save and retained with the bill for authorized viewing; old bills without an image remain valid.
- Owners may edit finalized bill metadata and line items; the backend recalculates saved shares atomically and requires a fresh update request key for each intentional edit.
- Recurring definitions generate ordinary pending bills through the existing allocator. Occurrence claims are idempotent, and definitions can be paused/resumed/cancelled. A definition carries a UUID `request_key` inside its bill-shaped template because creation reuses the bill validator; that key is cleared before occurrence generation.
- Primary mobile navigation is Home, Split, Groups, History, and More. Recurring, Import, Settings, Help, theme, and sign-out are secondary destinations inside More; desktop groups Recurring and Import under Tools.
- Saved bill details keep share/export secondary, separate destructive actions, and print a document-only view without app navigation or mutation controls.
