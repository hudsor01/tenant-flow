-- Migration: Fix search_path for validate_lease_unit_requirement function
-- Date: 2025-10-28
-- Description: Set search_path to prevent SQL injection vulnerability
-- Reference: Supabase Security Advisor - Function Search Path Mutable
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Drop and recreate function with explicit search_path
DROP FUNCTION IF EXISTS validate_lease_unit_requirement() CASCADE;

CREATE OR REPLACE FUNCTION validate_lease_unit_requirement()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Recreate trigger (CASCADE dropped it)
DROP TRIGGER IF EXISTS validate_lease_unit_requirement_trigger ON lease;
CREATE TRIGGER validate_lease_unit_requirement_trigger
  BEFORE INSERT OR UPDATE ON lease
  FOR EACH ROW
  EXECUTE FUNCTION validate_lease_unit_requirement();

-- Verify search_path is set
-- Run manually to verify:
-- SELECT 
--   p.proname as function_name,
--   pg_get_functiondef(p.oid) as definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname = 'validate_lease_unit_requirement';
