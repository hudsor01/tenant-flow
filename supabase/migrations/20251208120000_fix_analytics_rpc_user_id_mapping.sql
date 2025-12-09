-- Migration: Fix analytics RPC functions to properly map user_id to property_owner_id
-- Issue: RPC functions were comparing property_owner_id (property_owners.id) with p_user_id (users.id)
-- These are different UUIDs - property_owner_id references property_owners.id, not users.id
-- Fix: First lookup property_owners.id from users.id via property_owners.user_id = p_user_id

-- 1. Fix get_dashboard_stats
CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
  v_properties_stats JSON;
  v_tenants_stats JSON;
  v_units_stats JSON;
  v_leases_stats JSON;
  v_maintenance_stats JSON;
  v_revenue_stats JSON;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  -- property_owner_id in tables references property_owners.id, NOT users.id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return empty stats
  IF v_property_owner_id IS NULL THEN
    RETURN json_build_object(
      'properties', json_build_object('total', 0, 'occupied', 0, 'vacant', 0, 'occupancyRate', 0, 'totalMonthlyRent', 0, 'averageRent', 0),
      'tenants', json_build_object('total', 0, 'active', 0, 'inactive', 0, 'newThisMonth', 0),
      'units', json_build_object('total', 0, 'occupied', 0, 'vacant', 0, 'maintenance', 0, 'averageRent', 0, 'available', 0, 'occupancyRate', 0, 'occupancyChange', 0, 'totalPotentialRent', 0, 'totalActualRent', 0),
      'leases', json_build_object('total', 0, 'active', 0, 'expired', 0, 'expiringSoon', 0),
      'maintenance', json_build_object('total', 0, 'open', 0, 'inProgress', 0, 'completed', 0, 'completedToday', 0, 'avgResolutionTime', 0, 'byPriority', json_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0)),
      'revenue', json_build_object('monthly', 0, 'yearly', 0, 'growth', 0)
    );
  END IF;

  -- Properties statistics (now using resolved v_property_owner_id)
  WITH property_stats AS (
    SELECT
      p.id,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'occupied') as occupied_units,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as total_units
    FROM properties p
    WHERE p.property_owner_id = v_property_owner_id
  )
  SELECT json_build_object(
    'total', COUNT(*)::INTEGER,
    'occupied', COUNT(*) FILTER (WHERE occupied_units > 0)::INTEGER,
    'vacant', COUNT(*) FILTER (WHERE occupied_units = 0 OR total_units = 0)::INTEGER,
    'occupancyRate', COALESCE(
      ROUND(
        (SUM(occupied_units)::DECIMAL / NULLIF(SUM(total_units)::DECIMAL, 0)) * 100,
        2
      ),
      0
    ),
    'totalMonthlyRent', COALESCE(
      (SELECT SUM(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.property_owner_id = v_property_owner_id
       AND u.status = 'occupied'),
      0
    ),
    'averageRent', COALESCE(
      (SELECT AVG(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.property_owner_id = v_property_owner_id),
      0
    )
  ) INTO v_properties_stats
  FROM property_stats;

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
    WHERE p.property_owner_id = v_property_owner_id
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
    SELECT id FROM properties WHERE property_owner_id = v_property_owner_id
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
  WHERE property_owner_id = v_property_owner_id;

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
  WHERE property_owner_id = v_property_owner_id;

  -- Revenue statistics
  SELECT json_build_object(
    'monthly', COALESCE(
      (SELECT SUM(rent_amount) FROM leases WHERE property_owner_id = v_property_owner_id AND lease_status = 'active'),
      0
    ),
    'yearly', COALESCE(
      (SELECT SUM(rent_amount) * 12 FROM leases WHERE property_owner_id = v_property_owner_id AND lease_status = 'active'),
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

COMMENT ON FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") IS 'Returns comprehensive dashboard statistics. FIXED: Now properly maps user_id to property_owner_id via property_owners table.';


-- 2. Fix get_billing_insights (parameter name is owner_id_param but it receives user_id)
CREATE OR REPLACE FUNCTION "public"."get_billing_insights"("owner_id_param" "uuid", "start_date_param" timestamp without time zone DEFAULT NULL::timestamp without time zone, "end_date_param" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_total_revenue NUMERIC;
  v_mrr NUMERIC;
  v_active_leases INTEGER;
  v_expired_leases INTEGER;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = owner_id_param;

  -- If user is not a property owner, return empty insights
  IF v_property_owner_id IS NULL THEN
    RETURN jsonb_build_object('totalRevenue', 0, 'churnRate', 0, 'mrr', 0);
  END IF;

  -- Calculate MRR (Monthly Recurring Revenue)
  SELECT COALESCE(SUM(rent_amount), 0) INTO v_mrr
  FROM leases
  WHERE property_owner_id = v_property_owner_id
  AND lease_status = 'active';

  -- Calculate total revenue (annual)
  v_total_revenue := v_mrr * 12;

  -- Calculate active and expired leases for churn rate
  SELECT
    COUNT(*) FILTER (WHERE lease_status = 'active'),
    COUNT(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_active_leases, v_expired_leases
  FROM leases
  WHERE property_owner_id = v_property_owner_id;

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

COMMENT ON FUNCTION "public"."get_billing_insights"("owner_id_param" "uuid", "start_date_param" timestamp without time zone, "end_date_param" timestamp without time zone) IS 'Returns billing insights. FIXED: Now properly maps user_id to property_owner_id.';

-- 3. Fix get_property_performance_cached
CREATE OR REPLACE FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return empty array
  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
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
  WHERE p.property_owner_id = v_property_owner_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") IS 'Returns property performance metrics. FIXED: Now properly maps user_id to property_owner_id.';

-- 4. Fix get_property_performance_trends
CREATE OR REPLACE FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return empty array
  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

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
  WHERE p.property_owner_id = v_property_owner_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") IS 'Returns revenue trends for user properties. FIXED: Now properly maps user_id to property_owner_id.';

-- 5. Fix get_occupancy_trends_optimized
CREATE OR REPLACE FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer DEFAULT 12) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_month_series DATE[];
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return empty array
  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Generate array of months
  SELECT ARRAY(
    SELECT (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::INTERVAL)::DATE
  ) INTO v_month_series;

  -- Build occupancy trends
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'occupancy_rate', COALESCE(
        (SELECT ROUND(
          ((SELECT COUNT(*)::DECIMAL FROM units u
            JOIN properties p ON p.id = u.property_id
            WHERE p.property_owner_id = v_property_owner_id
            AND u.status = 'occupied') /
           NULLIF((SELECT COUNT(*)::DECIMAL FROM units u
                   JOIN properties p ON p.id = u.property_id
                   WHERE p.property_owner_id = v_property_owner_id), 0)) * 100,
          2
        )),
        0
      ),
      'total_units', (SELECT COUNT(*) FROM units u
                      JOIN properties p ON p.id = u.property_id
                      WHERE p.property_owner_id = v_property_owner_id),
      'occupied_units', (SELECT COUNT(*) FROM units u
                         JOIN properties p ON p.id = u.property_id
                         WHERE p.property_owner_id = v_property_owner_id
                         AND u.status = 'occupied')
    )
  ), '[]'::JSONB) INTO v_result
  FROM unnest(v_month_series) AS month_date;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer) IS 'Returns monthly occupancy trends. FIXED: Now properly maps user_id to property_owner_id.';

-- 6. Fix get_revenue_trends_optimized
CREATE OR REPLACE FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer DEFAULT 12) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_month_series DATE[];
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return empty array
  IF v_property_owner_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Generate array of months
  SELECT ARRAY(
    SELECT (CURRENT_DATE - (generate_series(0, p_months - 1) || ' months')::INTERVAL)::DATE
  ) INTO v_month_series;

  -- Build revenue trends
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases
         WHERE property_owner_id = v_property_owner_id
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

