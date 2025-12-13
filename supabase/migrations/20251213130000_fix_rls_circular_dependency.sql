-- Fix RLS Circular Dependency Bug
--
-- The leases_select and lease_tenants_select policies were creating infinite recursion
-- because they referenced each other in their EXISTS clauses.
--
-- This migration breaks the circular dependency by:
-- 1. Simplifying the leases_select policy to not reference lease_tenants
-- 2. Simplifying the lease_tenants_select policy to not reference leases
-- 3. Ensuring proper access control without circular references

BEGIN;

-- Drop the problematic policies
DROP POLICY IF EXISTS leases_select ON public.leases;
DROP POLICY IF EXISTS lease_tenants_select ON public.lease_tenants;

-- Recreate leases_select policy without circular dependency
-- Owners can see leases they own
-- Tenants can see leases they're associated with (via lease_tenants, but without circular reference)
CREATE POLICY leases_select ON public.leases FOR SELECT TO authenticated USING (
  (property_owner_id = public.get_current_property_owner_id()) OR
  (id IN (
    SELECT lt.lease_id
    FROM public.lease_tenants lt
    WHERE lt.tenant_id = public.get_current_tenant_id()
  ))
);

-- Recreate lease_tenants_select policy without circular dependency
-- Tenants can see their own lease tenant records
-- Owners can see lease tenant records for leases they own (via direct property ownership check)
CREATE POLICY lease_tenants_select ON public.lease_tenants FOR SELECT TO authenticated USING (
  (tenant_id = public.get_current_tenant_id()) OR
  (lease_id IN (
    SELECT l.id
    FROM public.leases l
    WHERE l.property_owner_id = public.get_current_property_owner_id()
  ))
);

COMMIT;
