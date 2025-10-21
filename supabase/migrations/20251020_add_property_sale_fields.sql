-- Migration: Add property sale tracking fields for 7-year retention compliance
-- Date: 2025-10-20
-- Purpose: Track when properties are sold and for what price (required for 7-year record retention)

-- Add sale tracking columns to property table
ALTER TABLE property
ADD COLUMN IF NOT EXISTS date_sold TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS sale_notes TEXT;

-- Add check constraint: if status is SOLD, date_sold and sale_price must be set
ALTER TABLE property
ADD CONSTRAINT property_sold_fields_required
CHECK (
  (status = 'SOLD' AND date_sold IS NOT NULL AND sale_price IS NOT NULL)
  OR status != 'SOLD'
);

-- Add index for querying sold properties (for compliance audits)
CREATE INDEX IF NOT EXISTS idx_property_date_sold
ON property(date_sold)
WHERE status = 'SOLD';

-- Comment for documentation
COMMENT ON COLUMN property.date_sold IS 'Date property was sold (required for 7-year record retention)';
COMMENT ON COLUMN property.sale_price IS 'Final sale price in USD';
COMMENT ON COLUMN property.sale_notes IS 'Additional notes about the sale';

-- Update RLS policies to allow property owners to update sale fields
-- (existing policies should already cover this, but verifying)
