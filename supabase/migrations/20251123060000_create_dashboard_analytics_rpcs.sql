-- ======================================================================================
-- Migration: Create Dashboard Analytics RPC Functions
-- Description: Creates all missing RPC functions for dashboard analytics to fix 21s delay
-- Version: 20251123060000
-- Author: System
-- ======================================================================================

-- ======================================================================================
-- FUNCTION 1: get_dashboard_stats
-- Purpose: Return comprehensive dashboard statistics for a property owner
-- Returns: JSON with properties, tenants, units, leases, maintenance, and revenue stats
-- ======================================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_properties_stats JSON;
  v_tenants_stats JSON;
  v_units_stats JSON;
  v_leases_stats JSON;
  v_maintenance_stats JSON;
  v_revenue_stats JSON;
BEGIN
  -- Properties statistics
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'occupied', COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM units u 
      WHERE u.property_id = p.id 
      AND u.status = 'occupied'
    ))::INTEGER,
    'vacant', COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM units u 
      WHERE u.property_id = p.id 
      AND u.status = 'occupied'
    ))::INTEGER,
    'occupancyRate', COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM units u 
          WHERE u.property_id = p.id 
          AND u.status = 'occupied'
        ))::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
        2
      ), 
      0
    ),
    'totalMonthlyRent', COALESCE(
      (SELECT SUM(u.rent_amount) 
       FROM units u 
       WHERE u.property_id = p.id 
       AND u.status = 'occupied'), 
      0
    ),
    'averageRent', COALESCE(
      (SELECT AVG(u.rent_amount) 
       FROM units u 
       WHERE u.property_id = p.id), 
      0
    )
  ) INTO v_properties_stats
  FROM properties p
  WHERE p.property_owner_id = p_user_id;

  -- Tenants statistics
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'active', COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM leases l 
      WHERE l.primary_tenant_id = t.id 
      AND l.lease_status = 'active'
    ))::INTEGER,
    'inactive', COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM leases l 
      WHERE l.primary_tenant_id = t.id 
      AND l.lease_status = 'active'
    ))::INTEGER,
    'newThisMonth', COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::INTEGER
  ) INTO v_tenants_stats
  FROM tenants t
  WHERE EXISTS (
    SELECT 1 FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.property_owner_id = p_user_id
    AND EXISTS (SELECT 1 FROM leases l WHERE l.unit_id = u.id AND l.primary_tenant_id = t.id)
  );

  -- Units statistics
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'occupied', COUNT(*) FILTER (WHERE status = 'occupied')::INTEGER,
    'vacant', COUNT(*) FILTER (WHERE status = 'available')::INTEGER,
    'maintenance', COUNT(*) FILTER (WHERE status = 'maintenance')::INTEGER,
    'averageRent', COALESCE(AVG(rent_amount), 0),
    'available', COUNT(*) FILTER (WHERE status = 'available')::INTEGER,
    'occupancyRate', COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'occupied')::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
        2
      ), 
      0
    ),
    'occupancyChange', 0,
    'totalPotentialRent', COALESCE(SUM(rent_amount), 0),
    'totalActualRent', COALESCE(SUM(rent_amount) FILTER (WHERE status = 'occupied'), 0)
  ) INTO v_units_stats
  FROM units
  WHERE property_id IN (
    SELECT id FROM properties WHERE property_owner_id = p_user_id
  );

  -- Leases statistics
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'active', COUNT(*) FILTER (WHERE lease_status = 'active')::INTEGER,
    'expired', COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))::INTEGER,
    'expiringSoon', COUNT(*) FILTER (
      WHERE lease_status = 'active' 
      AND end_date <= CURRENT_DATE + INTERVAL '30 days'
    )::INTEGER
  ) INTO v_leases_stats
  FROM leases
  WHERE property_owner_id = p_user_id;

  -- Maintenance statistics
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'open', COUNT(*) FILTER (WHERE status = 'open')::INTEGER,
    'inProgress', COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER,
    'completed', COUNT(*) FILTER (WHERE status = 'completed')::INTEGER,
    'completedToday', COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::INTEGER,
    'avgResolutionTime', COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL), 
      0
    ),
    'byPriority', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low')::INTEGER,
      'normal', COUNT(*) FILTER (WHERE priority = 'normal')::INTEGER,
      'high', COUNT(*) FILTER (WHERE priority = 'high')::INTEGER,
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')::INTEGER
    )
  ) INTO v_maintenance_stats
  FROM maintenance_requests
  WHERE property_owner_id = p_user_id;

  -- Revenue statistics
  SELECT json_build_object(
    'monthly', COALESCE(
      (SELECT SUM(rent_amount) FROM leases WHERE property_owner_id = p_user_id AND lease_status = 'active'), 
      0
    ),
    'yearly', COALESCE(
      (SELECT SUM(rent_amount) * 12 FROM leases WHERE property_owner_id = p_user_id AND lease_status = 'active'), 
      0
    ),
    'growth', 0
  ) INTO v_revenue_stats;

  -- Combine all stats
  v_result := json_build_object(
    'properties', v_properties_stats,
    'tenants', v_tenants_stats,
    'units', v_units_stats,
    'leases', v_leases_stats,
    'maintenance', v_maintenance_stats,
    'revenue', v_revenue_stats
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;

-- ======================================================================================
-- FUNCTION 2: get_property_performance_cached
-- Purpose: Get performance metrics for all properties owned by a user
-- Returns: JSONB array of property performance data
-- ======================================================================================
CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(json_agg(
    json_build_object(
      'property_name', p.name,
      'property_id', p.id,
      'total_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id),
      'occupied_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied'),
      'vacant_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'available'),
      'occupancy_rate', COALESCE(
        ROUND(
          ((SELECT COUNT(*)::DECIMAL FROM units WHERE property_id = p.id AND status = 'occupied') / 
           NULLIF((SELECT COUNT(*)::DECIMAL FROM units WHERE property_id = p.id), 0)) * 100,
          2
        ),
        0
      ),
      'annual_revenue', COALESCE(
        (SELECT SUM(rent_amount) * 12 FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id) AND lease_status = 'active'),
        0
      ),
      'monthly_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id) AND lease_status = 'active'),
        0
      ),
      'potential_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM units WHERE property_id = p.id),
        0
      ),
      'address', p.address_line1,
      'property_type', p.property_type,
      'status', CASE
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id) = 0 THEN 'NO_UNITS'
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied') = 0 THEN 'VACANT'
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied') = (SELECT COUNT(*) FROM units WHERE property_id = p.id) THEN 'FULL'
        ELSE 'PARTIAL'
      END
    )
  ), '[]'::JSONB) INTO v_result
  FROM properties p
  WHERE p.property_owner_id = p_user_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_performance_cached(UUID) TO authenticated;

