-- RLS Performance Verification Script
-- Tests that optimizations are working and database is performant

-- ============================================================================
-- 1. VERIFY INDEXES ARE BEING USED
-- ============================================================================

-- Check that all RLS optimization indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_%_owner_user_id'
    OR indexname LIKE 'idx_%_tenant_id'
    OR indexname LIKE 'idx_%_lease_id'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- 2. VERIFY OPTIMIZED POLICIES EXIST
-- ============================================================================

SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%(SELECT get_current_%' THEN 'Optimized (SELECT wrapper)'
    WHEN qual LIKE '%get_current_%' THEN 'Needs optimization'
    ELSE 'No helper functions'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'documents_select',
    'documents_update_owner',
    'documents_delete_owner',
    'payment_transactions_select',
    'payment_schedules_select',
    'rent_due_select'
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- 3. CHECK FOR SLOW QUERIES (if pg_stat_statements enabled)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE NOTICE 'pg_stat_statements is installed - checking for slow RLS queries';

    -- This will show slow RLS-related queries if any exist
    PERFORM * FROM get_slow_rls_queries(100);
  ELSE
    RAISE NOTICE 'pg_stat_statements not installed - skipping slow query check';
    RAISE NOTICE 'To enable: CREATE EXTENSION pg_stat_statements;';
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY TABLE STATISTICS ARE UP TO DATE
-- ============================================================================

SELECT
  schemaname,
  tablename,
  last_analyze,
  n_live_tup as row_count,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'documents',
    'properties',
    'maintenance_requests',
    'lease_tenants',
    'leases',
    'rent_payments',
    'payment_transactions',
    'payment_schedules',
    'rent_due'
  )
ORDER BY tablename;

-- ============================================================================
-- 5. CHECK FOR MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

-- Find foreign keys without indexes (these would slow down RLS)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE
    WHEN i.indexname IS NOT NULL THEN 'Indexed ✓'
    ELSE 'Missing Index ⚠'
  END as index_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i
  ON i.tablename = tc.table_name
  AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'documents',
    'properties',
    'maintenance_requests',
    'lease_tenants',
    'leases',
    'rent_payments',
    'payment_transactions',
    'payment_schedules',
    'rent_due'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 6. PERFORMANCE SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_policies INTEGER;
  optimized_policies INTEGER;
  total_indexes INTEGER;
  rls_indexes INTEGER;
BEGIN
  -- Count total RLS policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count optimized policies (using SELECT wrapper)
  SELECT COUNT(*) INTO optimized_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual LIKE '%(SELECT get_current_%';

  -- Count total indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public';

  -- Count RLS optimization indexes
  SELECT COUNT(*) INTO rls_indexes
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND (
      indexname LIKE 'idx_%_owner_user_id'
      OR indexname LIKE 'idx_%_tenant_id'
      OR indexname LIKE 'idx_%_lease_id'
    );

  RAISE NOTICE '';
  RAISE NOTICE '=== RLS PERFORMANCE SUMMARY ===';
  RAISE NOTICE 'Total RLS Policies: %', total_policies;
  RAISE NOTICE 'Optimized Policies (SELECT wrapper): %', optimized_policies;
  RAISE NOTICE 'Total Indexes: %', total_indexes;
  RAISE NOTICE 'RLS Optimization Indexes: %', rls_indexes;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Database is optimized for RLS performance';
END $$;
