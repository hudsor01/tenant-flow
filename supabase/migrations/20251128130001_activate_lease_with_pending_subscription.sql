-- Atomic lease activation with pending subscription status
-- Called when both parties have signed - activates lease immediately with subscription pending
--
-- This function:
-- 1. Locks the lease row to prevent concurrent modifications
-- 2. Validates lease is in pending_signature status with both signatures
-- 3. Atomically updates to 'active' status with 'pending' subscription status
-- 4. Returns success/failure for caller to proceed with Stripe subscription creation

CREATE OR REPLACE FUNCTION public.activate_lease_with_pending_subscription(
  p_lease_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
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
    tenant_signed_at,
    stripe_subscription_status,
    stripe_subscription_id
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;

  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Lease not found'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check if already active (idempotent - allow re-entry)
  IF v_lease.lease_status = 'active' THEN
    -- Already active - return success but don't modify
    RETURN QUERY SELECT TRUE, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 4: Validate lease status is pending_signature
  IF v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, ('Lease must be pending_signature to activate, current status: ' || v_lease.lease_status)::TEXT;
    RETURN;
  END IF;

  -- Step 5: Validate both parties have signed
  IF v_lease.owner_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Owner has not signed the lease'::TEXT;
    RETURN;
  END IF;

  IF v_lease.tenant_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Tenant has not signed the lease'::TEXT;
    RETURN;
  END IF;

  -- Step 6: Atomically activate lease with pending subscription status
  UPDATE public.leases
  SET
    lease_status = 'active',
    stripe_subscription_status = 'pending',
    subscription_last_attempt_at = NOW(),
    subscription_retry_count = 0,
    subscription_failure_reason = NULL,
    updated_at = NOW()
  WHERE id = p_lease_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.activate_lease_with_pending_subscription(UUID) TO authenticated;

COMMENT ON FUNCTION public.activate_lease_with_pending_subscription IS
  'Atomically activates a lease with pending subscription status. Called after both parties sign. Returns success/failure. Caller should then create Stripe subscription and update status to active/failed.';
