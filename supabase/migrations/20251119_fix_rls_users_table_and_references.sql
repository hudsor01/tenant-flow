-- CRITICAL FIX: Supabase Auth RLS 403 Error Resolution
-- This migration fixes the 403 Forbidden error when authenticated users try to access their own user record
-- 
-- Root Cause: 
-- 1. RLS policies referenced a non-existent "supabaseId" field in the users table
-- 2. The users table had RLS disabled and missing policies for authenticated users
-- 3. The correct mapping should be: users.id = auth.uid() (both are UUID)

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow auth admin to read users" ON public.users;

-- SELECT policy: Allow users to read their own record
CREATE POLICY "users_select_own_record"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- UPDATE policy: Allow users to update their own record
CREATE POLICY "users_update_own_record"
ON public.users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT policy: Allow authenticated users to insert their own record
CREATE POLICY "users_insert_own_record"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() OR auth.jwt() ->> 'role' = 'service_role');

-- Service role can do anything
CREATE POLICY "users_service_role_all"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix leases RLS policies to use correct field mapping and table names
-- Owner SELECT policy: Property owner can view their own leases
DROP POLICY IF EXISTS "lease_owner_select" ON public.leases;
CREATE POLICY "lease_owner_select"
ON public.leases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE u.id = leases.unit_id
      AND po.user_id = auth.uid()
  )
);

-- Owner INSERT policy
DROP POLICY IF EXISTS "lease_owner_insert" ON public.leases;
CREATE POLICY "lease_owner_insert"
ON public.leases
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE u.id = leases.unit_id
      AND po.user_id = auth.uid()
  )
);

-- Owner UPDATE policy
DROP POLICY IF EXISTS "lease_owner_update" ON public.leases;
CREATE POLICY "lease_owner_update"
ON public.leases
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE u.id = leases.unit_id
      AND po.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE u.id = leases.unit_id
      AND po.user_id = auth.uid()
  )
);

-- Owner DELETE policy
DROP POLICY IF EXISTS "lease_owner_delete" ON public.leases;
CREATE POLICY "lease_owner_delete"
ON public.leases
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN property_owners po ON p.property_owner_id = po.id
    WHERE u.id = leases.unit_id
      AND po.user_id = auth.uid()
  )
);

-- Tenant SELECT policy: Tenant can view their own lease
DROP POLICY IF EXISTS "lease_tenant_select" ON public.leases;
CREATE POLICY "lease_tenant_select"
ON public.leases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM tenants t
    WHERE t.id = leases.primary_tenant_id
      AND t.user_id = auth.uid()
  )
);

-- Service role can do anything
DROP POLICY IF EXISTS "lease_service_role_access" ON public.leases;
CREATE POLICY "lease_service_role_access"
ON public.leases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
