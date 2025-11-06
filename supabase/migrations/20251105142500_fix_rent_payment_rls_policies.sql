-- Fix rent_payment RLS policies
-- Remove the problematic system_only policy and recreate correct policies

-- Drop the problematic policy that was blocking service role access
DROP POLICY IF EXISTS "rent_payment_system_only" ON public.rent_payment;

-- Recreate the correct policies based on the original migration
-- Policy: Owners can view payments for their properties
DROP POLICY IF EXISTS "rent_payment_owner_access" ON public.rent_payment;
CREATE POLICY "rent_payment_owner_access"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
    "ownerId" = (SELECT auth.uid())::text
);

-- Policy: Tenants can view their own payments
DROP POLICY IF EXISTS "rent_payment_tenant_access" ON public.rent_payment;
CREATE POLICY "rent_payment_tenant_access"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
    "tenantId" = (SELECT auth.uid())::text
);

-- Policy: Only service role can INSERT payments (for security)
DROP POLICY IF EXISTS "rent_payment_service_insert" ON public.rent_payment;
CREATE POLICY "rent_payment_service_insert"
ON public.rent_payment
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Only service role can UPDATE payments (for security)
DROP POLICY IF EXISTS "rent_payment_service_update" ON public.rent_payment;
CREATE POLICY "rent_payment_service_update"
ON public.rent_payment
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Only service role can DELETE payments (for test cleanup)
DROP POLICY IF EXISTS "rent_payment_service_delete" ON public.rent_payment;
CREATE POLICY "rent_payment_service_delete"
ON public.rent_payment
FOR DELETE
TO service_role
USING (true);