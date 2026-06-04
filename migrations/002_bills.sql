-- Migration 002: Bills table
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    service_charge DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax DECIMAL(15,2) NOT NULL DEFAULT 0,
    split_type VARCHAR(50) NOT NULL DEFAULT 'equal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bills_user_id ON bills(user_id);
CREATE INDEX idx_bills_created_at ON bills(created_at);