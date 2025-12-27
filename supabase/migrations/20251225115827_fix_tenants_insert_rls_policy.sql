-- Migration: Fix overly permissive INSERT policy on tenants table
-- Purpose: Remove duplicate INSERT policy that allows any authenticated user to insert tenants
-- Affected table: public.tenants
-- Security impact: HIGH - Prevents unauthorized tenant record creation
--
-- Background:
-- There are currently two INSERT policies on the tenants table:
-- 1. "Property owners can insert tenants for their properties" - WITH CHECK (true) [OVERLY PERMISSIVE]
-- 2. "tenants_insert_own" - WITH CHECK (user_id = auth.uid()) [CORRECT]
--
-- In PostgreSQL RLS, PERMISSIVE policies are OR'd together, meaning the overly
-- permissive policy negates the security of the restrictive one. Any authenticated
-- user could insert tenant records for any user_id, bypassing ownership checks.
--
-- Solution: Drop the overly permissive policy. The "tenants_insert_own" policy
-- already provides proper defense-in-depth by ensuring users can only create
-- tenant records where they are the owner (user_id = auth.uid()).

-- Drop the overly permissive INSERT policy
-- This policy allowed ANY authenticated user to insert tenants for ANY user_id
drop policy if exists "Property owners can insert tenants for their properties" on public.tenants;

-- Verify the correct policy exists (no-op if already present)
-- This ensures defense-in-depth: even if application layer is bypassed,
-- the database prevents users from creating tenants for other users
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'tenants'
    and policyname = 'tenants_insert_own'
  ) then
    create policy "tenants_insert_own"
    on public.tenants
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);
  end if;
end
$$;

-- Add comment documenting the security rationale
comment on policy "tenants_insert_own" on public.tenants is
  'Security: Users can only create tenant records for themselves. Prevents unauthorized tenant creation even if application layer is bypassed.';
