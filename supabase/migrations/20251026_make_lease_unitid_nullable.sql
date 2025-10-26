-- Migration: Make unitId nullable in lease table for single-family properties
-- Created: 2025-10-26
-- Purpose: Allow leases without specific unit assignments for single-family homes, condos, townhouses

-- ROLLBACK PROCEDURE (if needed):
-- 1. Check for leases with NULL unitId:
--    SELECT COUNT(*) FROM lease WHERE "unitId" IS NULL;
-- 2. If count > 0, assign units or delete those leases first
-- 3. Then rollback with:
--    DROP TRIGGER IF EXISTS validate_lease_unit_requirement_trigger ON lease;
--    DROP FUNCTION IF EXISTS validate_lease_unit_requirement();
--    DROP INDEX IF EXISTS idx_lease_property_null_unit;
--    ALTER TABLE lease ALTER COLUMN "unitId" SET NOT NULL;

-- Make unitId nullable
ALTER TABLE lease 
ALTER COLUMN "unitId" DROP NOT NULL;

-- Add comment explaining the nullable field
COMMENT ON COLUMN lease."unitId" IS 'Optional unit ID - can be NULL for single-family properties without specific unit designations';

-- Add check to ensure either unitId is provided OR property is single-family type
-- This ensures data integrity while allowing flexibility
CREATE OR REPLACE FUNCTION validate_lease_unit_requirement()
RETURNS TRIGGER AS $$
BEGIN
  -- If unitId is NULL, verify the property type allows it
  IF NEW."unitId" IS NULL THEN
    -- Check if property is of type that doesn't require units
    IF NOT EXISTS (
      SELECT 1 FROM property 
      WHERE id = NEW."propertyId" 
      AND "propertyType" IN ('SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE')
    ) THEN
      RAISE EXCEPTION 'unitId is required for multi-unit properties';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate unit requirement
DROP TRIGGER IF EXISTS validate_lease_unit_requirement_trigger ON lease;
CREATE TRIGGER validate_lease_unit_requirement_trigger
  BEFORE INSERT OR UPDATE ON lease
  FOR EACH ROW
  EXECUTE FUNCTION validate_lease_unit_requirement();

-- Performance: Index for queries on single-family properties without units
-- Common query pattern: "find all leases for this single-family property"
CREATE INDEX IF NOT EXISTS idx_lease_property_null_unit 
ON lease("propertyId") 
WHERE "unitId" IS NULL;

COMMENT ON INDEX idx_lease_property_null_unit IS 
'Optimizes queries for leases without units (single-family properties, condos, townhouses)';
