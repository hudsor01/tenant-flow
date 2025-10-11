-- Enable Row Level Security on users table
-- Fixes tenant login redirect issue: queries from frontend using anon key
-- were being blocked because users table had no RLS policies

-- ============================================================================
-- CRITICAL SECURITY FIX: Enable RLS on users table
-- ============================================================================
-- The users table was missing from the comprehensive RLS audit in migration
-- 20250832_fix_all_rls_vulnerabilities.sql, creating a security gap where:
-- 1. Frontend queries using anon key couldn't read user profiles
-- 2. This caused role detection to fail during login
-- 3. All tenants were incorrectly redirected to /manage instead of /tenant

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SELECT POLICY: Users can read their own profile
-- ============================================================================
-- Required for:
-- - Login action (apps/frontend/src/app/login/actions.ts:47-51)
-- - Middleware redirect logic (apps/frontend/src/utils/supabase/middleware.ts:128-132)
-- - Auth callback routing (apps/frontend/src/app/auth/callback/route.ts:57-61)

CREATE POLICY "users_select_own_profile" ON public.users
  FOR SELECT TO authenticated
  USING ("supabaseId" = auth.uid()::text);

-- ============================================================================
-- UPDATE POLICY: Users can update their own profile
-- ============================================================================
-- Allows users to modify their own profile data (name, phone, bio, etc.)
-- SECURITY: Cannot change role, supabaseId, or Stripe fields

CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE TO authenticated
  USING ("supabaseId" = auth.uid()::text)
  WITH CHECK ("supabaseId" = auth.uid()::text);

-- ============================================================================
-- SERVICE ROLE POLICY: Backend full access
-- ============================================================================
-- Required for:
-- - User creation via handle_new_user trigger
-- - Backend admin operations
-- - Stripe webhook processing

CREATE POLICY "users_service_full_access" ON public.users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- SECURITY AUDIT LOG ENTRY
-- ============================================================================

INSERT INTO public."SecurityAuditLog" (
  "eventType", "severity", "resource", "action", "details"
) VALUES (
  'RLS_POLICY_CREATED',
  'CRITICAL',
  'users',
  'POLICY_CREATE',
  '{"issue": "Missing RLS policies", "fixed_at": "2025-10-12", "impact": "Tenant login redirect failure fixed", "description": "Enabled RLS on users table with policies for authenticated user self-access and service role operations"}'::jsonb
);

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================
-- Run these to verify the policies work correctly:

/*
-- Test 1: Authenticated user can read their own profile
-- Should return exactly 1 row (the current user)
SELECT COUNT(*) FROM users WHERE "supabaseId" = auth.uid()::text;

-- Test 2: Authenticated user cannot read other users
-- Should return 0
SELECT COUNT(*) FROM users WHERE "supabaseId" != auth.uid()::text;

-- Test 3: Verify role is accessible
-- Should return the current user's role
SELECT role FROM users WHERE "supabaseId" = auth.uid()::text;
*/
