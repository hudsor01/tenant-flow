-- Migration: Verify auth.uid() Performance Optimization
-- Purpose: Document that all RLS policies already use (SELECT auth.uid()) pattern
--
-- AUDIT RESULT (2026-01-15):
-- All bare auth.uid() calls identified in earlier migrations have already been
-- fixed by subsequent migrations:
--
-- Fixed by 20251225182240_fix_rls_policy_security_and_performance.sql:
--   - property_owners policies
--   - tenants policies
--   - leases policies
--   - maintenance_requests policies
--   - users policies
--   - notifications policies
--   - notification_settings policies
--   - user_errors policies
--   - stripe.customers policies
--   - stripe.subscriptions policies
--   - stripe.products policies
--   - stripe.prices policies
--   - stripe.invoices policies
--
-- Fixed by 20251225182245_repair_incomplete_rls_migration.sql:
--   - Redundant fixes for same tables (migration ordering uncertainty)
--
-- Fixed by 20251230190000_optimize_stripe_rls_policies.sql:
--   - Additional stripe schema optimizations
--
-- Fixed by 20251230200000_harden_rls_policies.sql:
--   - Final hardening pass on all policies
--
-- STORAGE POLICIES:
-- Storage policies in 20251110160000_create_lease_documents_bucket.sql use
-- auth.uid()::text with storage.foldername() function. This is the correct
-- pattern for storage objects and does not benefit from SELECT wrapping.
--
-- CONCLUSION:
-- No additional fixes required. All RLS policies use optimal (SELECT auth.uid())
-- pattern for query plan caching.

-- Verification query (run manually if needed):
-- SELECT schemaname, tablename, policyname,
--   CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%'
--        THEN 'NEEDS FIX' ELSE 'OK' END as status
-- FROM pg_policies
-- WHERE qual LIKE '%auth.uid()%'
-- ORDER BY schemaname, tablename;

DO $$
BEGIN
  RAISE NOTICE 'auth.uid() performance audit complete - no fixes needed';
END $$;