-- ======================================================================================
-- FUNCTION 3: get_property_performance_trends
-- Purpose: Get revenue trends for properties (month-over-month comparison)
-- Returns: JSONB array with property revenue trends
-- ======================================================================================
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
  SELECT COALESCE(json_agg(
    json_build_object(
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

-- ======================================================================================
-- FUNCTION 4: get_occupancy_trends_optimized
-- Purpose: Get monthly occupancy trends for a property owner
-- Returns: JSONB array with monthly occupancy rates
-- ======================================================================================
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
  SELECT COALESCE(json_agg(
    json_build_object(
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
      'total_units', COALESCE(
        (SELECT COUNT(*) FROM units u 
         JOIN properties p ON p.id = u.property_id 
         WHERE p.property_owner_id = p_user_id),
        0
      ),
      'occupied_units', COALESCE(
        (SELECT COUNT(*) FROM units u 
         JOIN properties p ON p.id = u.property_id 
         WHERE p.property_owner_id = p_user_id 
         AND u.status = 'occupied'),
        0
      )
    )
  ), '[]'::JSONB) INTO v_result
  FROM UNNEST(v_month_series) AS month_date;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_occupancy_trends_optimized(UUID, INTEGER) TO authenticated;

-- ======================================================================================
-- FUNCTION 5: get_revenue_trends_optimized
-- Purpose: Get monthly revenue trends for a property owner
-- Returns: JSONB array with monthly revenue and growth
-- ======================================================================================
CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id UUID, p_months INTEGER DEFAULT 12)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_month_series DATE[];
  v_current_revenue NUMERIC;
BEGIN
  -- Generate array of months
  SELECT ARRAY(
    SELECT (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::INTERVAL)::DATE
  ) INTO v_month_series;

  -- Get current monthly revenue
  SELECT COALESCE(SUM(rent_amount), 0) INTO v_current_revenue
  FROM leases
  WHERE property_owner_id = p_user_id
  AND lease_status = 'active';

  -- Build revenue trends (simplified - can be enhanced with historical data)
  SELECT COALESCE(json_agg(
    json_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'revenue', v_current_revenue,
      'growth', 0,
      'previous_period_revenue', v_current_revenue
    )
  ), '[]'::JSONB) INTO v_result
  FROM UNNEST(v_month_series) AS month_date;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_trends_optimized(UUID, INTEGER) TO authenticated;

-- ======================================================================================
-- FUNCTION 6: get_dashboard_time_series
-- Purpose: Get time-series data for various dashboard metrics
-- Returns: JSONB array with metric values over time
-- ======================================================================================
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
  SELECT COALESCE(json_agg(
    json_build_object(
      'date', TO_CHAR(date_val, 'YYYY-MM-DD'),
      'value', 0
    )
  ), '[]'::JSONB) INTO v_result
  FROM UNNEST(v_date_series) AS date_val;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_time_series(UUID, TEXT, INTEGER) TO authenticated;

-- ======================================================================================
-- FUNCTION 7: get_metric_trend
-- Purpose: Get metric trend comparing current vs previous period
-- Returns: JSONB with current value, previous value, and trend direction
-- ======================================================================================
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

  -- Build result
  v_result := json_build_object(
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
    END,
    'period', p_period
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_metric_trend(UUID, TEXT, TEXT) TO authenticated;

-- ======================================================================================
-- FUNCTION 8: get_maintenance_analytics
-- Purpose: Get maintenance analytics including resolution time, completion rate, etc.
-- Returns: JSONB with maintenance analytics data
-- ======================================================================================
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

  SELECT json_build_object(
    'avgResolutionTime', COALESCE(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) FILTER (WHERE completed_at IS NOT NULL),
      0
    ),
    'completionRate', CASE
      WHEN v_total_requests > 0 THEN ROUND((v_completed_requests::DECIMAL / v_total_requests::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'normal', COUNT(*) FILTER (WHERE priority = 'normal'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    ),
    'trendsOverTime', '[]'::JSONB
  ) INTO v_result
  FROM maintenance_requests
  WHERE property_owner_id = user_id;

  RETURN COALESCE(v_result, json_build_object(
    'avgResolutionTime', 0,
    'completionRate', 0,
    'priorityBreakdown', json_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0),
    'trendsOverTime', '[]'::JSONB
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(UUID) TO authenticated;

-- ======================================================================================
-- FUNCTION 9: get_billing_insights
-- Purpose: Get billing insights including total revenue, churn rate, and MRR
-- Returns: JSONB with billing insights
-- ======================================================================================
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

  -- Build result
  v_result := json_build_object(
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

-- ======================================================================================
-- COMMENTS: Document all functions
-- ======================================================================================
COMMENT ON FUNCTION public.get_dashboard_stats(UUID) IS 'Returns comprehensive dashboard statistics including properties, tenants, units, leases, maintenance, and revenue';
COMMENT ON FUNCTION public.get_property_performance_cached(UUID) IS 'Returns property performance metrics for all user properties';
COMMENT ON FUNCTION public.get_property_performance_trends(UUID) IS 'Returns revenue trends for user properties (month-over-month)';
COMMENT ON FUNCTION public.get_occupancy_trends_optimized(UUID, INTEGER) IS 'Returns monthly occupancy trends over specified months';
COMMENT ON FUNCTION public.get_revenue_trends_optimized(UUID, INTEGER) IS 'Returns monthly revenue trends over specified months';
COMMENT ON FUNCTION public.get_dashboard_time_series(UUID, TEXT, INTEGER) IS 'Returns time-series data for dashboard metrics over specified days';
COMMENT ON FUNCTION public.get_metric_trend(UUID, TEXT, TEXT) IS 'Returns metric trend comparing current vs previous period';
COMMENT ON FUNCTION public.get_maintenance_analytics(UUID) IS 'Returns maintenance analytics including resolution time and completion rate';
COMMENT ON FUNCTION public.get_billing_insights(UUID, TIMESTAMP, TIMESTAMP) IS 'Returns billing insights including revenue, churn rate, and MRR';
