-- Drop Conflicting Old RLS Policies
--
-- This migration removes OLD human-readable-named policies that conflict with
-- the new simplified policies using get_current_property_owner_id().
--
-- The old policies reference auth.users directly which causes "permission denied"
-- errors because authenticated users don't have SELECT on auth.users.

-- ============================================================================
-- TENANT_INVITATIONS TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Invited users can select invitations sent to them" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Invited users can update invitations sent to them" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can delete own invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can insert invitations for their properties" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can select own invitations" ON public.tenant_invitations;
DROP POLICY IF EXISTS "Property owners can update own invitations" ON public.tenant_invitations;

-- ============================================================================
-- UNITS TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can delete units" ON public.units;
DROP POLICY IF EXISTS "Property owners can insert units" ON public.units;
DROP POLICY IF EXISTS "Property owners can select units" ON public.units;
DROP POLICY IF EXISTS "Property owners can update units" ON public.units;

-- ============================================================================
-- TENANTS TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can insert tenants for their properties" ON public.tenants;
DROP POLICY IF EXISTS "Property owners can select tenants in their properties" ON public.tenants;

-- ============================================================================
-- PROPERTIES TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can manage their properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can select their properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can update their properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can delete their properties" ON public.properties;

-- ============================================================================
-- LEASES TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can manage leases" ON public.leases;
DROP POLICY IF EXISTS "Property owners can select leases" ON public.leases;
DROP POLICY IF EXISTS "Property owners can insert leases" ON public.leases;
DROP POLICY IF EXISTS "Property owners can update leases" ON public.leases;
DROP POLICY IF EXISTS "Property owners can delete leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;

-- ============================================================================
-- RENT_PAYMENTS TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can view payments" ON public.rent_payments;
DROP POLICY IF EXISTS "Tenants can view their payments" ON public.rent_payments;

-- ============================================================================
-- MAINTENANCE_REQUESTS TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can manage maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view their maintenance requests" ON public.maintenance_requests;

-- ============================================================================
-- PROPERTY_IMAGES TABLE - Drop old conflicting policies
-- ============================================================================
DROP POLICY IF EXISTS "Property owners can manage property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;

-- ============================================================================
-- USER_ACCESS_LOG TABLE - Drop old policies (may conflict)
-- ============================================================================
DROP POLICY IF EXISTS "Users can select own access logs" ON public.user_access_log;

-- ============================================================================
-- SECURITY_AUDIT_LOG TABLE - Drop old policies (may conflict)
-- ============================================================================
DROP POLICY IF EXISTS "Users can select own security audit logs" ON public.security_audit_log;

-- ============================================================================
-- Verify the new simplified policies exist (they should from previous migrations)
-- ============================================================================
-- The following policies should exist from 20251126010001_fix_rls_schema_corrections.sql:
-- - tenant_invitations_select_owner
-- - tenant_invitations_insert_owner
-- - tenant_invitations_update_owner
-- - tenant_invitations_delete_owner
-- - tenant_invitations_service_role
