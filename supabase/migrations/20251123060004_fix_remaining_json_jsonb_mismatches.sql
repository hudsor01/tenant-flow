-- Fix remaining JSONB/JSON type mismatches in RPC functions
-- Issue: Multiple functions using json_build_object but storing in JSONB variables
-- Solution: Use jsonb_build_object consistently

-- Fix get_maintenance_analytics
CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_requests INTEGER;
  v_completed_requests INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_requests
  FROM maintenance_requests
  WHERE property_owner_id = user_id;

  SELECT COUNT(*) INTO v_completed_requests
  FROM maintenance_requests
  WHERE property_owner_id = user_id
  AND status = 'completed';

  SELECT jsonb_build_object(
    'avgResolutionTime', COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL),
      0
    ),
    'completionRate', CASE
      WHEN v_total_requests > 0 THEN ROUND((v_completed_requests::DECIMAL / v_total_requests::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', jsonb_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    ),
    'trendsOverTime', '[]'::JSONB
  ) INTO v_result
  FROM maintenance_requests
  WHERE property_owner_id = user_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'avgResolutionTime', 0,
    'completionRate', 0,
    'priorityBreakdown', jsonb_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0),
    'trendsOverTime', '[]'::JSONB
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(UUID) TO authenticated;

-- Fix get_metric_trend
CREATE OR REPLACE FUNCTION public.get_metric_trend(
  p_user_id UUID,
  p_metric_name TEXT,
  p_period TEXT DEFAULT 'month'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_current_value NUMERIC;
  v_previous_value NUMERIC;
BEGIN
  -- Calculate metric based on metric name
  CASE p_metric_name
    WHEN 'monthly_revenue' THEN
      SELECT COALESCE(SUM(rent_amount), 0) INTO v_current_value
      FROM leases
      WHERE property_owner_id = p_user_id
      AND lease_status = 'active';
      v_previous_value := v_current_value;

    WHEN 'active_tenants' THEN
      SELECT COUNT(*) INTO v_current_value
      FROM tenants t
      WHERE EXISTS (
        SELECT 1 FROM leases l
        WHERE l.primary_tenant_id = t.id
        AND l.property_owner_id = p_user_id
        AND l.lease_status = 'active'
      );
      v_previous_value := v_current_value;

    ELSE
      v_current_value := 0;
      v_previous_value := 0;
  END CASE;

  -- Build result using jsonb_build_object
  v_result := jsonb_build_object(
    'current_value', v_current_value,
    'previous_value', v_previous_value,
    'change', v_current_value - v_previous_value,
    'change_percentage', CASE
      WHEN v_previous_value > 0 THEN ROUND(((v_current_value - v_previous_value) / v_previous_value) * 100, 2)
      ELSE 0
    END,
    'trend', CASE
      WHEN v_current_value > v_previous_value THEN 'up'
      WHEN v_current_value < v_previous_value THEN 'down'
      ELSE 'stable'
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_metric_trend(UUID, TEXT, TEXT) TO authenticated;
