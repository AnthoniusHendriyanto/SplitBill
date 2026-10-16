# SplitMate API

Development base: `http://localhost:8080/api/v1`. Production origin is deployment-specific.
Protected routes require `Authorization: Bearer <access_token>`.
Successful responses wrap payloads in `{ "success": true, "data": ... }`; errors use
`{ "success": false, "message": "...", "error": { "code": "..." } }`. HTTP 204 has no body.

## Routes

| Method | Path | Behavior |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Public; sets httpOnly refresh cookie and returns access token |
| POST | `/auth/refresh`, `/auth/logout` | Public routing; consumes refresh cookie |
| GET, PUT | `/users/me` | Profile |
| POST | `/ocr` | Public multipart `image` or `receipt`; 10/min/IP, 10MB limit |
| POST | `/bills` | Atomic create/finalize, request-key deduplication |
| GET | `/bills` | Creator/linked participant bills; page/limit/from_date/to_date |
| GET | `/bills/{id}` | Creator/linked participant detail |
| DELETE | `/bills/{id}` | Creator only |
| PATCH | `/bills/{id}/payments/{personId}` | Creator marks that person's payments paid |
| PATCH | `/bills/{id}/status` | Existing route; only no-op status changes allowed; use settlement |
| GET, POST | `/contacts` | List contacts / create plain-name contact |
| DELETE | `/contacts/{id}` | Delete own contact |
| GET, POST | `/invitations` | List/send explicit friend invitations |
| POST | `/invitations/{id}/accept`, `/invitations/{id}/reject` | Intended recipient only |
| GET | `/notifications?page=1` | Own notifications, 20 per page, newest first |
| PATCH | `/notifications/{id}/read` | Mark own notification read; no payment change |
| GET | `/debts` | Own unpaid payment rows with actual counterpart and direction |
| GET | `/usage` | Monthly bill-creation count and tier limit |
| POST | `/premium/subscribe` | Manual bank-transfer instructions |
| POST | `/premium/callback` | JWT plus `X-Callback-Secret` required |
| PUT | `/bills/{id}` | 501 stub |
| POST | `/bills/{id}/share` | 501 stub |
| GET | `/shared/{token}` | Protected 501 stub, not public sharing |

`GET /health` is outside `/api/v1`. There are no `/payments/:id` or Stripe webhook routes.

## Create bill

```json
{
  "request_key": "eb86ea2c-b279-43d3-9b72-03a0b16ec15c",
  "title": "Dinner", "merchant": "Cafe", "bill_date": "2026-10-16",
  "items": [{ "id": "item-1", "name": "Dinner", "price": 100000, "quantity": 1 }],
  "persons": [
    { "id": "person-1", "name": "Alex", "is_payer": true },
    { "id": "person-2", "name": "Sam", "is_payer": false }
  ],
  "split_type": "equal", "assignments": [],
  "service_charge": 0, "service_mode": "amount", "tax": 0, "tax_mode": "amount",
  "discount": 10000, "status": "pending"
}
```

Person `user_id` is optional: it must be the authenticated user or an existing connected contact.
Backend resolves that account's name/email; plain-name rows remain unlinked. Exactly one payer,
at least two people, and at least one item are required. Client item/person IDs are remapped on save;
assignment references must belong to the same request.

`custom_amount` is each person's final share for Custom, including fees/discount. Its sum must equal
the payable total. Percentage requires `percentage` summing to 100. By Item uses
`assignments: [{ "item_id": "...", "person_id": "..." }]`; items without explicit assignments
are shared among everyone. Frontend requires explicit selections before continuing By Item.

Retry the same `request_key` and same payload after timeout. Changing the payload under that key
is rejected. Start a new key for a deliberately new bill. Draft resumption currently copies into a new
bill; the original draft is retained and can be deleted explicitly after a successful save.

The result includes persisted `persons[].share_amount` and payments. Detail also includes
`items[].assigned_person_ids`; display names are not identity keys. Notifications trigger only for
non-self linked recipients with positive shares, after successful finalization.

Notification rows include `id`, `bill_id`, `actor`, `title`, `amount`, `read_at`, `created_at`,
and `email_status`. Debt rows include `bill_id`, `title`, `person_id`, optional `user_id`, `name`,
`direction` (`payable`/`receivable`), and `amount`. Rows remain bill-scoped; no automatic debt netting.
