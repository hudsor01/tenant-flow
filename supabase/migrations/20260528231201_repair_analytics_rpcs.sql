-- Repair the 8 analytics RPCs that were broken when rent_payments was
-- demolished in 20260418140000_demolish_rent_and_tenant_portal. Each
-- function survived in pg_catalog (LANGUAGE plpgsql lazy validation)
-- but was silently returning empty/zero whenever the body reached a
-- rent_payments query, because the relation no longer exists.
--
-- Strategy (per the canonical product direction):
--   - Keep all leases-derived logic intact -- public.leases.rent_amount
--     is the canonical billing source for the landlord-only product.
--   - Replace every rent_payments query with a literal 0 / empty array
--     so the function bodies no longer reference a dropped relation.
--   - Preserve every function signature + return shape so all existing
--     frontend callers (3-14 each) continue to work without changes.
--
-- Fields that used to come from rent_payments now return 0 and the
-- inline comments document why. Removing those fields entirely from
-- the return shapes would be a breaking change for callers; that's
-- tracked as a separate follow-up after the product confirms whether
-- the affected dashboards still surface those fields.
--
-- The Stripe Foreign Data Wrapper (PR #753) is intentionally NOT used
-- here. Those foreign tables are for the landlord's own TenantFlow
-- SaaS subscription billing, which is a different concern from the
-- landlord's rental-income analytics that these 8 RPCs surface.
--
-- Issue #749 root-cause cleanup, part 4 of 4:
--   ✅ PR #751: drop dead stripe.* regular tables
--   ✅ PR #752: drop 4 dead rent_payments-dependent RPCs
--   ✅ PR #753: install canonical Stripe Wrapper for future use
--   ✅ THIS PR: repair the 8 live-but-damaged analytics RPCs

-- ============================================================================
-- 1. get_billing_insights -- 14 callers (billing dashboard MRR/churn)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_billing_insights(
  owner_id_param uuid,
  start_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone,
  end_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_mrr numeric;
  v_total_revenue numeric;
  v_active_leases integer;
  v_expired_leases integer;
  v_tenant_count integer;
BEGIN
  IF owner_id_param != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount), 0) INTO v_mrr
  FROM leases
  WHERE owner_user_id = owner_id_param
    AND lease_status = 'active';

  v_total_revenue := v_mrr * 12;

  SELECT
    count(*) FILTER (WHERE lease_status = 'active'),
    count(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_active_leases, v_expired_leases
  FROM leases
  WHERE owner_user_id = owner_id_param;

  SELECT count(DISTINCT l.primary_tenant_id) INTO v_tenant_count
  FROM leases l
  WHERE l.owner_user_id = owner_id_param
    AND l.lease_status = 'active';

  -- unpaidTotal/unpaidCount/lateFeeTotal previously aggregated from
  -- public.rent_payments. That table was demolished with the rent-
  -- collection facilitation feature; these fields now return 0. Removing
  -- the keys would break 14 frontend callers, so they stay as zero
  -- pending a separate breaking-change PR.
  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'mrr', v_mrr,
    'churnRate', CASE
      WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0
    END,
    'unpaidTotal', 0,
    'unpaidCount', 0,
    'lateFeeTotal', 0,
    'tenantCount', v_tenant_count
  );

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 2. get_invoice_statistics -- 3 callers
-- ============================================================================
-- The entire body queried rent_payments grouped by status. With rent
-- payments gone, the function returns an empty array. Callers still
-- get a valid jsonb shape.
CREATE OR REPLACE FUNCTION public.get_invoice_statistics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- Previously aggregated rent_payments by status. Returns empty array
  -- now that the rent-collection feature is gone.
  RETURN '[]'::jsonb;
END;
$function$;

