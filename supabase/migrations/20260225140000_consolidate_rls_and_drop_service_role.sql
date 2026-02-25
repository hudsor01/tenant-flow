-- Migration: Consolidate duplicate permissive RLS policies and drop remaining
-- redundant service_role policies.
--
-- A. Drop all remaining service_role policies (BYPASSRLS makes them redundant)
-- B. Consolidate multiple permissive SELECT/UPDATE policies per authenticated
--    into single policies with OR, reducing planner overhead.

BEGIN;

-- ============================================================================
-- A. DROP REMAINING REDUNDANT service_role POLICIES
-- ============================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.relname AS tbl, p.polname AS pol
    FROM pg_policy p
    JOIN pg_class t ON t.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND p.polroles @> ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'service_role')]
      -- Skip FOR ALL policies on audit/webhook tables (already clean)
      AND NOT (p.polcmd = '*')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    RAISE NOTICE 'Dropped service_role policy: % on %', r.pol, r.tbl;
  END LOOP;
END;
$$;

-- ============================================================================
-- B. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES (same role + operation)
-- ============================================================================

-- B1. inspections: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Owners can view their inspections" ON public.inspections;
DROP POLICY IF EXISTS "Tenants can view inspections for their leases" ON public.inspections;

CREATE POLICY "inspections_select"
ON public.inspections FOR SELECT TO authenticated
USING (
  (select auth.uid()) = owner_user_id
  OR
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B2. inspections: merge 2 UPDATE policies into 1
DROP POLICY IF EXISTS "Owners can update their inspections" ON public.inspections;
DROP POLICY IF EXISTS "Tenants can update inspections for review" ON public.inspections;

CREATE POLICY "inspections_update"
ON public.inspections FOR UPDATE TO authenticated
USING (
  (select auth.uid()) = owner_user_id
  OR
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
)
WITH CHECK (
  (select auth.uid()) = owner_user_id
  OR
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B3. inspection_rooms: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Owners can view inspection rooms" ON public.inspection_rooms;
DROP POLICY IF EXISTS "Tenants can view inspection rooms" ON public.inspection_rooms;

CREATE POLICY "inspection_rooms_select"
ON public.inspection_rooms FOR SELECT TO authenticated
USING (
  inspection_id IN (
    SELECT id FROM public.inspections
    WHERE owner_user_id = (select auth.uid())
  )
  OR
  inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.leases l ON l.id = i.lease_id
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B4. inspection_photos: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Owners can view inspection photos" ON public.inspection_photos;
DROP POLICY IF EXISTS "Tenants can view inspection photos" ON public.inspection_photos;

CREATE POLICY "inspection_photos_select"
ON public.inspection_photos FOR SELECT TO authenticated
USING (
  inspection_id IN (
    SELECT id FROM public.inspections
    WHERE owner_user_id = (select auth.uid())
  )
  OR
  inspection_id IN (
    SELECT i.id FROM public.inspections i
    JOIN public.leases l ON l.id = i.lease_id
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B5. late_fees: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Property owners can view late fees for their leases" ON public.late_fees;
DROP POLICY IF EXISTS "Tenants can view their own late fees" ON public.late_fees;

CREATE POLICY "late_fees_select"
ON public.late_fees FOR SELECT TO authenticated
USING (
  -- Owner: late fee belongs to a lease they own
  lease_id IN (
    SELECT id FROM public.leases WHERE owner_user_id = (select auth.uid())
  )
  OR
  -- Tenant: late fee belongs to a lease they're on
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B6. payment_reminders: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "Property owners can view payment reminder history" ON public.payment_reminders;
DROP POLICY IF EXISTS "Tenants can view their own payment reminders" ON public.payment_reminders;

CREATE POLICY "payment_reminders_select"
ON public.payment_reminders FOR SELECT TO authenticated
USING (
  lease_id IN (
    SELECT id FROM public.leases WHERE owner_user_id = (select auth.uid())
  )
  OR
  lease_id IN (
    SELECT l.id FROM public.leases l
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
  )
);

-- B7. properties: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "properties_select_owner" ON public.properties;
DROP POLICY IF EXISTS "tenants_view_properties" ON public.properties;

CREATE POLICY "properties_select"
ON public.properties FOR SELECT TO authenticated
USING (
  owner_user_id = (select auth.uid())
  OR
  id IN (
    SELECT u.property_id FROM public.units u
    JOIN public.leases l ON l.unit_id = u.id
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
      AND l.lease_status = 'active'
  )
);

-- B8. property_images: merge 2 SELECT policies into 1
DROP POLICY IF EXISTS "property_images_select" ON public.property_images;
DROP POLICY IF EXISTS "property_images_select_owner" ON public.property_images;

CREATE POLICY "property_images_select"
ON public.property_images FOR SELECT TO authenticated
USING (
  property_id IN (
    SELECT id FROM public.properties WHERE owner_user_id = (select auth.uid())
  )
  OR
  property_id IN (
    SELECT u.property_id FROM public.units u
    JOIN public.leases l ON l.unit_id = u.id
    JOIN public.tenants t ON t.id = l.primary_tenant_id
    WHERE t.user_id = (select auth.uid())
      AND l.lease_status = 'active'
  )
);

COMMIT;
