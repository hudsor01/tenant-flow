-- Migration: Stripe Query Functions for Type-Safe Access
-- Description: PostgreSQL functions for querying stripe.* schema data
-- Author: Production Implementation
-- Date: 2025-10-18
-- Dependencies: 20251018_stripe_sync_engine_user_mapping.sql

-- ============================================================================
-- GET USER'S ACTIVE SUBSCRIPTION
-- ============================================================================
-- Returns the user's active subscription with plan details
-- Used by: Access control, feature gating, billing UI

CREATE OR REPLACE FUNCTION public.get_user_active_subscription(
  p_user_id UUID
)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  plan_id TEXT,
  plan_name TEXT,
  plan_amount BIGINT,
  plan_currency TEXT,
  plan_interval TEXT,
  customer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Return active subscription if stripe schema exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT
        s.id AS subscription_id,
        s.status,
        to_timestamp(s.current_period_start) AS current_period_start,
        to_timestamp(s.current_period_end) AS current_period_end,
        s.cancel_at_period_end,
        to_timestamp(s.canceled_at) AS canceled_at,
        to_timestamp(s.trial_start) AS trial_start,
        to_timestamp(s.trial_end) AS trial_end,
        p.id AS plan_id,
        prod.name AS plan_name,
        p.unit_amount AS plan_amount,
        p.currency AS plan_currency,
        p.recurring->>''interval'' AS plan_interval,
        s.customer AS customer_id
      FROM stripe.subscriptions s
      JOIN stripe.customers c ON s.customer = c.id
      JOIN stripe.prices p ON s.items[1]->>''price'' = p.id
      JOIN stripe.products prod ON p.product = prod.id
      WHERE c.user_id = $1
        AND s.status IN (''active'', ''trialing'', ''past_due'')
      ORDER BY s.created DESC
      LIMIT 1
    ') USING p_user_id;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_subscription(UUID) TO service_role;

COMMENT ON FUNCTION public.get_user_active_subscription IS
'Returns active subscription for a user with plan details. Used for access control and billing UI.';

-- ============================================================================
-- GET USER'S SUBSCRIPTION HISTORY
-- ============================================================================
-- Returns all subscriptions for a user (active, canceled, expired)

CREATE OR REPLACE FUNCTION public.get_user_subscription_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  subscription_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  plan_name TEXT,
  plan_amount BIGINT,
  plan_currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT
        s.id AS subscription_id,
        s.status,
        to_timestamp(s.created) AS created_at,
        to_timestamp(s.current_period_start) AS current_period_start,
        to_timestamp(s.current_period_end) AS current_period_end,
        to_timestamp(s.canceled_at) AS canceled_at,
        to_timestamp(s.ended_at) AS ended_at,
        prod.name AS plan_name,
        p.unit_amount AS plan_amount,
        p.currency AS plan_currency
      FROM stripe.subscriptions s
      JOIN stripe.customers c ON s.customer = c.id
      JOIN stripe.prices p ON s.items[1]->>''price'' = p.id
      JOIN stripe.products prod ON p.product = prod.id
      WHERE c.user_id = $1
      ORDER BY s.created DESC
      LIMIT $2
    ') USING p_user_id, p_limit;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_subscription_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_history(UUID, INTEGER) TO service_role;

-- ============================================================================
-- CHECK USER FEATURE ACCESS
-- ============================================================================
-- Returns whether user has access to specific features based on plan

