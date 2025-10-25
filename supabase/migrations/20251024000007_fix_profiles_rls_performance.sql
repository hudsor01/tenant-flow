-- Migration: Fix Profiles Table RLS Performance
-- Date: 2025-01-24
-- Description: Optimizes auth.uid() calls in profiles table RLS policies

-- =====================================================
-- FIX: profiles table RLS policies
-- =====================================================
-- Current issue: auth.uid() without SELECT wrapper
-- Fix: Wrap in (SELECT auth.uid())

-- profiles_user_select
DROP POLICY IF EXISTS "profiles_user_select" ON public.profiles;
CREATE POLICY "profiles_user_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- profiles_user_insert
DROP POLICY IF EXISTS "profiles_user_insert" ON public.profiles;
CREATE POLICY "profiles_user_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- profiles_user_update
DROP POLICY IF EXISTS "profiles_user_update" ON public.profiles;
CREATE POLICY "profiles_user_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- profiles_user_delete
DROP POLICY IF EXISTS "profiles_user_delete" ON public.profiles;
CREATE POLICY "profiles_user_delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (id = (SELECT auth.uid()));

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run to verify optimization:
-- SELECT tablename, policyname, qual
-- FROM pg_policies 
-- WHERE tablename = 'profiles'
-- ORDER BY policyname;

-- Expected result: All policies should use (SELECT auth.uid())
