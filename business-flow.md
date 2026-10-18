# Current bill contract

- `splitbill_backend/internal/domain/shares.go` is authoritative for final shares. Equal and By Item are free; percentage and custom require an unexpired premium tier.
- Custom amounts are final payable amounts. Subtotal plus service and tax minus discount is rounded to cents; other splits allocate those cents using largest fractional remainders, with participant input order breaking ties.
- `splitbill_frontend/src/utils/shares.js` mirrors this contract. OCR totals are reference observations; edited item totals drive previews and saves.
- A retry of the same save payload uses the same UUID `request_key`. A changed payload uses a fresh key. Resuming a saved draft creates a copy and preserves the original for explicit deletion.
- Linked participants carry `user_id`; typed names alone never link accounts.
- Currency is IDR only. Cent precision matches the current backend; display preferences do not change debts.
