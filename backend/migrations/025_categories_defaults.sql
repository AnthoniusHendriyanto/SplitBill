ALTER TABLE bills ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

CREATE TABLE IF NOT EXISTS group_default_splits (
    group_id UUID PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
    split_type TEXT NOT NULL CHECK (split_type IN ('equal','shared_items','percentage','custom')),
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_default_splits ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON group_default_splits FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON group_default_splits FROM authenticated';
    END IF;
END $$;
