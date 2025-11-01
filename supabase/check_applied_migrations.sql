-- ============================================================================
-- Query: Check Which Duplicate Migrations Were Actually Applied
-- ============================================================================
-- This query identifies which of the duplicate timestamp migrations were
-- actually applied to the production database.
--
-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- ============================================================================

-- Check all October 24, 2025 migrations (where duplicates exist)
SELECT
    version,
    name,
    executed_at
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20251024%'
ORDER BY version, executed_at;

-- Specifically check the 3 duplicate pairs:
-- Group 1: 20251024000005
SELECT
    version,
    name,
    executed_at,
    CASE
        WHEN name LIKE '%fix_rls_performance_issues%' THEN '❌ OLDER VERSION (Oct 27, 11KB)'
        WHEN name LIKE '%optimize_rls_policies_performance%' THEN '✅ NEWER VERSION (Oct 31, 9KB)'
        ELSE 'UNKNOWN'
    END as migration_file
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20251024000005%'
ORDER BY executed_at;

-- Group 2: 20251024000006
SELECT
    version,
    name,
    executed_at,
    CASE
        WHEN name LIKE '%fix_remaining_rls%' THEN 'fix_remaining_rls_performance_issues.sql'
        WHEN name LIKE '%fix_rls_auth_uid%' THEN 'fix_rls_auth_uid_performance.sql'
        ELSE 'UNKNOWN'
    END as migration_file
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20251024000006%'
ORDER BY executed_at;

-- Group 3: 20251024000007
SELECT
    version,
    name,
    executed_at,
    CASE
        WHEN name LIKE '%fix_profiles_rls%' THEN 'fix_profiles_rls_performance.sql'
        WHEN name LIKE '%fix_service_role_duplicate%' THEN 'fix_service_role_duplicate_policies.sql'
        ELSE 'UNKNOWN'
    END as migration_file
FROM supabase_migrations.schema_migrations
WHERE version LIKE '20251024000007%'
ORDER BY executed_at;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Each query should return 0 or 1 row.
-- - 0 rows = Neither duplicate was applied (safe to delete both or keep one)
-- - 1 row = One was applied (archive the other)
-- - 2 rows = PROBLEM - both were applied somehow (investigation needed)
--
-- NEXT STEPS BASED ON RESULTS:
-- ============================================================================
-- After running this, update the file: check_applied_migrations_results.txt
-- with the output, then run: bash archive_duplicate_migrations.sh
-- ============================================================================
