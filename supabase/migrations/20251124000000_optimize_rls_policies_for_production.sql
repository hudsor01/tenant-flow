-- Optimize RLS Policies for Production & E2E Testing
-- Based on Supabase official best practices documentation
--
-- Key optimizations:
-- 1. Wrap auth.uid() in SELECT for query plan caching
-- 2. Add explicit NULL checks for better performance
-- 3. Ensure all policies specify TO role explicitly
-- 4. Verify policies work for E2E test scenarios

-- ============================================================================
-- USERS TABLE - Optimized Policies
-- ============================================================================

-- Drop existing policies to recreate with optimizations
DROP POLICY IF EXISTS "users_select_own_record" ON public.users;
DROP POLICY IF EXISTS "users_update_own_record" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_record" ON public.users;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow authenticated users to read their own record
-- Optimized with SELECT wrapper for performance (per Supabase docs)
CREATE POLICY "users_select_own_record"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  (SELECT auth.uid()) = id
);

-- UPDATE: Allow users to update their own record
CREATE POLICY "users_update_own_record"
ON public.users
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  (SELECT auth.uid()) = id
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (SELECT auth.uid()) = id
);

-- INSERT: Allow authenticated users to create their own record
-- Also allow service_role for admin operations
CREATE POLICY "users_insert_own_record"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = id OR
  auth.jwt() ->> 'role' = 'service_role'
);

-- Service role maintains full access (existing policy preserved)
-- No changes needed to users_service_role_all policy

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Fix Auth Hook Access
-- ============================================================================

-- Ensure supabase_auth_admin can read subscriptions for JWT claims
-- This is critical for the custom_access_token_hook to function
DROP POLICY IF EXISTS "Allow auth admin to read subscriptions" ON public.subscriptions;

CREATE POLICY "auth_admin_read_subscriptions"
ON public.subscriptions
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Also ensure authenticated users can read their own subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;

CREATE POLICY "subscriptions_select_own"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  (SELECT auth.uid()) = user_id
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify policies are correctly applied:
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('users', 'subscriptions')
-- ORDER BY tablename, policyname;

-- Expected results:
-- - users_select_own_record with auth.uid() wrapped in SELECT
-- - users_update_own_record with auth.uid() wrapped in SELECT
-- - users_insert_own_record allowing both auth.uid() and service_role
-- - auth_admin_read_subscriptions for JWT hook
-- - subscriptions_select_own for user access

COMMENT ON POLICY "users_select_own_record" ON public.users IS
'Optimized SELECT policy using SELECT wrapper for auth.uid() caching. Users can only read their own record.';

COMMENT ON POLICY "users_update_own_record" ON public.users IS
'Optimized UPDATE policy with explicit NULL checks. Users can only update their own record.';

COMMENT ON POLICY "auth_admin_read_subscriptions" ON public.subscriptions IS
'Critical for custom_access_token_hook - allows auth admin to read subscription status for JWT claims';
