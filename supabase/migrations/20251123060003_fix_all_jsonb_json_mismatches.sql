-- Fix JSONB/JSON type mismatches in all RPC functions
-- Issue: Using json_agg with json_build_object but storing in JSONB variables and using JSONB literals
-- Solution: Consistently use jsonb_agg and jsonb_build_object throughout

-- Fix get_property_performance_trends
CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- For now, return stable trends (can be enhanced with historical data)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'property_id', p.id,
      'current_month_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases
         WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id)
         AND lease_status = 'active'),
        0
      ),
      'previous_month_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases
         WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id)
         AND lease_status = 'active'),
        0
      ),
      'trend', 'stable',
      'trend_percentage', 0
    )
  ), '[]'::JSONB) INTO v_result
  FROM properties p
  WHERE p.property_owner_id = p_user_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_trends(UUID) TO authenticated;

-- Fix get_occupancy_trends_optimized
CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_month_series DATE[];
  v_month DATE;
BEGIN
  -- Generate array of months
  SELECT ARRAY(
    SELECT (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::INTERVAL)::DATE
  ) INTO v_month_series;

  -- Build occupancy trends (simplified - can be enhanced with historical data)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'occupancy_rate', COALESCE(
        (SELECT ROUND(
          ((SELECT COUNT(*)::DECIMAL FROM units u
            JOIN properties p ON p.id = u.property_id
            WHERE p.property_owner_id = p_user_id
            AND u.status = 'occupied') /
           NULLIF((SELECT COUNT(*)::DECIMAL FROM units u
                   JOIN properties p ON p.id = u.property_id
                   WHERE p.property_owner_id = p_user_id), 0)) * 100,
          2
        )),
        0
      ),
      'total_units', (SELECT COUNT(*) FROM units u
                      JOIN properties p ON p.id = u.property_id
                      WHERE p.property_owner_id = p_user_id),
      'occupied_units', (SELECT COUNT(*) FROM units u
                         JOIN properties p ON p.id = u.property_id
                         WHERE p.property_owner_id = p_user_id
                         AND u.status = 'occupied')
    )
  ), '[]'::JSONB) INTO v_result
  FROM unnest(v_month_series) AS month_date;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(UUID, INTEGER) TO authenticated;

-- Fix get_revenue_trends_optimized
CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_month_series DATE[];
BEGIN
  -- Generate array of months
  SELECT ARRAY(
    SELECT (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::INTERVAL)::DATE
  ) INTO v_month_series;

  -- Build revenue trends (simplified - can be enhanced with historical data)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases
         WHERE property_owner_id = p_user_id
         AND lease_status = 'active'),
        0
      ),
      'collections', 0,
      'outstanding', 0
    )
  ), '[]'::JSONB) INTO v_result
  FROM unnest(v_month_series) AS month_date;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_trends_optimized(UUID, INTEGER) TO authenticated;
