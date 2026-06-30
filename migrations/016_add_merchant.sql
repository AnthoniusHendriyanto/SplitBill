-- Migration 016: Add merchant column to bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS merchant VARCHAR(255) NOT NULL DEFAULT '';
