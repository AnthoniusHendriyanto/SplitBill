-- Migration 014: Add bill_date for user-settable bill date
ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_date DATE DEFAULT CURRENT_DATE;
