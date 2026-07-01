CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_email VARCHAR(255) NOT NULL,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_from_user ON invitations(from_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_to_email ON invitations(to_email);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS connected_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE persons ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