COMMENT ON FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer) IS 'Returns monthly revenue trends. FIXED: Now properly maps user_id to property_owner_id.';

-- 7. Fix get_maintenance_analytics
CREATE OR REPLACE FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_total_requests INTEGER;
  v_completed_requests INTEGER;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE property_owners.user_id = get_maintenance_analytics.user_id;

  -- If user is not a property owner, return empty analytics
  IF v_property_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'avgResolutionTime', 0,
      'completionRate', 0,
      'priorityBreakdown', jsonb_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0),
      'trendsOverTime', '[]'::JSONB
    );
  END IF;

  SELECT COUNT(*) INTO v_total_requests
  FROM maintenance_requests
  WHERE property_owner_id = v_property_owner_id;

  SELECT COUNT(*) INTO v_completed_requests
  FROM maintenance_requests
  WHERE property_owner_id = v_property_owner_id
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
  WHERE property_owner_id = v_property_owner_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'avgResolutionTime', 0,
    'completionRate', 0,
    'priorityBreakdown', jsonb_build_object('low', 0, 'normal', 0, 'high', 0, 'urgent', 0),
    'trendsOverTime', '[]'::JSONB
  ));
END;
$$;

COMMENT ON FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") IS 'Returns maintenance analytics. FIXED: Now properly maps user_id to property_owner_id.';

-- 8. Fix get_metric_trend
CREATE OR REPLACE FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text" DEFAULT 'month'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_current_value NUMERIC;
  v_previous_value NUMERIC;
  v_property_owner_id UUID;
BEGIN
  -- CRITICAL FIX: Resolve property_owner_id from user_id
  SELECT id INTO v_property_owner_id
  FROM property_owners
  WHERE user_id = p_user_id;

  -- If user is not a property owner, return zeros
  IF v_property_owner_id IS NULL THEN
    RETURN jsonb_build_object(
      'current_value', 0,
      'previous_value', 0,
      'change', 0,
      'change_percentage', 0,
      'trend', 'stable'
    );
  END IF;

  -- Calculate metric based on metric name
  CASE p_metric_name
    WHEN 'monthly_revenue' THEN
      SELECT COALESCE(SUM(rent_amount), 0) INTO v_current_value
      FROM leases
      WHERE property_owner_id = v_property_owner_id
      AND lease_status = 'active';
      v_previous_value := v_current_value;

    WHEN 'active_tenants' THEN
      SELECT COUNT(*) INTO v_current_value
      FROM tenants t
      WHERE EXISTS (
        SELECT 1 FROM leases l
        WHERE l.primary_tenant_id = t.id
        AND l.property_owner_id = v_property_owner_id
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

COMMENT ON FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text") IS 'Returns metric trend. FIXED: Now properly maps user_id to property_owner_id.';
