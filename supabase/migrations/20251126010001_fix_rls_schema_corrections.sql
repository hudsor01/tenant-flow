-- Fix RLS Schema Corrections
-- This migration fixes the errors from the previous migration

-- ============================================================================
-- Drop existing policies that reference old function
-- ============================================================================
DROP POLICY IF EXISTS "properties_access" ON public.properties CASCADE;

-- ============================================================================
-- Drop and recreate helper functions with CASCADE
-- ============================================================================
DROP FUNCTION IF EXISTS public.user_is_property_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_is_tenant(uuid) CASCADE;

-- ============================================================================
-- Fix tenant_invitations policies (uses unit_id, not lease_id)
-- ============================================================================
DROP POLICY IF EXISTS "tenant_invitations_select_owner" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert_owner" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_update_owner" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_delete_owner" ON public.tenant_invitations;

CREATE POLICY "tenant_invitations_select_owner"
  ON public.tenant_invitations FOR SELECT
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "tenant_invitations_insert_owner"
  ON public.tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "tenant_invitations_update_owner"
  ON public.tenant_invitations FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "tenant_invitations_delete_owner"
  ON public.tenant_invitations FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

-- ============================================================================
-- Fix reports policies (uses owner_id, not property_owner_id)
-- ============================================================================
DROP POLICY IF EXISTS "reports_select_owner" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_owner" ON public.reports;
DROP POLICY IF EXISTS "reports_update_owner" ON public.reports;
DROP POLICY IF EXISTS "reports_delete_owner" ON public.reports;

CREATE POLICY "reports_select_owner"
  ON public.reports FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "reports_insert_owner"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "reports_update_owner"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "reports_delete_owner"
  ON public.reports FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- Fix rent_due policies (no tenant_id column, join through lease)
-- ============================================================================
DROP POLICY IF EXISTS "rent_due_select" ON public.rent_due;

CREATE POLICY "rent_due_select"
  ON public.rent_due FOR SELECT
  TO authenticated
  USING (
    -- Tenants can see their rent due through lease_tenants
    EXISTS (
      SELECT 1 FROM public.lease_tenants lt
      WHERE lt.lease_id = rent_due.lease_id
        AND lt.tenant_id = get_current_tenant_id()
    ) OR
    -- Property owners can see rent due for their leases
    EXISTS (
      SELECT 1 FROM public.leases l
      WHERE l.id = rent_due.lease_id
        AND l.property_owner_id = get_current_property_owner_id()
    )
  );
