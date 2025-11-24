-- Fix final JSONB/JSON type mismatches in RPC functions
-- Issue: get_dashboard_time_series and get_billing_insights using json_build_object/json_agg with JSONB return type
-- Solution: Use jsonb_build_object/jsonb_agg consistently

-- Fix get_dashboard_time_series
CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(
  p_user_id UUID,
  p_metric_name TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_date_series DATE[];
BEGIN
  -- Generate array of dates
  SELECT ARRAY(
    SELECT (CURRENT_DATE - generate_series(0, p_days - 1))::DATE
  ) INTO v_date_series;

  -- Return time-series data based on metric type
  -- For now, return simplified data structure (can be enhanced per metric)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date', TO_CHAR(date_val, 'YYYY-MM-DD'),
      'value', 0
    )
  ), '[]'::JSONB) INTO v_result
  FROM UNNEST(v_date_series) AS date_val;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(UUID, TEXT, INTEGER) TO authenticated;

-- Fix get_billing_insights
CREATE OR REPLACE FUNCTION public.get_billing_insights(
  owner_id_param UUID,
  start_date_param TIMESTAMP DEFAULT NULL,
  end_date_param TIMESTAMP DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_revenue NUMERIC;
  v_mrr NUMERIC;
  v_active_leases INTEGER;
  v_expired_leases INTEGER;
BEGIN
  -- Calculate MRR (Monthly Recurring Revenue)
  SELECT COALESCE(SUM(rent_amount), 0) INTO v_mrr
  FROM leases
  WHERE property_owner_id = owner_id_param
  AND lease_status = 'active';

  -- Calculate total revenue (annual)
  v_total_revenue := v_mrr * 12;

  -- Calculate active and expired leases for churn rate
  SELECT
    COUNT(*) FILTER (WHERE lease_status = 'active'),
    COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_active_leases, v_expired_leases
  FROM leases
  WHERE property_owner_id = owner_id_param;

  -- Build result using jsonb_build_object
  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'churnRate', CASE
      WHEN (v_active_leases + v_expired_leases) > 0
      THEN ROUND((v_expired_leases::DECIMAL / (v_active_leases + v_expired_leases)::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'mrr', v_mrr
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_billing_insights(UUID, TIMESTAMP, TIMESTAMP) TO authenticated;
