-- Fix RLS Policy Recursion Issues
-- This script removes duplicate/conflicting policies and replaces them with clean, non-recursive ones

BEGIN;

-- =============================================
-- TENANT TABLE POLICY FIXES
-- =============================================

-- Drop the conflicting tenant policies
DROP POLICY IF EXISTS "tenant_access" ON "Tenant";
DROP POLICY IF EXISTS "Allow users to read tenants they have access to" ON "Tenant";
DROP POLICY IF EXISTS "Property owners can view tenants for their properties" ON "Tenant";

-- Create clean, non-overlapping tenant policies
CREATE POLICY "tenant_select_own_profile" 
ON "Tenant" FOR SELECT 
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "tenant_select_via_property_ownership" 
ON "Tenant" FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Lease" l
    JOIN "Unit" u ON l."unitId" = u.id
    JOIN "Property" p ON u."propertyId" = p.id
    WHERE l."tenantId" = "Tenant".id 
    AND p."ownerId" = auth.uid()::text
  )
);

CREATE POLICY "tenant_select_invited_by_user" 
ON "Tenant" FOR SELECT 
TO authenticated
USING (auth.uid()::text = "invitedBy");

CREATE POLICY "tenant_update_own_profile" 
ON "Tenant" FOR UPDATE 
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "tenant_insert_invitations" 
ON "Tenant" FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = "invitedBy");

-- =============================================
-- LEASE TABLE POLICY FIXES
-- =============================================

-- Drop the conflicting lease policies
DROP POLICY IF EXISTS "lease_owner_access" ON "Lease";

-- Keep existing specific policies (they are fine):
-- - "Property owners can create leases for their properties" 
-- - "Property owners can view leases for their properties"
-- - "Tenants can view their own leases"

-- Add missing UPDATE and DELETE policies for property owners
CREATE POLICY "lease_update_by_owner" 
ON "Lease" FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "Property" p ON u."propertyId" = p.id
    WHERE u.id = "Lease"."unitId" 
    AND p."ownerId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "Property" p ON u."propertyId" = p.id
    WHERE u.id = "Lease"."unitId" 
    AND p."ownerId" = auth.uid()::text
  )
);

CREATE POLICY "lease_delete_by_owner" 
ON "Lease" FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "Unit" u
    JOIN "Property" p ON u."propertyId" = p.id
    WHERE u.id = "Lease"."unitId" 
    AND p."ownerId" = auth.uid()::text
  )
);

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check final tenant policies
SELECT 'TENANT POLICIES:' as info;
SELECT policyname, cmd, pg_get_expr(qual, oid) as qual_readable
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
WHERE schemaname = 'public' 
AND tablename = 'Tenant'
ORDER BY policyname;

-- Check final lease policies  
SELECT 'LEASE POLICIES:' as info;
SELECT policyname, cmd, pg_get_expr(qual, oid) as qual_readable
FROM pg_policies p
JOIN pg_class c ON c.relname = p.tablename
WHERE schemaname = 'public' 
AND tablename = 'Lease'
ORDER BY policyname;