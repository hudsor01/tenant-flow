-- This migration was originally intended to rename "landlord" columns to "owner" columns
-- However, the columns in rent_payment and rent_subscription tables already use "ownerId" naming
-- Therefore, no actual column renames are needed
-- 
-- Tables already using correct naming:
-- - rent_payment: ownerId, ownerReceives
-- - rent_subscription: ownerId
--
-- This migration file is kept for version continuity but performs no operations

-- No-op migration (all columns already use "owner" naming convention)
SELECT 1;