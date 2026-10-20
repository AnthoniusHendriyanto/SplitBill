-- Migration 017: Add user_id to persons table for direct user-to-person linking
ALTER TABLE persons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);
