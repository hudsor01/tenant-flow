-- Add signature_method enum and columns to track how leases were signed
-- DocuSeal webhooks don't expose signer IP addresses, so we need a separate
-- column to distinguish signing method while keeping IP field clean for actual IPs

-- Step 1: Create enum for signature methods
CREATE TYPE public.signature_method AS ENUM ('in_app', 'docuseal');

-- Step 2: Add signature method columns to leases table
ALTER TABLE public.leases
ADD COLUMN owner_signature_method public.signature_method,
ADD COLUMN tenant_signature_method public.signature_method;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN public.leases.owner_signature_method IS 'Method used for owner signature: in_app (direct with IP capture) or docuseal (third-party e-signature)';
COMMENT ON COLUMN public.leases.tenant_signature_method IS 'Method used for tenant signature: in_app (direct with IP capture) or docuseal (third-party e-signature)';

-- Step 4: Migrate existing data - convert 'docuseal' IP markers to proper method enum
-- This fixes the data integrity issue where 'docuseal' was stored as IP address
UPDATE public.leases
SET owner_signature_method = 'docuseal'::public.signature_method,
    owner_signature_ip = NULL
WHERE owner_signature_ip = 'docuseal';

UPDATE public.leases
SET tenant_signature_method = 'docuseal'::public.signature_method,
    tenant_signature_ip = NULL
WHERE tenant_signature_ip = 'docuseal';

-- Step 5: Backfill in_app method for existing signatures with real IP addresses
UPDATE public.leases
SET owner_signature_method = 'in_app'::public.signature_method
WHERE owner_signed_at IS NOT NULL 
  AND owner_signature_ip IS NOT NULL 
  AND owner_signature_method IS NULL;

UPDATE public.leases
SET tenant_signature_method = 'in_app'::public.signature_method
WHERE tenant_signed_at IS NOT NULL 
  AND tenant_signature_ip IS NOT NULL 
  AND tenant_signature_method IS NULL;
