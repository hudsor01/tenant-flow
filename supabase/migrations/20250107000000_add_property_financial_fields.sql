-- Migration: Add optional financial tracking fields to property table
-- These fields are OPTIONAL and used for basic cash flow/balance sheet calculations
-- Users can choose to populate them for more accurate financial reporting

-- Add optional financial columns to property table
ALTER TABLE property
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_property_tax NUMERIC,
  ADD COLUMN IF NOT EXISTS annual_insurance NUMERIC,
  ADD COLUMN IF NOT EXISTS mortgage_monthly_payment NUMERIC;

-- Add helpful comments to columns
COMMENT ON COLUMN property.purchase_price IS 'Optional: Original purchase price of the property';
COMMENT ON COLUMN property.current_value IS 'Optional: Current estimated market value of the property';
COMMENT ON COLUMN property.annual_property_tax IS 'Optional: Annual property tax amount';
COMMENT ON COLUMN property.annual_insurance IS 'Optional: Annual insurance premium';
COMMENT ON COLUMN property.mortgage_monthly_payment IS 'Optional: Monthly mortgage payment (principal + interest)';

-- Create index for financial queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_property_owner_id ON property(ownerId);

-- Note: These fields are intentionally nullable to support progressive enhancement
-- Cash flow and balance sheet calculations will work with or without these values
