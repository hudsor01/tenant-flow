-- Fix remaining RLS issues

-- 1. Fix tenant_emergency_contact to use auth_user_id
DROP POLICY IF EXISTS "tenant_emergency_contact_own_select" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_insert" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_update" ON public.tenant_emergency_contact;
DROP POLICY IF EXISTS "tenant_emergency_contact_own_delete" ON public.tenant_emergency_contact;

CREATE POLICY "tenant_emergency_contact_own_select" ON public.tenant_emergency_contact
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM tenant WHERE tenant.id = tenant_emergency_contact.tenant_id AND tenant.auth_user_id = auth.uid()));

CREATE POLICY "tenant_emergency_contact_own_insert" ON public.tenant_emergency_contact
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM tenant WHERE tenant.id = tenant_emergency_contact.tenant_id AND tenant.auth_user_id = auth.uid()));

CREATE POLICY "tenant_emergency_contact_own_update" ON public.tenant_emergency_contact
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM tenant WHERE tenant.id = tenant_emergency_contact.tenant_id AND tenant.auth_user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM tenant WHERE tenant.id = tenant_emergency_contact.tenant_id AND tenant.auth_user_id = auth.uid()));

CREATE POLICY "tenant_emergency_contact_own_delete" ON public.tenant_emergency_contact
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM tenant WHERE tenant.id = tenant_emergency_contact.tenant_id AND tenant.auth_user_id = auth.uid()));

-- 2. Add role check to property INSERT - only owners can create properties
DROP POLICY IF EXISTS "property_owner_insert" ON public.property;
CREATE POLICY "property_owner_insert" ON public.property
FOR INSERT TO authenticated
WITH CHECK (
    "ownerId" = (SELECT auth.uid())::text
    AND EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid())::text AND role = 'OWNER')
);

-- 3. Tenants should NOT be able to SELECT from property table at all
DROP POLICY IF EXISTS "property_owner_select" ON public.property;
CREATE POLICY "property_owner_select" ON public.property
FOR SELECT TO authenticated
USING (
    "ownerId" = (SELECT auth.uid())::text
    AND EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid())::text AND role = 'OWNER')
);
