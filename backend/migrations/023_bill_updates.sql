ALTER TABLE bills ADD COLUMN IF NOT EXISTS update_request_key UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS update_request_hash TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS updated_response JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS bills_update_request_key ON bills(id, update_request_key);