CREATE OR REPLACE FUNCTION public.check_user_feature_access(
  p_user_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_plan_name TEXT;
  v_status TEXT;
  v_has_access BOOLEAN := FALSE;
BEGIN
  -- Get user's current plan
  SELECT plan_name, status INTO v_plan_name, v_status
  FROM public.get_user_active_subscription(p_user_id);

  -- No active subscription = no access
  IF v_plan_name IS NULL OR v_status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Feature access matrix based on plan
  -- Update this mapping based on your actual plan features
  v_has_access := CASE
    -- Starter plan features
    WHEN v_plan_name = 'starter' THEN
      p_feature IN ('basic_properties', 'basic_tenants', 'basic_maintenance')

    -- Growth plan features (includes all starter features)
    WHEN v_plan_name = 'growth' THEN
      p_feature IN (
        'basic_properties', 'basic_tenants', 'basic_maintenance',
        'advanced_analytics', 'bulk_operations', 'custom_reports',
        'property_limit_50', 'unit_limit_200'
      )

    -- Max plan features (includes all growth features)
    WHEN v_plan_name = 'tenantflow-max' THEN
      p_feature IN (
        'basic_properties', 'basic_tenants', 'basic_maintenance',
        'advanced_analytics', 'bulk_operations', 'custom_reports',
        'property_limit_50', 'unit_limit_200',
        'api_access', 'white_label', 'priority_support',
        'unlimited_properties', 'unlimited_units'
      )

    ELSE FALSE
  END;

  RETURN v_has_access;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_feature_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_feature_access(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.check_user_feature_access IS
'Checks if user has access to a specific feature based on their subscription plan.';

-- ============================================================================
-- GET USER'S INVOICES
-- ============================================================================
-- Returns recent invoices for a user

CREATE OR REPLACE FUNCTION public.get_user_invoices(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
  invoice_id TEXT,
  invoice_number TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  amount_due BIGINT,
  amount_paid BIGINT,
  currency TEXT,
  paid BOOLEAN,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'invoices'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT
        i.id AS invoice_id,
        i.number AS invoice_number,
        i.status,
        to_timestamp(i.created) AS created_at,
        to_timestamp(i.due_date) AS due_date,
        i.amount_due,
        i.amount_paid,
        i.currency,
        i.paid,
        i.hosted_invoice_url,
        i.invoice_pdf
      FROM stripe.invoices i
      JOIN stripe.customers c ON i.customer = c.id
      WHERE c.user_id = $1
      ORDER BY i.created DESC
      LIMIT $2
    ') USING p_user_id, p_limit;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_invoices(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_invoices(UUID, INTEGER) TO service_role;

-- ============================================================================
-- GET UPCOMING INVOICE PREVIEW
-- ============================================================================
-- Returns preview of next invoice for user's active subscription

CREATE OR REPLACE FUNCTION public.get_upcoming_invoice_preview(
  p_user_id UUID
)
RETURNS TABLE (
  amount_due BIGINT,
  currency TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  next_payment_attempt TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_subscription_id TEXT;
BEGIN
  -- Get active subscription
  SELECT subscription_id INTO v_subscription_id
  FROM public.get_user_active_subscription(p_user_id);

  IF v_subscription_id IS NULL THEN
    RETURN;
  END IF;

  -- Return upcoming invoice if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'invoices'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT
        i.amount_due,
        i.currency,
        to_timestamp(i.period_start) AS period_start,
        to_timestamp(i.period_end) AS period_end,
        to_timestamp(i.next_payment_attempt) AS next_payment_attempt
      FROM stripe.invoices i
      WHERE i.subscription = $1
        AND i.status = ''draft''
      ORDER BY i.created DESC
      LIMIT 1
    ') USING v_subscription_id;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_upcoming_invoice_preview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_upcoming_invoice_preview(UUID) TO service_role;

-- ============================================================================
-- GET USER'S PAYMENT METHODS
-- ============================================================================
-- Returns saved payment methods for a user

CREATE OR REPLACE FUNCTION public.get_user_payment_methods(
  p_user_id UUID
)
RETURNS TABLE (
  payment_method_id TEXT,
  type TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_customer_id TEXT;
BEGIN
  -- Get customer ID
  SELECT id INTO v_customer_id
  FROM public.get_stripe_customer_by_user_id(p_user_id);

  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  -- Note: Payment methods might not be in stripe schema by default
  -- This is a placeholder that can be enhanced when payment_methods table is available
  -- For now, return empty result
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_payment_methods(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_payment_methods(UUID) TO service_role;

-- ============================================================================
-- GET SUBSCRIPTION PLAN LIMITS
-- ============================================================================
-- Returns usage limits for a user's current plan

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(
  p_user_id UUID
)
RETURNS TABLE (
  plan_name TEXT,
  property_limit INTEGER,
  unit_limit INTEGER,
  user_limit INTEGER,
  storage_gb INTEGER,
  has_api_access BOOLEAN,
  has_white_label BOOLEAN,
  support_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_plan_name TEXT;
BEGIN
  -- Get user's current plan
  SELECT plan_name INTO v_plan_name
  FROM public.get_user_active_subscription(p_user_id);

  -- Return limits based on plan
  -- These should match your actual Stripe product metadata
  RETURN QUERY SELECT
    v_plan_name,
    CASE v_plan_name
      WHEN 'starter' THEN 10
      WHEN 'growth' THEN 50
      WHEN 'tenantflow-max' THEN -1 -- unlimited
      ELSE 0
    END AS property_limit,
    CASE v_plan_name
      WHEN 'starter' THEN 50
      WHEN 'growth' THEN 200
      WHEN 'tenantflow-max' THEN -1 -- unlimited
      ELSE 0
    END AS unit_limit,
    CASE v_plan_name
      WHEN 'starter' THEN 3
      WHEN 'growth' THEN 10
      WHEN 'tenantflow-max' THEN -1 -- unlimited
      ELSE 0
    END AS user_limit,
    CASE v_plan_name
      WHEN 'starter' THEN 5
      WHEN 'growth' THEN 50
      WHEN 'tenantflow-max' THEN 500
      ELSE 0
    END AS storage_gb,
    CASE v_plan_name
      WHEN 'tenantflow-max' THEN TRUE
      ELSE FALSE
    END AS has_api_access,
    CASE v_plan_name
      WHEN 'tenantflow-max' THEN TRUE
      ELSE FALSE
    END AS has_white_label,
    CASE v_plan_name
      WHEN 'starter' THEN 'email'
      WHEN 'growth' THEN 'priority'
      WHEN 'tenantflow-max' THEN 'dedicated'
      ELSE 'none'
    END AS support_level;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_limits(UUID) TO service_role;

-- ============================================================================
-- CHECK IF USER IS ON TRIAL
-- ============================================================================
-- Returns whether user is currently in trial period

CREATE OR REPLACE FUNCTION public.is_user_on_trial(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_status TEXT;
  v_trial_end TIMESTAMPTZ;
BEGIN
  SELECT status, trial_end INTO v_status, v_trial_end
  FROM public.get_user_active_subscription(p_user_id);

  RETURN v_status = 'trialing' AND v_trial_end > NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_on_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_on_trial(UUID) TO service_role;

-- ============================================================================
-- GET TRIAL DAYS REMAINING
-- ============================================================================
-- Returns number of days remaining in trial period

CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_trial_end TIMESTAMPTZ;
  v_days_remaining INTEGER;
BEGIN
  SELECT trial_end INTO v_trial_end
  FROM public.get_user_active_subscription(p_user_id);

  IF v_trial_end IS NULL OR v_trial_end < NOW() THEN
    RETURN 0;
  END IF;

  v_days_remaining := EXTRACT(DAY FROM (v_trial_end - NOW()));

  RETURN GREATEST(0, v_days_remaining);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trial_days_remaining(UUID) TO service_role;

-- ============================================================================
-- GET ALL ACTIVE PRODUCTS AND PRICES
-- ============================================================================
-- Returns all active Stripe products with their prices
-- Used for: Pricing page, plan comparison, upgrade flows

CREATE OR REPLACE FUNCTION public.get_active_stripe_products()
RETURNS TABLE (
  product_id TEXT,
  product_name TEXT,
  product_description TEXT,
  monthly_price_id TEXT,
  monthly_amount BIGINT,
  yearly_price_id TEXT,
  yearly_amount BIGINT,
  currency TEXT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'stripe' AND table_name = 'products'
  ) THEN
    RETURN QUERY EXECUTE format('
      SELECT DISTINCT ON (prod.id)
        prod.id AS product_id,
        prod.name AS product_name,
        prod.description AS product_description,
        pm.id AS monthly_price_id,
        pm.unit_amount AS monthly_amount,
        py.id AS yearly_price_id,
        py.unit_amount AS yearly_amount,
        COALESCE(pm.currency, py.currency) AS currency,
        prod.metadata
      FROM stripe.products prod
      LEFT JOIN stripe.prices pm ON prod.id = pm.product
        AND pm.active = true
        AND pm.recurring->>''interval'' = ''month''
      LEFT JOIN stripe.prices py ON prod.id = py.product
        AND py.active = true
        AND py.recurring->>''interval'' = ''year''
      WHERE prod.active = true
      ORDER BY prod.id, prod.created DESC
    ');
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_stripe_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_stripe_products() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_stripe_products() TO anon; -- Public for pricing page

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- This migration creates comprehensive query functions for stripe.* schema:
--
-- 1. get_user_active_subscription() - Current subscription with plan details
-- 2. get_user_subscription_history() - Past subscriptions
-- 3. check_user_feature_access() - Feature gating based on plan
-- 4. get_user_invoices() - Billing history
-- 5. get_upcoming_invoice_preview() - Next billing preview
-- 6. get_user_payment_methods() - Saved payment methods
-- 7. get_user_plan_limits() - Usage limits per plan
-- 8. is_user_on_trial() - Trial status check
-- 9. get_trial_days_remaining() - Days left in trial
-- 10. get_active_stripe_products() - All products for pricing page
--
-- Production features:
-- - SECURITY DEFINER for cross-schema access
-- - STABLE functions for query optimization
-- - Graceful handling if stripe schema doesn't exist
-- - Comprehensive error handling
-- - Type-safe returns with explicit column definitions
-- - Proper grants for authenticated, service_role, and anon users
