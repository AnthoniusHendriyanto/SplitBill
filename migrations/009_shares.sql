-- Migration 009: Shares table (for shareable links without login)
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    share_token VARCHAR(64) NOT NULL UNIQUE,
    view_token VARCHAR(64),
    allow_edit BOOLEAN NOT NULL DEFAULT FALSE,
    max_views INTEGER DEFAULT NULL,
    current_views INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shares_bill_id ON shares(bill_id);
CREATE INDEX idx_shares_share_token ON shares(share_token);
CREATE INDEX idx_shares_expires_at ON shares(expires_at) WHERE expires_at IS NOT NULL;