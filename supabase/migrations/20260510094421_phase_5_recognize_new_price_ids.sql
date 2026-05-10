-- Phase 5 Pricing Restructure — recognize new $19/$49/$149 Stripe price IDs.
--
-- Phase 5 archived the legacy price IDs (all 50+ historical subscriptions are
-- canceled test/dev accounts; zero active subscribers per Stripe MCP confirmed
-- 2026-05-10). Archived prices can never appear in stripe.subscription_items
-- for any future subscription, so the legacy CASE branches are dead. This
-- migration replaces both the price-ID resolver in
-- check_user_feature_access(text, text) and the limits resolver in
-- get_user_plan_limits(text) with the 6 new Phase 5 price IDs only.
--
-- Source IDs match src/config/pricing.ts (single source of truth) and
-- supabase/functions/_shared/plan-tier.ts.

CREATE OR REPLACE FUNCTION public.check_user_feature_access(
  p_user_id text,
  p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
BEGIN
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe')
     AND to_regclass('stripe.customers') IS NOT NULL
     AND to_regclass('stripe.subscriptions') IS NOT NULL
  THEN
    SELECT id INTO v_stripe_customer_id
    FROM stripe.customers
    WHERE (metadata->>'user_id')::uuid = p_user_id::uuid
    LIMIT 1;

    IF v_stripe_customer_id IS NOT NULL THEN
      SELECT si.price INTO v_price_id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      WHERE s.customer = v_stripe_customer_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1;
    END IF;
  END IF;

  v_plan_tier := CASE v_price_id
    WHEN 'price_1RgguDP3WCR53Sdo1lJmjlD5' THEN 'FREETRIAL'
    WHEN 'price_1TVTaAP3WCR53SdoYMUZN7Vf' THEN 'STARTER'
    WHEN 'price_1TVTaEP3WCR53Sdo7pbg6BCW' THEN 'STARTER'
    WHEN 'price_1TVTaIP3WCR53SdoqnUe1Inv' THEN 'GROWTH'
    WHEN 'price_1TVTaMP3WCR53SdoN4kufrVn' THEN 'GROWTH'
    WHEN 'price_1TVTaQP3WCR53Sdo22VAYfhp' THEN 'TENANTFLOW_MAX'
    WHEN 'price_1TVTaUP3WCR53Sdo5mnmSAmF' THEN 'TENANTFLOW_MAX'
    ELSE 'FREETRIAL'
  END;

  RETURN CASE p_feature
    WHEN 'basic_properties'  THEN true
    WHEN 'maintenance'       THEN true
    WHEN 'financial_reports' THEN true
    WHEN 'api_access'        THEN v_plan_tier IN ('GROWTH', 'TENANTFLOW_MAX')
    WHEN 'white_label'       THEN v_plan_tier = 'TENANTFLOW_MAX'
    ELSE true
  END;
END;
$$;

-- Refresh the uuid-param version that 20260505221558 introduced to drop
-- legacy IDs and recognize only the Phase 5 set.
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
      OR v_plan = 'price_1tvtaap3wcr53sdoymuzn7vf'
      OR v_plan = 'price_1tvtaep3wcr53sdo7pbg6bcw' THEN
      v_props_limit := 5;
      v_units_limit := 25;
    WHEN v_plan = 'growth'
      OR v_plan = 'price_1tvtaip3wcr53sdoqnue1inv'
      OR v_plan = 'price_1tvtamp3wcr53sdon4kufrvn' THEN
      v_props_limit := 20;
      v_units_limit := 100;
    WHEN v_plan = 'max'
      OR v_plan = 'tenantflow_max'
      OR v_plan = 'price_1tvtaqp3wcr53sdo22vayfhp'
      OR v_plan = 'price_1tvtaup3wcr53sdo5mnmsamf' THEN
      v_props_limit := -1;
      v_units_limit := -1;
    ELSE
      v_props_limit := 1;
      v_units_limit := 5;
  END CASE;

  RETURN QUERY SELECT v_props_limit, v_units_limit, COALESCE(v_admin, false);
END;
$$;
