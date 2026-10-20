-- Migration 018: Add CHECK constraints and missing indexes
-- N1: CHECK constraints on split_type, status, service_mode, tax_mode
ALTER TABLE bills DROP CONSTRAINT IF EXISTS chk_split_type;
ALTER TABLE bills ADD CONSTRAINT chk_split_type CHECK (split_type IN ('equal', 'custom', 'percentage', 'shared_items'));

ALTER TABLE bills DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE bills ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'completed', 'draft'));

ALTER TABLE bills DROP CONSTRAINT IF EXISTS chk_service_mode;
ALTER TABLE bills ADD CONSTRAINT chk_service_mode CHECK (service_mode IN ('percent', 'amount'));

ALTER TABLE bills DROP CONSTRAINT IF EXISTS chk_tax_mode;
ALTER TABLE bills ADD CONSTRAINT chk_tax_mode CHECK (tax_mode IN ('percent', 'amount'));

-- N2: Index on payments.from_person_id and payments.to_person_id
CREATE INDEX IF NOT EXISTS idx_payments_from_person_id ON payments(from_person_id);
CREATE INDEX IF NOT EXISTS idx_payments_to_person_id ON payments(to_person_id);
