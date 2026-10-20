ALTER TABLE bills ADD COLUMN IF NOT EXISTS request_key UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS request_hash TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS saved_response JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS bills_request_key ON bills(user_id, request_key);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS custom_amount NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE persons ADD COLUMN IF NOT EXISTS share_amount NUMERIC(15,2);
CREATE TABLE IF NOT EXISTS notifications (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
 amount NUMERIC(15,2) NOT NULL CHECK(amount >= 0),
 read_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 email_status TEXT NOT NULL DEFAULT 'queued' CHECK(email_status IN ('queued','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_error TEXT NOT NULL DEFAULT '',
 UNIQUE(bill_id,user_id)
);
CREATE INDEX IF NOT EXISTS notifications_inbox ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_delivery ON notifications(next_attempt_at) WHERE email_status IN ('queued','sending');
