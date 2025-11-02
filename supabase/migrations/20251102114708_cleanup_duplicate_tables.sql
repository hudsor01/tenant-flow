-- Drop unused duplicate tables identified via database analysis
-- Evidence: pg_stat_user_tables shows 0 inserts/updates/deletes for all 4 tables
-- Code search confirms:
--   - 'document' (singular): Used in type exports, matches camelCase conventions
--   - 'documents' (plural): Unused, different schema (snake_case, entity pattern)
--   - 'rent_payment' (singular): 19 active code references, type exports
--   - 'rent_payments' (plural): Unused, commented out in old code

-- 1. Drop documents table (plural - unused alternative schema)
-- This table uses different design (entity pattern, snake_case, versioning)
-- The singular 'document' table is the active schema
DROP TABLE IF EXISTS documents CASCADE;

-- 2. Drop rent_payments table (plural - unused)
-- This table has different schema (organizationId, rentDueId, netAmount)
-- All 19 code references use 'rent_payment' (singular)
DROP TABLE IF EXISTS rent_payments CASCADE;

-- Verify cleanup
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%document%' OR tablename LIKE '%payment%')
ORDER BY tablename;

-- Expected result: Only 'document' and 'rent_payment' should remain
