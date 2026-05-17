-- Migration 006: Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    from_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    to_person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_bill_id ON payments(bill_id);