-- ============================================================================
-- 3. calculate_monthly_metrics -- 3 callers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- 12-month series with monthly expenses from public.expenses (live)
  -- and revenue zeroed out since rent_payments is gone. The frontend
  -- shape stays the same; net_income/cash_flow become -expenses.
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'revenue', 0,
      'expenses', coalesce(expenses, 0),
      'net_income', -coalesce(expenses, 0),
      'cash_flow', -coalesce(expenses, 0)
    )
    ORDER BY month_date
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date AS month_date
  ) months
  LEFT JOIN LATERAL (
    SELECT sum(e.amount) AS expenses
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.owner_user_id = p_user_id
      AND e.status <> 'inactive'
      AND date_trunc('month', e.expense_date) = months.month_date
  ) exp ON true;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 4. get_financial_overview -- 8 callers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_financial_overview(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_revenue    numeric;
  v_total_expenses   numeric;
  v_net_income       numeric;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount) * 12, 0) INTO v_total_revenue
  FROM leases
  WHERE owner_user_id = p_user_id
    AND lease_status = 'active';

  SELECT coalesce(sum(e.amount), 0) INTO v_total_expenses
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  JOIN units u ON u.id = mr.unit_id
  JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id
    AND e.status <> 'inactive'
    AND e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  -- accounts_receivable previously aggregated unpaid rent_payments;
  -- returns 0 now that the rent-collection feature is gone.
  RETURN jsonb_build_object(
    'overview', jsonb_build_object(
      'total_revenue',        v_total_revenue,
      'total_expenses',       v_total_expenses,
      'net_income',           v_net_income,
      'accounts_receivable',  0,
      'accounts_payable',     0
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object(
        'label', 'Monthly Revenue',
        'value', v_total_revenue / 12,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Operating Margin',
        'value', CASE
          WHEN v_total_revenue > 0
          THEN round((v_net_income / v_total_revenue * 100)::numeric, 1)
          ELSE 0
        END,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Cash Position',
        'value', v_net_income,
        'trend', null
      )
    )
  );
END;
$function$;

-- ============================================================================
-- 5. get_revenue_trends_optimized -- 13 callers (Phase 4 revenue chart)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(
  p_user_id uuid,
  p_months integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- Monthly series. `revenue` = expected revenue from active leases'
  -- rent_amount (canonical billing source for this product).
  -- `collections` previously summed rent_payments by paid_date; now 0.
  -- `outstanding` = revenue (everything is "outstanding" relative to
  -- zero collections).
  WITH
  months AS (
    SELECT
      (current_date - (gs || ' months')::interval)::date AS month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(0, p_months - 1) gs
  ),
  monthly_expected AS (
    SELECT
      m.month_start,
      coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m
    LEFT JOIN leases l ON
      l.owner_user_id = p_user_id
      AND l.lease_status IN ('active', 'ended')
      AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
    GROUP BY m.month_start
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',       to_char(m.month_start, 'YYYY-MM'),
        'revenue',     coalesce(me.expected_revenue, 0),
        'collections', 0,
        'outstanding', coalesce(me.expected_revenue, 0)
      )
      ORDER BY m.month_start DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM months m
  LEFT JOIN monthly_expected me ON me.month_start = m.month_start;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 6. get_property_performance_analytics -- 9 callers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL::uuid,
  p_timeframe text DEFAULT '30d'::text,
  p_limit integer DEFAULT NULL::integer
)
RETURNS TABLE(
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  total_expenses bigint,
  net_income bigint,
  timeframe text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_start_date date;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;

  -- property_revenue previously aggregated rent_payments per property.
  -- Now returns 0; the expenses CTE stays live.
  RETURN QUERY
  WITH property_units AS (
    SELECT
      p.id AS prop_id,
      p.name AS prop_name,
      u.id AS unit_id,
      u.status AS unit_status
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT
      pu.prop_id,
      pu.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM property_units pu
    GROUP BY pu.prop_id, pu.prop_name
  ),
  property_expenses AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(e.amount), 0)::bigint AS expenses
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id
      AND e.status <> 'inactive'
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    0::bigint AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    -COALESCE(pe.expenses, 0)::bigint AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT COALESCE(p_limit, 100);
END;
$function$;

-- ============================================================================
-- 7. get_property_performance_trends -- 3 callers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- current/previous month revenue previously aggregated rent_payments.
  -- All zeros now; trend defaults to 'stable'.
  WITH owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_id', op.id,
        'current_month_revenue', 0,
        'previous_month_revenue', 0,
        'trend', 'stable',
        'trend_percentage', 0.00
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op;

  RETURN v_result;
END;
$function$;

-- ============================================================================
-- 8. get_property_performance_with_trends -- 8 callers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_property_performance_with_trends(
  p_user_id uuid,
  p_timeframe text DEFAULT '30d'::text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
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
AS $function$
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  -- current/previous revenue previously aggregated rent_payments.
  -- Occupancy stays live; revenue zeros and trend stays at 0.
  RETURN QUERY
  WITH owner_properties AS (
    SELECT p.id AS prop_id, p.name AS prop_name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
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
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    0::bigint AS total_revenue,
    0::bigint AS previous_revenue,
    0.00::numeric AS trend_percentage,
    p_timeframe AS timeframe
  FROM property_occupancy po
  ORDER BY po.prop_name
  LIMIT p_limit;
END;
$function$;
