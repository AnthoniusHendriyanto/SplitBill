-- Migrations/010_venue_intelligence.sql
-- Up Migration: Creates tables for tracking crowd-sourced establishment and menu item pricing data.

CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venue_menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    last_known_price NUMERIC(15, 2) NOT NULL,
    times_scanned INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venue_id, item_name)
);
