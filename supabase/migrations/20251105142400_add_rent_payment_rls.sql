-- Enable RLS on rent_payment table and create security policies
-- This ensures payment data isolation for PCI DSS compliance

-- Enable Row Level Security
ALTER TABLE public.rent_payment ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view payments for their properties
DROP POLICY IF EXISTS "rent_payment_owner_access" ON public.rent_payment;
CREATE POLICY "rent_payment_owner_access"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
    ownerId = (SELECT auth.uid())
);

-- Policy: Tenants can view their own payments
DROP POLICY IF EXISTS "rent_payment_tenant_access" ON public.rent_payment;
CREATE POLICY "rent_payment_tenant_access"
ON public.rent_payment
FOR SELECT
TO authenticated
USING (
    tenantId = (SELECT auth.uid())
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

-- Policy: No DELETE policy (7-year retention requirement)
-- Payments cannot be deleted once created

-- Performance indexes for RLS policies
CREATE INDEX IF NOT EXISTS idx_rent_payment_owner_id
ON public.rent_payment(ownerId);

CREATE INDEX IF NOT EXISTS idx_rent_payment_tenant_id
ON public.rent_payment(tenantId);