-- Migration 013: Add missing fields for activity feed + tier limits

-- bills: status tracking (draft, pending, completed)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- bills: discount from OCR (display-only, never deducted from grand_total)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount DECIMAL(15,2) NOT NULL DEFAULT 0;

-- bills: service/tax mode (percent or fixed)
ALTER TABLE bills ADD COLUMN IF NOT EXISTS service_mode VARCHAR(10) NOT NULL DEFAULT 'percent';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tax_mode VARCHAR(10) NOT NULL DEFAULT 'percent';

-- bills: precomputed grand_total
ALTER TABLE bills ADD COLUMN IF NOT EXISTS grand_total DECIMAL(15,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_user_status ON bills(user_id, status);

-- items: quantity
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- persons: is_payer (may be missing if 004 ran on pre-existing table)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS is_payer BOOLEAN NOT NULL DEFAULT FALSE;

-- persons: bank transfer info (bank name, account number, QRIS data)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS payment_info JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_persons_is_payer ON persons(bill_id, is_payer);

-- tier_limits: DB-driven limits instead of env var
CREATE TABLE IF NOT EXISTS tier_limits (
    tier VARCHAR(20) PRIMARY KEY,
    monthly_bill_limit INTEGER NOT NULL,
    monthly_ocr_limit INTEGER NOT NULL
);

INSERT INTO tier_limits (tier, monthly_bill_limit, monthly_ocr_limit)
VALUES ('free', 50, 10), ('premium', -1, -1)
ON CONFLICT (tier) DO NOTHING;
