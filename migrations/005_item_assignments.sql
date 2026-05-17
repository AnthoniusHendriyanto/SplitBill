-- Migration 005: Item assignments table
CREATE TABLE IF NOT EXISTS item_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, person_id)
);

CREATE INDEX idx_assignments_item_id ON item_assignments(item_id);
CREATE INDEX idx_assignments_person_id ON item_assignments(person_id);