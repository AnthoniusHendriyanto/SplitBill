CREATE TABLE IF NOT EXISTS recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cadence TEXT NOT NULL CHECK (cadence IN ('weekly','monthly','yearly')),
    interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count BETWEEN 1 AND 12),
    next_run DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
    template JSONB NOT NULL,
    last_generated_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurrence_occurrences (
    recurrence_id UUID NOT NULL REFERENCES recurrences(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (recurrence_id, run_date)
);

CREATE INDEX IF NOT EXISTS recurrences_due ON recurrences(status, next_run);
ALTER TABLE recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_occurrences ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON recurrences, recurrence_occurrences FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON recurrences, recurrence_occurrences FROM authenticated';
    END IF;
END $$;
