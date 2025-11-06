-- Enable RLS on tenant_payment_method table and create security policies
-- This ensures payment method data isolation for PCI DSS compliance

-- Enable Row Level Security
ALTER TABLE public.tenant_payment_method ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own payment methods
DROP POLICY IF EXISTS "tenant_payment_method_tenant_access" ON public.tenant_payment_method;
CREATE POLICY "tenant_payment_method_tenant_access"
ON public.tenant_payment_method
FOR SELECT
TO authenticated
USING (
    tenantId = (SELECT auth.uid())
);

-- Policy: Tenants can insert their own payment methods
DROP POLICY IF EXISTS "tenant_payment_method_tenant_insert" ON public.tenant_payment_method;
CREATE POLICY "tenant_payment_method_tenant_insert"
ON public.tenant_payment_method
FOR INSERT
TO authenticated
WITH CHECK (
    tenantId = (SELECT auth.uid())
);

-- Policy: Tenants can update their own payment methods
DROP POLICY IF EXISTS "tenant_payment_method_tenant_update" ON public.tenant_payment_method;
CREATE POLICY "tenant_payment_method_tenant_update"
ON public.tenant_payment_method
FOR UPDATE
TO authenticated
USING (
    tenantId = (SELECT auth.uid())
)
WITH CHECK (
    tenantId = (SELECT auth.uid())
);

-- Policy: Tenants can delete their own payment methods
DROP POLICY IF EXISTS "tenant_payment_method_tenant_delete" ON public.tenant_payment_method;
CREATE POLICY "tenant_payment_method_tenant_delete"
ON public.tenant_payment_method
FOR DELETE
TO authenticated
USING (
    tenantId = (SELECT auth.uid())
);

-- Policy: Service role has full access for management operations
DROP POLICY IF EXISTS "tenant_payment_method_service_access" ON public.tenant_payment_method;
CREATE POLICY "tenant_payment_method_service_access"
ON public.tenant_payment_method
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Performance indexes for RLS policies
CREATE INDEX IF NOT EXISTS idx_tenant_payment_method_tenant_id
ON public.tenant_payment_method(tenantId);

CREATE INDEX IF NOT EXISTS idx_tenant_payment_method_stripe_customer_id
ON public.tenant_payment_method(stripeCustomerId);