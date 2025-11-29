-- Update sign_lease_and_check_activation RPC to accept signature_method parameter
-- This allows the function to record how the lease was signed (in_app or docuseal)

-- Drop the old function signature first
DROP FUNCTION IF EXISTS public.sign_lease_and_check_activation(UUID, TEXT, TEXT, TIMESTAMPTZ);

-- Recreate with new parameter
CREATE OR REPLACE FUNCTION public.sign_lease_and_check_activation(
  p_lease_id UUID,
  p_signer_type TEXT,           -- 'owner' or 'tenant'
  p_signature_ip TEXT,
  p_signed_at TIMESTAMPTZ,
  p_signature_method public.signature_method DEFAULT 'in_app'  -- NEW: defaults to in_app for backward compatibility
)
RETURNS TABLE (
  success BOOLEAN,
  both_signed BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
BEGIN
  -- Step 1: Lock the lease row to prevent concurrent modifications
  SELECT 
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;
  
  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease not found'::TEXT;
    RETURN;
  END IF;
  
  -- Step 3: Validate lease status
  IF p_signer_type = 'tenant' AND v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease must be pending signature for tenant to sign'::TEXT;
    RETURN;
  END IF;
  
  IF p_signer_type = 'owner' AND v_lease.lease_status NOT IN ('draft', 'pending_signature') THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease cannot be signed in its current status'::TEXT;
    RETURN;
  END IF;
  
  -- Step 4: Check if already signed (prevent double signing)
  IF p_signer_type = 'owner' AND v_lease.owner_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Owner has already signed this lease'::TEXT;
    RETURN;
  END IF;
  
  IF p_signer_type = 'tenant' AND v_lease.tenant_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Tenant has already signed this lease'::TEXT;
    RETURN;
  END IF;
  
  -- Step 5: Record the signature atomically (now includes signature_method)
  IF p_signer_type = 'owner' THEN
    UPDATE public.leases
    SET 
      owner_signed_at = p_signed_at,
      owner_signature_ip = p_signature_ip,
      owner_signature_method = p_signature_method
    WHERE id = p_lease_id;
    
    -- Return whether both are now signed (tenant was already signed)
    RETURN QUERY SELECT TRUE, (v_lease.tenant_signed_at IS NOT NULL), NULL::TEXT;
  ELSE
    UPDATE public.leases
    SET 
      tenant_signed_at = p_signed_at,
      tenant_signature_ip = p_signature_ip,
      tenant_signature_method = p_signature_method
    WHERE id = p_lease_id;
    
    -- Return whether both are now signed (owner was already signed)
    RETURN QUERY SELECT TRUE, (v_lease.owner_signed_at IS NOT NULL), NULL::TEXT;
  END IF;
  
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users (new signature)
GRANT EXECUTE ON FUNCTION public.sign_lease_and_check_activation(UUID, TEXT, TEXT, TIMESTAMPTZ, public.signature_method) TO authenticated;

COMMENT ON FUNCTION public.sign_lease_and_check_activation IS 
  'Atomically records a lease signature with row-level locking. Returns whether both parties have now signed. Prevents race conditions in simultaneous signing. Now tracks signature method (in_app or docuseal).';
