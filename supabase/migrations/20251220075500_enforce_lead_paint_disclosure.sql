-- Migration: Enforce lead paint disclosure at database level
-- Federal law (24 CFR Part 35) requires lead paint disclosure for properties built before 1978.
-- This migration adds a CHECK constraint to prevent lease creation without disclosure acknowledgment.
--
-- Related columns:
-- - property_built_before_1978: boolean indicating if property was built before 1978
-- - lead_paint_disclosure_acknowledged: boolean indicating if tenant acknowledged disclosure
--
-- Business Rule:
-- If property_built_before_1978 = true, then lead_paint_disclosure_acknowledged MUST be true.
-- This prevents API bypass and ensures federal compliance at the database layer.

-- Add CHECK constraint to enforce lead paint disclosure requirement
ALTER TABLE public.leases
ADD CONSTRAINT chk_lead_paint_disclosure_required
CHECK (
  -- If property was NOT built before 1978, no restriction
  property_built_before_1978 = false
  OR
  -- If property WAS built before 1978, disclosure MUST be acknowledged
  (property_built_before_1978 = true AND lead_paint_disclosure_acknowledged = true)
);

-- Add constraint comment for documentation
COMMENT ON CONSTRAINT chk_lead_paint_disclosure_required ON public.leases IS
'Federal law (24 CFR Part 35) requires lead paint disclosure for residential properties built before 1978.
This constraint ensures compliance at the database level, preventing bypass via API or direct database access.
If property_built_before_1978 = true, then lead_paint_disclosure_acknowledged must also be true.';

-- Verify constraint works correctly
-- Test 1: Should succeed (property built after 1978, no disclosure needed)
-- Test 2: Should succeed (property built before 1978, disclosure acknowledged)
-- Test 3: Should FAIL (property built before 1978, disclosure NOT acknowledged)
