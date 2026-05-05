-- Followup to 20260505213825_enforce_plan_limits.sql.
--
-- Cycle-1 review surfaced a P0: the Stripe webhook handler writes
-- `subscription_plan: planLookup ?? priceId`, and none of our live Stripe
-- prices have lookup_key configured. So every paying customer's
-- `subscription_plan` ended up as the raw price ID
-- (`price_1RtWFcP3WCR53SdoCxiVldhb` etc.), which the previous CASE didn't
-- recognize → ELSE 1 → trial cap. Net effect: every paying customer would
-- have been silently dropped to the trial limits the moment the original
-- migration shipped.
--
-- Two fixes ship together:
--   1. Webhook handlers (checkout-session-completed.ts +
--      customer-subscription-updated.ts) now call priceIdToTier() from
--      _shared/plan-tier.ts to write a normalized 'starter' / 'growth' /
--      'max' slug. Future writes will be canonical tier slugs.
--   2. This migration backfills the matcher: get_user_plan_limits also
--      recognizes the live Stripe price IDs as tier-equivalent. Defense
--      in depth — handles any historical raw-price-ID values already in
--      `subscription_plan` AND any future webhook variations.
--
-- The CASE is now table-driven via local variables (cycle-1 P2-5) so a new
-- tier added to one branch can't drift from the other.
--
-- Source IDs mirror src/config/pricing.ts and
-- supabase/functions/_shared/plan-tier.ts. Lowercased here because the
-- normalize step lowercases the value before matching, and Postgres
-- string equality is case-sensitive.

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
RETURNS TABLE(properties_limit integer, units_limit integer, is_admin boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan         text;
  v_admin        boolean;
  v_props_limit  integer;
  v_units_limit  integer;
BEGIN
  SELECT u.subscription_plan, u.is_admin
    INTO v_plan, v_admin
  FROM public.users u
  WHERE u.id = p_user_id;

  v_plan := LOWER(COALESCE(v_plan, ''));

  CASE
    WHEN v_plan = 'starter'
      OR v_plan = 'price_1rtwfcp3wcr53sdocxivldhb'   -- Starter monthly
      OR v_plan = 'price_1rtwfdp3wcr53sdoarrrxyrl' THEN  -- Starter annual
      v_props_limit := 5;
      v_units_limit := 25;
    WHEN v_plan = 'growth'
      OR v_plan = 'price_1spgcnp3wcr53sdorjdpisy5'   -- Growth monthly
      OR v_plan = 'price_1spgcrp3wcr53sdonqlutjgk' THEN  -- Growth annual
      v_props_limit := 20;
      v_units_limit := 100;
    WHEN v_plan = 'max'
      OR v_plan = 'tenantflow_max'
      OR v_plan = 'price_1rd16pp3wcr53sdoch3ojldl'   -- Max monthly
      OR v_plan = 'price_1rd17ap3wcr53sdotb4ftbsq' THEN  -- Max annual
      v_props_limit := -1;
      v_units_limit := -1;
    ELSE
      v_props_limit := 1;   -- trial / null / unknown
      v_units_limit := 5;
  END CASE;

  RETURN QUERY SELECT v_props_limit, v_units_limit, COALESCE(v_admin, false);
END;
$$;
