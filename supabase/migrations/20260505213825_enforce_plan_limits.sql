-- Plan-limit enforcement at the DB layer (the real revenue gate).
--
-- Before this migration, `src/config/pricing.ts:checkPlanLimits()` was
-- defined but never called from any business logic — Starter ($29) users
-- could create unlimited properties, neutralizing the only structural
-- reason to upgrade to Growth ($79) or Max ($199).
--
-- We enforce at the DB layer because PostgREST is the sole write path,
-- and frontend checks can be bypassed by direct REST calls. BEFORE INSERT
-- triggers raise a structured exception that PostgREST surfaces as a
-- 4xx with code/hint/details — the frontend can match `hint =
-- 'plan_limit_exceeded'` and parse `details` as JSON to drive the
-- upgrade prompt with attribution.
--
-- Limits sourced from src/config/pricing.ts (single source of truth):
--   Trial / unknown:    1 property,   5 units
--   Starter ($29):      5 properties, 25 units
--   Growth ($79):      20 properties, 100 units
--   Max ($199):        unlimited (denoted as -1 in get_user_plan_limits)
--
-- Admin users (is_admin=true) bypass enforcement.
-- Soft-deleted properties (status='inactive') do NOT count toward the cap;
-- units have no soft-delete sentinel (CHECK enum is available/occupied/
-- maintenance/reserved), so unit counts include every row owned.

-- =============================================================================
-- Helper: resolve effective plan limits for a user
-- =============================================================================
-- STABLE because for any given (user_id) the result is determined by the
-- current subscription_plan + is_admin columns; safe inside trigger context.
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
RETURNS TABLE(properties_limit integer, units_limit integer, is_admin boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan    text;
  v_admin   boolean;
BEGIN
  SELECT u.subscription_plan, u.is_admin
    INTO v_plan, v_admin
  FROM public.users u
  WHERE u.id = p_user_id;

  -- Lowercased plan key. Stripe webhook handler writes whatever it gets
  -- from the price ID lookup, so accept multiple casings defensively.
  RETURN QUERY SELECT
    CASE LOWER(COALESCE(v_plan, ''))
      WHEN 'starter'         THEN 5
      WHEN 'growth'          THEN 20
      WHEN 'max'             THEN -1
      WHEN 'tenantflow_max'  THEN -1
      ELSE 1  -- trial / null / unknown — most restrictive
    END,
    CASE LOWER(COALESCE(v_plan, ''))
      WHEN 'starter'         THEN 25
      WHEN 'growth'          THEN 100
      WHEN 'max'             THEN -1
      WHEN 'tenantflow_max'  THEN -1
      ELSE 5
    END,
    COALESCE(v_admin, false);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(uuid) TO service_role;

-- =============================================================================
-- BEFORE INSERT trigger on properties
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_property_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  integer;
  v_admin  boolean;
  v_count  integer;
BEGIN
  SELECT properties_limit, is_admin
    INTO v_limit, v_admin
  FROM public.get_user_plan_limits(NEW.owner_user_id);

  -- Admins and Max-tier (limit=-1) bypass enforcement.
  IF v_admin OR v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.properties
  WHERE owner_user_id = NEW.owner_user_id
    AND status <> 'inactive';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_limit_exceeded: properties (% / % used)', v_count, v_limit
      USING
        ERRCODE = 'P0001',
        HINT    = 'plan_limit_exceeded',
        DETAIL  = format(
          '{"resource":"properties","used":%s,"limit":%s,"upgrade_source":"property_limit_gate"}',
          v_count, v_limit
        );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_property_plan_limit ON public.properties;
CREATE TRIGGER trg_enforce_property_plan_limit
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.enforce_property_plan_limit();

-- =============================================================================
-- BEFORE INSERT trigger on units
-- =============================================================================
CREATE OR REPLACE FUNCTION public.enforce_unit_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit  integer;
  v_admin  boolean;
  v_count  integer;
BEGIN
  SELECT units_limit, is_admin
    INTO v_limit, v_admin
  FROM public.get_user_plan_limits(NEW.owner_user_id);

  IF v_admin OR v_limit < 0 THEN
    RETURN NEW;
  END IF;

  -- units has no soft-delete sentinel (status enum: available/occupied/
  -- maintenance/reserved), so every row counts.
  SELECT COUNT(*) INTO v_count
  FROM public.units
  WHERE owner_user_id = NEW.owner_user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_limit_exceeded: units (% / % used)', v_count, v_limit
      USING
        ERRCODE = 'P0001',
        HINT    = 'plan_limit_exceeded',
        DETAIL  = format(
          '{"resource":"units","used":%s,"limit":%s,"upgrade_source":"unit_limit_gate"}',
          v_count, v_limit
        );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_unit_plan_limit ON public.units;
CREATE TRIGGER trg_enforce_unit_plan_limit
BEFORE INSERT ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unit_plan_limit();

-- =============================================================================
-- Test fixture backfill
-- =============================================================================
-- The synthetic E2E owner accounts (`e2e-owner-a@tenantflow.app`,
-- `e2e-owner-b@tenantflow.app`) live in prod Auth and back the RLS
-- integration suite. They need to be able to create arbitrary numbers of
-- properties and units during tests, so pin them to subscription_plan='max'
-- (the unlimited tier). Real users stay at NULL until the Stripe webhook
-- writes their plan.
UPDATE public.users
SET subscription_plan = 'max'
WHERE email IN ('e2e-owner-a@tenantflow.app', 'e2e-owner-b@tenantflow.app')
  AND COALESCE(subscription_plan, '') <> 'max';
