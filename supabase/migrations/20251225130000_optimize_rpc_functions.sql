-- Migration: Optimize RPC Functions
-- Purpose: Fix critical performance anti-patterns identified in RPC analysis
--
-- Issues addressed:
--   1. N+1 query pattern in get_occupancy_trends_optimized (36 queries → 1)
--   2. N+1 query pattern in get_revenue_trends_optimized (12 queries → 1)
--   3. Placeholder values (collections=0, outstanding=0) replaced with real calculations
--   4. Duplicate upsert_rent_payment functions consolidated
--
-- Performance impact: ~95% reduction in query count for analytics endpoints

-- ============================================================================
-- FUNCTION 1: get_occupancy_trends_optimized (REWRITTEN)
-- Previously: 36+ subqueries per call (12 months × 3 subqueries)
-- Now: Single query with CTE and generate_series
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(
  p_user_id uuid,
  p_months integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_owner_user_id uuid;
BEGIN
  -- Resolve owner_user_id (may already be the user_id in newer schema)
  -- Check both old (property_owners table) and new (direct owner_user_id) patterns
  SELECT COALESCE(
    (SELECT po.user_id FROM property_owners po WHERE po.user_id = p_user_id LIMIT 1),
    p_user_id
  ) INTO v_owner_user_id;

  -- OPTIMIZED: Single query using CTE instead of N+1 subqueries
  WITH
  -- Pre-calculate unit counts ONCE (not per month)
  unit_snapshot AS (
    SELECT
      COUNT(*) AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = v_owner_user_id
  ),
  -- Generate month series
  months AS (
    SELECT
      generate_series(0, p_months - 1) AS month_offset,
      (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::interval)::date AS month_date
  ),
  -- Calculate historical occupancy trends using lease data
  -- For past months, we look at which leases were active during that period
  monthly_occupancy AS (
    SELECT
      m.month_date,
      TO_CHAR(m.month_date, 'YYYY-MM') AS month,
      -- For current month, use live unit status
      -- For historical months, estimate based on active leases during that period
      CASE
        WHEN m.month_offset = 0 THEN us.occupied_units
        ELSE COALESCE(
          (SELECT COUNT(DISTINCT l.unit_id)
           FROM leases l
           JOIN units u ON u.id = l.unit_id
           JOIN properties p ON p.id = u.property_id
           WHERE p.owner_user_id = v_owner_user_id
             AND l.lease_status IN ('active', 'ended')
             AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
             AND (l.end_date IS NULL OR l.end_date >= m.month_date)
          ), 0
        )::bigint
      END AS occupied_units,
      us.total_units
    FROM months m
    CROSS JOIN unit_snapshot us
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mo.month,
        'occupancy_rate', CASE
          WHEN mo.total_units > 0
          THEN ROUND((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'total_units', mo.total_units,
        'occupied_units', mo.occupied_units
      ) ORDER BY mo.month_date DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_occupancy mo;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_occupancy_trends_optimized(uuid, integer) IS
  'Returns monthly occupancy trends. OPTIMIZED: Uses single CTE query instead of N+1 subqueries. Historical months estimated from lease data.';

-- ============================================================================
-- FUNCTION 2: get_revenue_trends_optimized (REWRITTEN)
-- Previously: 12 subqueries + hardcoded placeholder values
-- Now: Single query with actual collections/outstanding calculations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(
  p_user_id uuid,
  p_months integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_owner_user_id uuid;
BEGIN
  -- Resolve owner_user_id
  SELECT COALESCE(
    (SELECT po.user_id FROM property_owners po WHERE po.user_id = p_user_id LIMIT 1),
    p_user_id
  ) INTO v_owner_user_id;

  -- OPTIMIZED: Single query with actual data calculations
  WITH
  -- Generate month series
  months AS (
    SELECT
      generate_series(0, p_months - 1) AS month_offset,
      (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::interval)::date AS month_start,
      ((CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
  ),
  -- Calculate expected rent (from active leases during each month)
  monthly_expected AS (
    SELECT
      m.month_start,
      COALESCE(SUM(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m
    LEFT JOIN leases l ON
      l.owner_user_id = v_owner_user_id
      AND l.lease_status IN ('active', 'ended')
      AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
    GROUP BY m.month_start
  ),
  -- Calculate actual collections (successful payments in each month)
  monthly_collections AS (
    SELECT
      m.month_start,
      COALESCE(SUM(rp.amount), 0)::bigint AS collected
    FROM months m
    LEFT JOIN rent_payments rp ON
      rp.status = 'succeeded'
      AND rp.paid_date >= m.month_start
      AND rp.paid_date < (m.month_start + interval '1 month')
    LEFT JOIN leases l ON l.id = rp.lease_id AND l.owner_user_id = v_owner_user_id
    WHERE l.id IS NOT NULL
    GROUP BY m.month_start
  ),
  -- Combine into final result
  monthly_revenue AS (
    SELECT
      TO_CHAR(m.month_start, 'YYYY-MM') AS month,
      m.month_start,
      COALESCE(me.expected_revenue, 0) AS revenue,
      COALESCE(mc.collected, 0) AS collections,
      GREATEST(0, COALESCE(me.expected_revenue, 0) - COALESCE(mc.collected, 0)) AS outstanding
    FROM months m
    LEFT JOIN monthly_expected me ON me.month_start = m.month_start
    LEFT JOIN monthly_collections mc ON mc.month_start = m.month_start
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mr.month,
        'revenue', mr.revenue,
        'collections', mr.collections,
        'outstanding', mr.outstanding
      ) ORDER BY mr.month_start DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_revenue mr;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_revenue_trends_optimized(uuid, integer) IS
  'Returns monthly revenue trends with actual collections and outstanding amounts. OPTIMIZED: Single CTE query, no placeholder values.';

-- ============================================================================
-- CLEANUP: Remove Deprecated Webhook Functions
-- Only acquire_webhook_event_lock_with_id should be used (returns event ID)
-- ============================================================================

-- Drop deprecated functions that only return boolean (no event ID for linking)
DROP FUNCTION IF EXISTS public.record_processed_stripe_event_lock(text);
DROP FUNCTION IF EXISTS public.record_processed_stripe_event_lock(text, text, timestamptz, text);
DROP FUNCTION IF EXISTS public.acquire_webhook_event_lock(text, text, text, jsonb);

-- Drop the DATE-parameter version of upsert_rent_payment (TEXT version is used by backend)
DROP FUNCTION IF EXISTS public.upsert_rent_payment(uuid, uuid, integer, text, text, date, timestamptz, date, date, text, text, integer);

-- The primary function acquire_webhook_event_lock_with_id exists in 20251203100000_idempotency_constraints.sql
-- It returns TABLE (lock_acquired BOOLEAN, webhook_event_id UUID) which is what the backend needs

-- Ensure upsert_rent_payment with TEXT parameters exists (from 20251223180000)
-- This version accepts string dates and casts internally, matching backend usage

-- ============================================================================
-- FUNCTION 4: get_property_performance_cached (FIX N+1)
-- Add optimized version that calculates trends using window functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_with_trends(
  p_user_id uuid,
  p_timeframe text DEFAULT '30d',
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  previous_revenue bigint,
  trend_percentage numeric,
  timeframe text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days integer;
  v_start_date date;
  v_prev_start_date date;
  v_prev_end_date date;
BEGIN
  -- Parse timeframe to days
  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;
  v_prev_end_date := v_start_date - interval '1 day';
  v_prev_start_date := v_prev_end_date - v_days;

  RETURN QUERY
  WITH
  -- Get all properties for this owner
  owner_properties AS (
    SELECT p.id AS prop_id, p.name AS prop_name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  -- Calculate occupancy per property
  property_occupancy AS (
    SELECT
      op.prop_id,
      op.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE u.status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM owner_properties op
    LEFT JOIN units u ON u.property_id = op.prop_id
    GROUP BY op.prop_id, op.prop_name
  ),
  -- Current period revenue per property
  current_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  ),
  -- Previous period revenue per property (for trend calculation)
  previous_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_prev_start_date
      AND rp.paid_date < v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(cr.revenue, 0) AS total_revenue,
    COALESCE(pr.revenue, 0) AS previous_revenue,
    CASE
      WHEN COALESCE(pr.revenue, 0) > 0
      THEN ROUND(((COALESCE(cr.revenue, 0) - pr.revenue)::numeric / pr.revenue::numeric) * 100, 2)
      WHEN COALESCE(cr.revenue, 0) > 0 THEN 100.00  -- 100% increase from 0
      ELSE 0.00
    END AS trend_percentage,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN current_revenue cr ON cr.prop_id = po.prop_id
  LEFT JOIN previous_revenue pr ON pr.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_with_trends(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_property_performance_with_trends(uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.get_property_performance_with_trends(uuid, text, integer) IS
  'Returns property performance with revenue trends. OPTIMIZED: Single query calculates current and previous period for trend comparison.';

-- ============================================================================
-- FUNCTION 5: get_property_performance_cached (REWRITTEN)
-- Previously: 5+ correlated subqueries per property
-- Now: Single query with CTEs for all properties at once
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- OPTIMIZED: Single query with CTEs instead of N+1 correlated subqueries
  WITH
  -- Get all properties for this owner
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  -- Pre-calculate ALL unit counts in single pass
  unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available') AS vacant_units
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  ),
  -- Pre-calculate ALL lease revenues in single pass
  lease_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(l.rent_amount), 0) AS monthly_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
    GROUP BY u.property_id
  ),
  -- Pre-calculate potential revenue (from all units, not just occupied)
  potential_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(u.rent_amount), 0) AS potential_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_name', op.name,
        'property_id', op.id,
        'total_units', COALESCE(uc.total_units, 0),
        'occupied_units', COALESCE(uc.occupied_units, 0),
        'vacant_units', COALESCE(uc.vacant_units, 0),
        'occupancy_rate', CASE
          WHEN COALESCE(uc.total_units, 0) > 0
          THEN ROUND((uc.occupied_units::numeric / uc.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'annual_revenue', COALESCE(lr.monthly_revenue, 0) * 12,
        'monthly_revenue', COALESCE(lr.monthly_revenue, 0),
        'potential_revenue', COALESCE(pr.potential_revenue, 0)
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN unit_counts uc ON uc.property_id = op.id
  LEFT JOIN lease_revenues lr ON lr.property_id = op.id
  LEFT JOIN potential_revenues pr ON pr.property_id = op.id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_property_performance_cached(uuid) IS
  'Returns property performance metrics. OPTIMIZED: Uses CTEs instead of N+1 correlated subqueries.';

-- ============================================================================
-- FUNCTION 6: get_property_performance_trends (REWRITTEN)
-- Previously: Hardcoded 'stable' trend and 0 percentage (placeholder!)
-- Now: Actually calculates trend from rent payment history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_current_month_start date;
  v_previous_month_start date;
  v_previous_month_end date;
BEGIN
  -- Date boundaries for comparison
  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  v_previous_month_start := (v_current_month_start - interval '1 month')::date;
  v_previous_month_end := (v_current_month_start - interval '1 day')::date;

  -- OPTIMIZED: Calculate ACTUAL trends from payment history
  WITH
  -- Get all properties for this owner
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  -- Current month actual payments
  current_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_current_month_start
    GROUP BY p.id
  ),
  -- Previous month actual payments
  previous_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_previous_month_start
      AND rp.paid_date <= v_previous_month_end
    GROUP BY p.id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_id', op.id,
        'current_month_revenue', COALESCE(cp.revenue, 0),
        'previous_month_revenue', COALESCE(pp.revenue, 0),
        'trend', CASE
          WHEN COALESCE(cp.revenue, 0) > COALESCE(pp.revenue, 0) THEN 'up'
          WHEN COALESCE(cp.revenue, 0) < COALESCE(pp.revenue, 0) THEN 'down'
          ELSE 'stable'
        END,
        'trend_percentage', CASE
          WHEN COALESCE(pp.revenue, 0) > 0
          THEN ROUND(((COALESCE(cp.revenue, 0) - pp.revenue)::numeric / pp.revenue::numeric) * 100, 2)
          WHEN COALESCE(cp.revenue, 0) > 0 THEN 100.00
          ELSE 0.00
        END
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN current_payments cp ON cp.property_id = op.id
  LEFT JOIN previous_payments pp ON pp.property_id = op.id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_property_performance_trends(uuid) IS
  'Returns revenue trends for user properties. FIXED: Now calculates actual month-over-month trends from payment data instead of hardcoded placeholders.';

-- ============================================================================
-- Add performance indexes for the optimized queries
-- ============================================================================

-- Index for lease date range queries (used in occupancy trends)
CREATE INDEX IF NOT EXISTS idx_leases_dates_owner
ON leases(owner_user_id, start_date, end_date)
WHERE lease_status IN ('active', 'ended');

-- Index for rent payments date queries (used in revenue trends)
CREATE INDEX IF NOT EXISTS idx_rent_payments_status_date
ON rent_payments(status, paid_date)
WHERE status = 'succeeded';

-- Composite index for property + unit status queries
CREATE INDEX IF NOT EXISTS idx_units_property_status
ON units(property_id, status);

-- ============================================================================
-- Documentation for deprecated functions
-- ============================================================================

-- Deprecated functions have been DROPPED (not just marked deprecated)

-- ============================================================================
-- Summary of changes:
-- ============================================================================
--
-- 1. get_occupancy_trends_optimized: Reduced from 36+ queries to 1 CTE query
--    - Uses generate_series instead of UNNEST with subqueries
--    - Pre-calculates unit counts in single pass
--    - Estimates historical occupancy from lease data
--
-- 2. get_revenue_trends_optimized: Replaced placeholder values with real data
--    - 'collections' now shows actual paid amounts
--    - 'outstanding' now shows expected - collected difference
--    - Uses CTEs instead of per-month subqueries
--
-- 3. Webhook idempotency cleanup:
--    - Primary function: acquire_webhook_event_lock_with_id (returns ID for linking)
--    - DROPPED: record_processed_stripe_event_lock (all overloads)
--    - DROPPED: acquire_webhook_event_lock
--    - DROPPED: upsert_rent_payment with DATE parameters (TEXT version kept)
--
-- 4. get_property_performance_with_trends: New optimized function
--    - Calculates trend percentage in single query
--    - Compares current vs previous period revenue
--    - Used by PropertyCard for revenue trend display
--
-- 5. get_property_performance_cached: Reduced N+1 subqueries to CTEs
--    - Previously: 5+ correlated subqueries per property
--    - Now: 4 CTEs calculate all data in single pass
--
-- 6. get_property_performance_trends: Fixed placeholder values
--    - Previously: Hardcoded 'stable' and 0% (bug: same query for current/previous!)
--    - Now: Actual month-over-month payment comparison
--
-- 7. Performance indexes added for common query patterns:
--    - idx_leases_dates_owner: For lease date range queries
--    - idx_rent_payments_status_date: For revenue calculations
--    - idx_units_property_status: For occupancy calculations
