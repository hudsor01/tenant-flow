-- Migration: Add version column to property table for optimistic locking
-- Date: 2025-11-03
-- Description: Adds version column with default value 1 and trigger to auto-increment on updates

-- Add version column to property table
ALTER TABLE public.property
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create function to increment version on update
CREATE OR REPLACE FUNCTION increment_property_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment version before updates
DROP TRIGGER IF EXISTS property_version_trigger ON public.property;
CREATE TRIGGER property_version_trigger
  BEFORE UPDATE ON public.property
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_version();

-- Add comment for documentation
COMMENT ON COLUMN public.property.version IS 'Optimistic locking version counter - auto-increments on each update to prevent race conditions';
