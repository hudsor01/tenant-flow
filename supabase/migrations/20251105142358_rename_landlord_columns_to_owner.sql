-- Rename owner columns to owner columns across all tables
-- This migration renames all columns that contain "owner" to use "owner" instead

-- Rename columns in rent_payment table
ALTER TABLE rent_payment RENAME COLUMN ownerId TO ownerId;
ALTER TABLE rent_payment RENAME COLUMN ownerReceives TO ownerReceives;

-- Rename columns in rent_subscription table
ALTER TABLE rent_subscription RENAME COLUMN ownerId TO ownerId;

-- Note: RLS policies and indexes will need to be updated separately
-- to reference the new column names. This migration only renames the columns.