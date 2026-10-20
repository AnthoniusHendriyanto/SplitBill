-- Migration 011: Add split_type to bills
ALTER TABLE bills ADD COLUMN IF NOT EXISTS split_type VARCHAR(50) NOT NULL DEFAULT 'equal';
