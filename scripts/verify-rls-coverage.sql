-- RLS Coverage Verification Script
-- Purpose: Ensure all tables with RLS enabled have appropriate policies
-- Usage: psql $DIRECT_URL -f scripts/verify-rls-coverage.sql
-- Exit code: 0 if all checks pass, 1 if any failures

-- ============================================================================
-- 1. Check for tables with RLS enabled but NO policies (CRITICAL SECURITY GAP)
-- ============================================================================

DO $$
DECLARE
  uncovered_tables TEXT[];
  table_name TEXT;
BEGIN
  -- Find tables with RLS enabled but zero policies
  SELECT ARRAY_AGG(t.tablename)
  INTO uncovered_tables
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true  -- RLS is enabled
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
    );

  -- If any uncovered tables exist, raise error
  IF uncovered_tables IS NOT NULL THEN
    RAISE WARNING 'SECURITY ALERT: Tables with RLS enabled but NO policies found:';
    FOREACH table_name IN ARRAY uncovered_tables
    LOOP
      RAISE WARNING '  - %', table_name;
    END LOOP;
    RAISE EXCEPTION 'RLS coverage check FAILED: % table(s) lack policies', array_length(uncovered_tables, 1);
  ELSE
    RAISE NOTICE '✓ All tables with RLS have at least one policy';
  END IF;
END $$;

-- ============================================================================
-- 2. Verify critical tables have RLS enabled
-- ============================================================================

DO $$
DECLARE
  critical_tables TEXT[] := ARRAY[
    'users',
    'property',
    'unit',
    'lease',
    'maintenance_request',
    'rent_payment',
    'tenant_payment_method',
    'documents',
    'notifications'
  ];
  table_name TEXT;
  rls_enabled BOOLEAN;
  missing_rls_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  RAISE NOTICE 'Checking RLS status for critical tables...';

  FOREACH table_name IN ARRAY critical_tables
  LOOP
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = table_name;

    IF rls_enabled IS NULL THEN
      missing_rls_tables := array_append(
        missing_rls_tables,
        format('%s (table does not exist)', table_name)
      );
      RAISE WARNING '  ⚠ Table "%" does not exist', table_name;
    ELSIF rls_enabled = false THEN
      missing_rls_tables := array_append(
        missing_rls_tables,
        format('%s (RLS disabled)', table_name)
      );
      RAISE WARNING '  ✗ Table "%" has RLS DISABLED', table_name;
    ELSE
      RAISE NOTICE '  ✓ Table "%" has RLS enabled', table_name;
    END IF;
  END LOOP;

  -- Fail if any critical tables are missing or have RLS disabled
  IF array_length(missing_rls_tables, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'RLS coverage check FAILED: % table(s) missing or have RLS disabled: %',
      array_length(missing_rls_tables, 1),
      array_to_string(missing_rls_tables, ', ');
  END IF;
END $$;

-- ============================================================================
-- 3. Count policies per critical table
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Policy counts by table:';
  RAISE NOTICE '─────────────────────────────────────';
END $$;

SELECT
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'property', 'unit', 'lease', 'maintenance_request',
    'rent_payment', 'tenant_payment_method', 'documents', 'notifications'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 4. Verify payment table policies (CRITICAL for PCI compliance)
-- ============================================================================

DO $$
DECLARE
  rent_payment_policies TEXT[];
  payment_method_policies TEXT[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Verifying payment table policies (PCI compliance)...';

  -- Check rent_payment policies
  SELECT ARRAY_AGG(policyname)
  INTO rent_payment_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'rent_payment';

  IF rent_payment_policies IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: rent_payment table has NO RLS policies (financial data exposed!)';
  ELSIF NOT 'rent_payment_owner_or_tenant_select' = ANY(rent_payment_policies) THEN
    RAISE WARNING '  ⚠ Missing SELECT policy for rent_payment';
  ELSE
    RAISE NOTICE '  ✓ rent_payment has proper policies: %', rent_payment_policies;
  END IF;

  -- Check tenant_payment_method policies
  SELECT ARRAY_AGG(policyname)
  INTO payment_method_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'tenant_payment_method';

  IF payment_method_policies IS NULL THEN
    RAISE EXCEPTION 'CRITICAL: tenant_payment_method table has NO RLS policies (PCI violation!)';
  ELSIF NOT 'tenant_payment_method_owner_select' = ANY(payment_method_policies) THEN
    RAISE WARNING '  ⚠ Missing SELECT policy for tenant_payment_method';
  ELSE
    RAISE NOTICE '  ✓ tenant_payment_method has proper policies: %', payment_method_policies;
  END IF;
END $$;

-- ============================================================================
-- 5. Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS VERIFICATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'All checks passed. RLS policies are properly configured.';
  RAISE NOTICE '';
END $$;
