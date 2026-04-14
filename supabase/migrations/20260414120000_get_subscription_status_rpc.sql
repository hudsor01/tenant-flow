-- Migration: get_subscription_status RPC (CANCEL-02)
-- Purpose: Expose stripe.subscriptions.{status, cancel_at_period_end, current_period_end, items}
-- to the frontend via a SECURITY DEFINER RPC. The stripe schema is not exposed via PostgREST,
-- so the frontend cannot query stripe.subscriptions directly — this RPC bridges that gap.
--
-- Called by: src/hooks/api/query-keys/subscription-keys.ts::subscriptionStatusQuery
-- Phase 42 gap closure: the hook already calls supabase.rpc('get_subscription_status', ...) but
-- the function never existed; hook was silently falling back to leases.stripe_subscription_status
-- which returns cancelAtPeriodEnd: false, breaking the 3-state UI.

CREATE OR REPLACE FUNCTION public.get_subscription_status(p_customer_id text)
RETURNS TABLE (
  status text,
  customer text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'stripe'
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_caller_customer_id text;
BEGIN
  -- Guard: caller must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Guard: p_customer_id must match the caller's own stripe_customer_id (prevents IDOR)
  SELECT u.stripe_customer_id INTO v_caller_customer_id
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_caller_customer_id IS NULL THEN
    RETURN; -- No Stripe customer attached to this user, empty result
  END IF;

  IF p_customer_id <> v_caller_customer_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Return the most recent subscription for this customer.
  -- current_period_end in stripe.subscriptions is an integer Unix timestamp — convert to timestamptz.
  -- price_id is nested inside items (jsonb) — extract the first item's price.id.
  RETURN QUERY
  SELECT
    s.status::text AS status,
    s.customer,
    (s.items -> 0 -> 'price' ->> 'id')::text AS price_id,
    to_timestamp(s.current_period_end)::timestamptz AS current_period_end,
    s.cancel_at_period_end
  FROM stripe.subscriptions s
  WHERE s.customer = p_customer_id
  ORDER BY s.created DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status(text) TO authenticated;

COMMENT ON FUNCTION public.get_subscription_status(text) IS
  'Returns the most recent Stripe subscription for the calling user. '
  'Validates caller owns p_customer_id to prevent IDOR. '
  'Phase 42 / CANCEL-02 gap closure.';
