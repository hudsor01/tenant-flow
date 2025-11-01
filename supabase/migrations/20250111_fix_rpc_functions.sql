-- Migration: Fix RPC functions for subscription and dashboard
-- Date: 2025-01-11
-- Issues Fixed:
-- 1. get_user_active_subscription: Fix attrs JSONB access for Stripe schema
-- 2. get_dashboard_stats: Create wrapper function with correct signature

-- ============================================================================
-- 1. Fix get_user_active_subscription to use attrs JSONB properly
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_active_subscription(uuid);

CREATE OR REPLACE FUNCTION public.get_user_active_subscription(p_user_id uuid)
RETURNS TABLE(
  subscription_id text,
  status text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  plan_id text,
  plan_name text,
  plan_amount bigint,
  plan_currency text,
  plan_interval text,
  customer_id text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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
        COALESCE((s.attrs->>''cancel_at_period_end'')::boolean, false) AS cancel_at_period_end,
        to_timestamp(s.canceled_at) AS canceled_at,
        to_timestamp(s.trial_start) AS trial_start,
        to_timestamp(s.trial_end) AS trial_end,
        -- Extract price ID from attrs->items array
        -- Note: We currently support both nested objects and string IDs.
        -- Consider periodically running the diagnostic query below to confirm data shape:
        -- SELECT COUNT(*) AS count,
        --   CASE
        --     WHEN s.attrs->'items'->0->'price'->'id' IS NOT NULL THEN 'nested_object'
        --     ELSE 'string_id'
        --   END AS format
        -- FROM stripe.subscriptions s
        -- GROUP BY format;
        COALESCE(
          s.attrs->''items''->0->''price''->''id'',
          s.attrs->''items''->0->>''price''
        )::text AS plan_id,
        -- Get plan name from product
        COALESCE(prod.name, ''Unknown Plan'') AS plan_name,
        -- Get plan amount from price
        COALESCE(p.unit_amount, 0) AS plan_amount,
        COALESCE(p.currency, ''usd'') AS plan_currency,
        COALESCE(p.recurring->>''interval'', ''month'') AS plan_interval,
        s.customer AS customer_id
      FROM stripe.subscriptions s
      JOIN stripe.customers c ON s.customer = c.id
      -- Join price using extracted ID from attrs
      -- (Uses same dual-access pattern as plan_id; see diagnostic comment above.)
      LEFT JOIN stripe.prices p ON p.id = COALESCE(
        s.attrs->''items''->0->''price''->''id'',
        s.attrs->''items''->0->>''price''
      )::text
      -- Join product from price
      LEFT JOIN stripe.products prod ON p.product = prod.id
      WHERE c.user_id = $1
        AND s.status IN (''active'', ''trialing'', ''past_due'')
      ORDER BY s.current_period_end DESC
      LIMIT 1
    ') USING p_user_id;
  END IF;

  RETURN;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_active_subscription(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_active_subscription IS 'Get active subscription for user - uses attrs JSONB to extract Stripe subscription items';

-- ============================================================================
-- 2. Create get_dashboard_stats wrapper function
-- ============================================================================
-- DEPENDENCY: Requires get_dashboard_stats_optimized function created in migration:
-- 20250111_create_dashboard_stats_optimized.sql (executed before this file)
--
-- This wrapper provides backward compatibility for the backend which calls
-- get_dashboard_stats(user_id) with a single parameter. It delegates to the
-- optimized version passing the user_id to both parameters.
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(user_id_param text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the optimized version with both required parameters
  -- The optimized function expects internal_user_id and supabase_auth_id
  -- For backward compatibility, we pass user_id_param to both
  SELECT get_dashboard_stats_optimized(user_id_param, user_id_param) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(text) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_stats IS 'Wrapper function for backward compatibility - delegates to get_dashboard_stats_optimized';

-- ============================================================================
-- Verification queries (commented out - uncomment to test)
-- ============================================================================

-- Test subscription function
-- SELECT * FROM public.get_user_active_subscription('YOUR_USER_UUID_HERE');

-- Test dashboard stats function
-- SELECT public.get_dashboard_stats('YOUR_USER_ID_HERE');
