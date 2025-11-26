-- Migration: Add service_role GRANT permissions for tables
-- Issue: service_role needs SELECT permission on property_owners for bulk import
-- This was manually applied and now persisted in migration

-- =============================================================================
-- Grant service_role access to property_owners table
-- =============================================================================
-- The adminClient (service_role) needs to query property_owners to look up
-- the property_owner_id from the authenticated user's user_id during bulk import

GRANT SELECT ON public.property_owners TO service_role;

-- =============================================================================
-- Grant service_role access to all core tables
-- =============================================================================
-- Ensure service_role can perform all operations on all core tables
-- This is needed for admin operations and bulk imports

GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lease_tenants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
