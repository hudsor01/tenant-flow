-- ============================================================================
-- Migration: Add Stripe Schema Safeguards
-- Purpose: Provide helper function for future migrations that depend on stripe schema
-- Affected: public schema (adds helper function)
-- Special: This is a forward-looking safeguard - existing migrations are fine as-is
--          since they've already run. New migrations can use this helper.
-- ============================================================================

-- ============================================================================
-- 1. CREATE HELPER FUNCTION: require_stripe_schema
-- Returns true if stripe schema exists, false otherwise
-- ============================================================================

create or replace function public.require_stripe_schema()
returns boolean
language plpgsql
as $$
begin
  return exists (
    select 1 from pg_namespace where nspname = 'stripe'
  );
end;
$$;

comment on function public.require_stripe_schema() is
  'Returns true if stripe schema exists. Use in migrations: IF public.require_stripe_schema() THEN ... END IF;';

-- ============================================================================
-- 2. DOCUMENTATION: Existing Migration Audit Results
-- These migrations have been audited for stripe schema dependencies
-- ============================================================================

-- PROTECTED (has schema existence check):
--   - 20251220060000_secure_stripe_schema_rls.sql
--   - 20251225150000_add_stripe_customer_rpc_functions.sql
--   - 20260115184134_fix_active_entitlements_rls.sql

-- SAFE (uses IF EXISTS patterns):
--   - 20251204150000_grant_lease_tenants_permissions.sql
--   - 20251220061000_add_payment_methods_user_access.sql
--   - 20251225182240_fix_rls_policy_security_and_performance.sql
--   - 20251225182245_repair_incomplete_rls_migration.sql
--   - 20251226062933_optimize_webhook_monitoring.sql
--   - 20251230190000_optimize_stripe_rls_policies.sql
--   - 20251230191000_simplify_rls_policies.sql
--   - 20251230200000_harden_rls_policies.sql
--   - 20251230230000_complete_stripe_rls.sql

-- WOULD BENEFIT FROM PROTECTION (creates/alters stripe objects directly):
--   - 20251226054128_add_webhook_monitoring_infrastructure.sql
--       Creates tables/views in stripe schema directly
--       Risk: Fails on fresh instance without stripe schema
--   - 20251230270000_fix_stripe_function_security.sql
--       ALTERs stripe functions
--       Risk: Fails if functions don't exist
--   - 20251230290000_add_backend_table_rls_policies.sql
--       Creates policies on stripe tables
--       Risk: Fails if tables don't exist

-- NOTE: These migrations are NOT modified because:
-- 1. They've already run successfully in production
-- 2. Modifying historical migrations can cause migration checksum issues
-- 3. The stripe schema is created by Supabase Stripe integration before app migrations
-- 4. Fresh instances should enable Stripe integration before running migrations

-- ============================================================================
-- 3. EXAMPLE USAGE FOR FUTURE MIGRATIONS
-- ============================================================================

-- Example 1: Conditional table creation
-- DO $$
-- BEGIN
--   IF public.require_stripe_schema() THEN
--     CREATE TABLE IF NOT EXISTS stripe.my_new_table (...);
--   ELSE
--     RAISE NOTICE 'Skipping stripe.my_new_table - stripe schema does not exist';
--   END IF;
-- END $$;

-- Example 2: Conditional policy creation
-- DO $$
-- BEGIN
--   IF public.require_stripe_schema() THEN
--     EXECUTE 'CREATE POLICY "my_policy" ON stripe.customers ...';
--   END IF;
-- END $$;

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

-- Allow service_role to check schema existence (for backend migrations)
grant execute on function public.require_stripe_schema() to service_role;

-- Allow authenticated users to check (for client-side feature detection)
grant execute on function public.require_stripe_schema() to authenticated;
