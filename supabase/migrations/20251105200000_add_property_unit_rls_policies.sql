-- Add RLS policies for property and unit tables
-- Uses current column names (ownerId, not ownerId)

-- ============================================
-- PROPERTY TABLE RLS POLICIES
-- ============================================

-- DROP existing policies if any
DROP POLICY IF EXISTS "property_owner_select" ON public.property;
DROP POLICY IF EXISTS "property_owner_insert" ON public.property;
DROP POLICY IF EXISTS "property_owner_update" ON public.property;
DROP POLICY IF EXISTS "property_owner_delete" ON public.property;
DROP POLICY IF EXISTS "property_service_access" ON public.property;

-- Owners can view their own properties
CREATE POLICY "property_owner_select"
ON public.property
FOR SELECT
TO authenticated
USING ("ownerId" = (SELECT auth.uid())::text);

-- Owners can create properties for themselves
CREATE POLICY "property_owner_insert"
ON public.property
FOR INSERT
TO authenticated
WITH CHECK ("ownerId" = (SELECT auth.uid())::text);

-- Owners can update their own properties
CREATE POLICY "property_owner_update"
ON public.property
FOR UPDATE
TO authenticated
USING ("ownerId" = (SELECT auth.uid())::text)
WITH CHECK ("ownerId" = (SELECT auth.uid())::text);

-- Owners can delete their own properties
CREATE POLICY "property_owner_delete"
ON public.property
FOR DELETE
TO authenticated
USING ("ownerId" = (SELECT auth.uid())::text);

-- Service role has full access
CREATE POLICY "property_service_access"
ON public.property
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- UNIT TABLE RLS POLICIES
-- ============================================

-- DROP existing policies if any
DROP POLICY IF EXISTS "unit_owner_select" ON public.unit;
DROP POLICY IF EXISTS "unit_owner_insert" ON public.unit;
DROP POLICY IF EXISTS "unit_owner_update" ON public.unit;
DROP POLICY IF EXISTS "unit_owner_delete" ON public.unit;
DROP POLICY IF EXISTS "unit_service_access" ON public.unit;

-- Owners can view units in their properties
CREATE POLICY "unit_owner_select"
ON public.unit
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM property
        WHERE property.id = unit."propertyId"
        AND property."ownerId" = (SELECT auth.uid())::text
    )
);

-- Owners can create units in their properties
CREATE POLICY "unit_owner_insert"
ON public.unit
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM property
        WHERE property.id = unit."propertyId"
        AND property."ownerId" = (SELECT auth.uid())::text
    )
);

-- Owners can update units in their properties
CREATE POLICY "unit_owner_update"
ON public.unit
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM property
        WHERE property.id = unit."propertyId"
        AND property."ownerId" = (SELECT auth.uid())::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM property
        WHERE property.id = unit."propertyId"
        AND property."ownerId" = (SELECT auth.uid())::text
    )
);

-- Owners can delete units in their properties
CREATE POLICY "unit_owner_delete"
ON public.unit
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM property
        WHERE property.id = unit."propertyId"
        AND property."ownerId" = (SELECT auth.uid())::text
    )
);

-- Service role has full access
CREATE POLICY "unit_service_access"
ON public.unit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- TENANT_EMERGENCY_CONTACT TABLE RLS POLICIES
-- ============================================

-- DROP existing policies if any
DROP POLICY IF EXISTS "tenant_emergency_contact_own_select" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_insert" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_update" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_delete" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_service_access" ON public.tenant_emergency_contact;

-- Tenants can view their own emergency contacts
CREATE POLICY "tenant_emergency_contact_own_select"
ON public.tenant_emergency_contact
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tenant
        WHERE tenant.id = tenant_emergency_contact.tenant_id
        AND tenant."userId" = (SELECT auth.uid())::text
    )
);

-- Tenants can create their own emergency contacts
CREATE POLICY "tenant_emergency_contact_own_insert"
ON public.tenant_emergency_contact
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant
        WHERE tenant.id = tenant_emergency_contact.tenant_id
        AND tenant."userId" = (SELECT auth.uid())::text
    )
);

-- Tenants can update their own emergency contacts
CREATE POLICY "tenant_emergency_contact_own_update"
ON public.tenant_emergency_contact
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tenant
        WHERE tenant.id = tenant_emergency_contact.tenant_id
        AND tenant."userId" = (SELECT auth.uid())::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tenant
        WHERE tenant.id = tenant_emergency_contact.tenant_id
        AND tenant."userId" = (SELECT auth.uid())::text
    )
);

-- Tenants can delete their own emergency contacts
CREATE POLICY "tenant_emergency_contact_own_delete"
ON public.tenant_emergency_contact
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tenant
        WHERE tenant.id = tenant_emergency_contact.tenant_id
        AND tenant."userId" = (SELECT auth.uid())::text
    )
);

-- Service role has full access
CREATE POLICY "tenant_emergency_contact_service_access"
ON public.tenant_emergency_contact
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
