-- Make lease.tenantId nullable
-- Reason: Leases can be created before tenants are assigned (e.g., pre-leasing workflow)
-- This allows property owners to create lease terms before finding a tenant

-- Make tenantId nullable
ALTER TABLE public.lease
ALTER COLUMN "tenantId" DROP NOT NULL;

-- Add check constraint to ensure either tenant exists or lease is in DRAFT status
ALTER TABLE public.lease
ADD CONSTRAINT lease_tenant_id_check
CHECK (
  "tenantId" IS NOT NULL
  OR status = 'DRAFT'
);

-- Add index for queries filtering by null tenantId
CREATE INDEX IF NOT EXISTS idx_lease_tenant_id_null
ON public.lease ("tenantId")
WHERE "tenantId" IS NULL;
