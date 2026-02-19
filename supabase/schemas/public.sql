--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'Removed Stripe sync tables - using Stripe API directly instead';


--
-- Name: check_user_feature_access(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_feature_access(p_user_id text, p_feature text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- All users have all features for now (can be restricted by plan later)
  RETURN true;
END;
$$;


--
-- Name: custom_access_token_hook(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  claims jsonb;
  user_record RECORD;
  db_user_type text;
  db_stripe_customer_id text;
BEGIN
  -- Get current claims from event
  claims := event -> 'claims';

  -- Fetch user data from public.users table
  SELECT u.user_type, u.stripe_customer_id
  INTO user_record
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  -- Default to 'OWNER' for new signups
  db_user_type := UPPER(COALESCE(
    user_record.user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  db_stripe_customer_id := COALESCE(
    user_record.stripe_customer_id,
    event -> 'user' -> 'user_metadata' ->> 'stripe_customer_id'
  );

  -- Set app_metadata claims - ONLY set non-NULL values to avoid jsonb_set returning NULL
  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(db_user_type));

  -- Only set stripe_customer_id if it has a value (avoid NULL breaking jsonb_set)
  IF db_stripe_customer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(db_stripe_customer_id));
  END IF;

  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;


--
-- Name: FUNCTION custom_access_token_hook(event jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.custom_access_token_hook(event jsonb) IS 'SECURITY FIX: Custom access token hook that reads user_type from public.users (authoritative source) instead of auth.users.raw_user_meta_data (user-editable). Adds user_type, stripe_customer_id, and subscription_status to JWT claims.';


--
-- Name: get_billing_insights(uuid, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone, end_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone, end_date_param timestamp without time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone, end_date_param timestamp without time zone) IS 'Returns billing insights including revenue, churn rate, and MRR';


--
-- Name: get_current_property_owner_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_property_owner_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT id FROM public.property_owners WHERE user_id = auth.uid();
$$;


--
-- Name: get_current_tenant_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid();
$$;


--
-- Name: get_current_user_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_type() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT user_type FROM public.users WHERE id = auth.uid();
$$;


--
-- Name: get_dashboard_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_stats(p_user_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
  -- Properties statistics (corrected - avoid ungrouped column error)
  WITH property_stats AS (
    SELECT
      p.id,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'occupied') as occupied_units,
      (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as total_units
    FROM properties p
    WHERE p.property_owner_id = p_user_id
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
       WHERE p.property_owner_id = p_user_id
       AND u.status = 'occupied'),
      0
    ),
    'averageRent', COALESCE(
      (SELECT AVG(u.rent_amount)
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE p.property_owner_id = p_user_id),
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


--
-- Name: FUNCTION get_dashboard_stats(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_dashboard_stats(p_user_id uuid) IS 'Returns comprehensive dashboard statistics including properties, tenants, units, leases, maintenance, and revenue (FIXED: aggregation error)';


--
-- Name: get_dashboard_time_series(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer DEFAULT 30) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer) IS 'Returns time-series data for dashboard metrics over specified days';


--
-- Name: get_maintenance_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_maintenance_analytics(user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_maintenance_analytics(user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_maintenance_analytics(user_id uuid) IS 'Returns maintenance analytics including resolution time and completion rate';


--
-- Name: get_metric_trend(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_metric_trend(p_user_id uuid, p_metric_name text, p_period text DEFAULT 'month'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_metric_trend(p_user_id uuid, p_metric_name text, p_period text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_metric_trend(p_user_id uuid, p_metric_name text, p_period text) IS 'Returns metric trend comparing current vs previous period';


--
-- Name: get_occupancy_trends_optimized(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_occupancy_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_occupancy_trends_optimized(p_user_id uuid, p_months integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_occupancy_trends_optimized(p_user_id uuid, p_months integer) IS 'Returns monthly occupancy trends over specified months';


--
-- Name: get_property_performance_cached(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_property_performance_cached(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
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
  WHERE p.property_owner_id = p_user_id;

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_property_performance_cached(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_property_performance_cached(p_user_id uuid) IS 'Returns property performance metrics for all user properties';


--
-- Name: get_property_performance_trends(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_property_performance_trends(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_property_performance_trends(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_property_performance_trends(p_user_id uuid) IS 'Returns revenue trends for user properties (month-over-month)';


--
-- Name: get_revenue_trends_optimized(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: FUNCTION get_revenue_trends_optimized(p_user_id uuid, p_months integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer) IS 'Returns monthly revenue trends over specified months';


--
-- Name: get_user_dashboard_activities(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_dashboard_activities(p_user_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0) RETURNS TABLE(id text, title text, description text, activity_type text, entity_type text, entity_id text, user_id text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id::text,
    a.title,
    a.description,
    a.activity_type,
    a.entity_type,
    a.entity_id::text,
    a.user_id::text,
    a.created_at
  FROM activity a
  WHERE a.user_id = p_user_id::uuid  -- FIX: Cast text to uuid
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


--
-- Name: get_user_plan_limits(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_plan_limits(p_user_id text) RETURNS TABLE(property_limit integer, tenant_limit integer, unit_limit integer, storage_gb integer, has_api_access boolean, has_white_label boolean, support_level text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = ''
    AS $$
declare
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
begin
  if exists (select 1 from pg_namespace where nspname = 'stripe')
     and to_regclass('stripe.customers') is not null
     and to_regclass('stripe.subscriptions') is not null
  then
    select id into v_stripe_customer_id
    from stripe.customers
    where (metadata->>'user_id')::uuid = p_user_id::uuid
    limit 1;

    if v_stripe_customer_id is not null then
      select si.price into v_price_id
      from stripe.subscriptions s
      join stripe.subscription_items si on si.subscription = s.id
      where s.customer = v_stripe_customer_id
        and s.status in ('active', 'trialing')
      order by s.created desc
      limit 1;
    end if;
  end if;

  v_plan_tier := case v_price_id
    when 'price_1RtWFcP3WCR53Sdo5Li5xHiC' then 'FREETRIAL'
    when 'price_1RtWFcP3WCR53SdoCxiVldhb' then 'STARTER'
    when 'price_1RtWFdP3WCR53SdoArRRXYrL' then 'STARTER'
    when 'price_1SPGCNP3WCR53SdorjDpiSy5' then 'GROWTH'
    when 'price_1SPGCRP3WCR53SdonqLUTJgK' then 'GROWTH'
    when 'price_1SPGCjP3WCR53SdoIpidDn0T' then 'TENANTFLOW_MAX'
    when 'price_1SPGCoP3WCR53SdoID50geIC' then 'TENANTFLOW_MAX'
    else 'STARTER'
  end;

  return query select
    case v_plan_tier when 'FREETRIAL' then 1 when 'STARTER' then 5 when 'GROWTH' then 20 when 'TENANTFLOW_MAX' then 9999 else 5 end::integer,
    case v_plan_tier when 'FREETRIAL' then 10 when 'STARTER' then 25 when 'GROWTH' then 100 when 'TENANTFLOW_MAX' then 9999 else 25 end::integer,
    case v_plan_tier when 'FREETRIAL' then 5 when 'STARTER' then 25 when 'GROWTH' then 100 when 'TENANTFLOW_MAX' then 9999 else 25 end::integer,
    case v_plan_tier when 'FREETRIAL' then 1 when 'STARTER' then 10 when 'GROWTH' then 50 when 'TENANTFLOW_MAX' then 100 else 10 end::integer,
    (v_plan_tier in ('GROWTH', 'TENANTFLOW_MAX'))::boolean,
    (v_plan_tier = 'TENANTFLOW_MAX')::boolean,
    case v_plan_tier when 'FREETRIAL' then 'community' when 'STARTER' then 'email' when 'GROWTH' then 'priority' when 'TENANTFLOW_MAX' then 'dedicated' else 'email' end::text;
end;
$$;


--
-- Name: health_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.health_check() RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object('ok', true, 'timestamp', NOW());
$$;


--
-- Name: FUNCTION health_check(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.health_check() IS 'Health check endpoint for backend monitoring - returns {ok: true} if database is accessible';


--
-- Name: record_processed_stripe_event_lock(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_processed_stripe_event_lock(p_stripe_event_id text) RETURNS TABLE(success boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO stripe_processed_events (stripe_event_id, processed_at)
  VALUES (p_stripe_event_id, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN QUERY SELECT true;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


--
-- Name: user_is_tenant(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_tenant() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  claim_text text;
BEGIN
  claim_text := NULLIF(auth.jwt() ->> 'tenant_id', '');

  IF claim_text IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Validate UUID format without raising
  PERFORM claim_text::uuid;
  RETURN TRUE;

EXCEPTION WHEN others THEN
  RETURN FALSE;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    activity_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_type text NOT NULL,
    file_path text NOT NULL,
    storage_url text NOT NULL,
    file_size integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    maintenance_request_id uuid NOT NULL,
    vendor_name text,
    amount integer NOT NULL,
    expense_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lease_tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lease_tenants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lease_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    responsibility_percentage integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leases (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    unit_id uuid NOT NULL,
    primary_tenant_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    rent_amount integer NOT NULL,
    rent_currency text DEFAULT 'usd'::text NOT NULL,
    security_deposit integer NOT NULL,
    payment_day integer DEFAULT 1 NOT NULL,
    late_fee_amount integer,
    late_fee_days integer DEFAULT 5,
    lease_status text DEFAULT 'active'::text NOT NULL,
    stripe_subscription_id text,
    auto_pay_enabled boolean DEFAULT false,
    grace_period_days integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_owner_id uuid,
    CONSTRAINT leases_lease_status_check CHECK ((lease_status = ANY (ARRAY['active'::text, 'pending'::text, 'ended'::text, 'terminated'::text])))
);


--
-- Name: CONSTRAINT leases_lease_status_check ON leases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT leases_lease_status_check ON public.leases IS 'Enforces valid lease status values: DRAFT, ACTIVE, EXPIRED, TERMINATED';


--
-- Name: maintenance_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_requests (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    unit_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    description text NOT NULL,
    requested_by uuid,
    assigned_to uuid,
    estimated_cost integer,
    actual_cost integer,
    scheduled_date date,
    completed_at timestamp with time zone,
    inspector_id uuid,
    inspection_date date,
    inspection_findings text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_owner_id uuid,
    title text DEFAULT 'New Maintenance Request'::text NOT NULL,
    CONSTRAINT maintenance_requests_priority_check CHECK ((priority = ANY (ARRAY['urgent'::text, 'high'::text, 'normal'::text, 'low'::text]))),
    CONSTRAINT maintenance_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT maintenance_requests_title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0))
);


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    notification_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    delivery_channel text,
    attempt_count integer DEFAULT 1,
    last_error text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_logs_delivery_channel_check CHECK ((delivery_channel = ANY (ARRAY['email'::text, 'sms'::text, 'in_app'::text, 'push'::text]))),
    CONSTRAINT notification_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'bounced'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    action_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    stripe_payment_method_id text NOT NULL,
    type text NOT NULL,
    last_four text,
    brand text,
    exp_month integer,
    exp_year integer,
    bank_name text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_methods_type_check CHECK ((type = ANY (ARRAY['card'::text, 'bank_account'::text, 'ach'::text, 'sepa_debit'::text])))
);


--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_schedules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lease_id uuid NOT NULL,
    frequency text DEFAULT 'monthly'::text NOT NULL,
    next_payment_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_schedules_frequency_check CHECK ((frequency = ANY (ARRAY['weekly'::text, 'biweekly'::text, 'monthly'::text, 'quarterly'::text, 'annually'::text])))
);


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    payment_method_id uuid,
    rent_payment_id uuid NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    status text NOT NULL,
    amount integer NOT NULL,
    failure_reason text,
    retry_count integer DEFAULT 0,
    attempted_at timestamp with time zone DEFAULT now(),
    last_attempted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.properties (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    property_owner_id uuid NOT NULL,
    name text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text DEFAULT 'US'::text NOT NULL,
    property_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_sold date,
    sale_price numeric(12,2),
    CONSTRAINT properties_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'sold'::text])))
);


--
-- Name: property_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_images (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    property_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: property_owners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property_owners (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    stripe_account_id text NOT NULL,
    business_name text,
    business_type text NOT NULL,
    tax_id text,
    charges_enabled boolean DEFAULT false,
    payouts_enabled boolean DEFAULT false,
    onboarding_status text DEFAULT 'not_started'::text,
    current_step text,
    completion_percentage integer DEFAULT 0,
    onboarding_started_at timestamp with time zone,
    onboarding_completed_at timestamp with time zone,
    requirements_due text[],
    default_platform_fee_percent numeric(5,2) DEFAULT 3.0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT property_owners_onboarding_status_check CHECK ((onboarding_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: COLUMN property_owners.stripe_account_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.property_owners.stripe_account_id IS 'Stripe Connect account ID for this property owner. One-to-one mapping with user.';


--
-- Name: rent_due; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_due (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    unit_id uuid NOT NULL,
    lease_id uuid,
    due_date date NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rent_due_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text, 'waived'::text])))
);


--
-- Name: rent_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    lease_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    status text NOT NULL,
    payment_method_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    due_date date NOT NULL,
    paid_date timestamp with time zone,
    application_fee_amount integer NOT NULL,
    late_fee_amount integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rent_payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: report_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_runs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    report_id uuid NOT NULL,
    execution_status text NOT NULL,
    file_path text,
    file_size integer,
    execution_time_ms integer,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT report_runs_execution_status_check CHECK ((execution_status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    report_type text NOT NULL,
    title text NOT NULL,
    description text,
    schedule_cron text,
    next_run_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_owner_id uuid NOT NULL
);


--
-- Name: security_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_audit_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT security_audit_log_event_type_check CHECK ((event_type = ANY (ARRAY['login'::text, 'logout'::text, 'password_change'::text, 'password_failed'::text, 'permission_change'::text, 'data_access'::text, 'audit'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    stripe_subscription_id text,
    stripe_customer_id text,
    stripe_price_id text,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'trialing'::text])))
);


--
-- Name: tenant_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_invitations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    unit_id uuid NOT NULL,
    property_owner_id uuid NOT NULL,
    invitation_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invitation_url text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tenant_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])))
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date_of_birth date,
    ssn_last_four text,
    identity_verified boolean DEFAULT false,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    property_id uuid NOT NULL,
    unit_number text,
    bedrooms integer,
    bathrooms numeric(3,1),
    square_feet integer,
    rent_amount integer NOT NULL,
    rent_currency text DEFAULT 'usd'::text NOT NULL,
    rent_period text DEFAULT 'monthly'::text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    property_owner_id uuid,
    CONSTRAINT units_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'maintenance'::text])))
);


--
-- Name: user_access_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_access_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    ip_address text,
    user_agent text,
    endpoint text,
    method text,
    status_code integer,
    accessed_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_feature_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feature_access (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    feature_name text NOT NULL,
    access_level text DEFAULT 'basic'::text,
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    theme text DEFAULT 'light'::text,
    language text DEFAULT 'en'::text,
    timezone text DEFAULT 'UTC'::text,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    user_type text NOT NULL,
    stripe_customer_id text,
    status text DEFAULT 'active'::text NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    identity_verified_at timestamp with time zone,
    identity_verification_status text,
    identity_verification_session_id text,
    identity_verification_data jsonb,
    identity_verification_error text,
    onboarding_completed_at timestamp with time zone,
    onboarding_status text DEFAULT 'not_started'::text,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text]))),
    CONSTRAINT users_user_type_check CHECK ((user_type = ANY (ARRAY['OWNER'::text, 'TENANT'::text, 'MANAGER'::text, 'ADMIN'::text])))
);


--
-- Name: webhook_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_attempts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    webhook_event_id uuid NOT NULL,
    status text NOT NULL,
    retry_count integer DEFAULT 0,
    failure_reason text,
    last_attempted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_attempts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text])))
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_type text NOT NULL,
    webhook_source text DEFAULT 'stripe'::text NOT NULL,
    raw_payload jsonb NOT NULL,
    external_id text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_events_webhook_source_check CHECK ((webhook_source = ANY (ARRAY['stripe'::text, 'auth'::text, 'custom'::text])))
);


--
-- Name: COLUMN webhook_events.external_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webhook_events.external_id IS 'External event ID for idempotency tracking. For Stripe webhooks, this stores the Stripe event ID (evt_xxx). Combined with webhook_source, ensures no duplicate event processing.';


--
-- Name: webhook_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_metrics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    event_type text NOT NULL,
    date date NOT NULL,
    total_received integer DEFAULT 0,
    total_processed integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    average_latency_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: lease_tenants lease_tenants_lease_id_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_tenants
    ADD CONSTRAINT lease_tenants_lease_id_tenant_id_key UNIQUE (lease_id, tenant_id);


--
-- Name: lease_tenants lease_tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_tenants
    ADD CONSTRAINT lease_tenants_pkey PRIMARY KEY (id);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: leases leases_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: maintenance_requests maintenance_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_stripe_payment_method_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_stripe_payment_method_id_key UNIQUE (stripe_payment_method_id);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: properties properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_pkey PRIMARY KEY (id);


--
-- Name: property_images property_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_pkey PRIMARY KEY (id);


--
-- Name: property_owners property_owners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_pkey PRIMARY KEY (id);


--
-- Name: property_owners property_owners_stripe_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_stripe_account_id_key UNIQUE (stripe_account_id);


--
-- Name: property_owners property_owners_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_user_id_key UNIQUE (user_id);


--
-- Name: rent_due rent_due_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_due
    ADD CONSTRAINT rent_due_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: report_runs report_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_runs
    ADD CONSTRAINT report_runs_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: security_audit_log security_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: tenant_invitations tenant_invitations_invitation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_invitation_code_key UNIQUE (invitation_code);


--
-- Name: tenant_invitations tenant_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_key UNIQUE (user_id);


--
-- Name: webhook_events unique_webhook_source_external_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT unique_webhook_source_external_id UNIQUE (webhook_source, external_id);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: user_access_log user_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_access_log
    ADD CONSTRAINT user_access_log_pkey PRIMARY KEY (id);


--
-- Name: user_feature_access user_feature_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feature_access
    ADD CONSTRAINT user_feature_access_pkey PRIMARY KEY (id);


--
-- Name: user_feature_access user_feature_access_user_id_feature_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feature_access
    ADD CONSTRAINT user_feature_access_user_id_feature_name_key UNIQUE (user_id, feature_name);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: webhook_attempts webhook_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_attempts
    ADD CONSTRAINT webhook_attempts_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_metrics webhook_metrics_event_type_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_metrics
    ADD CONSTRAINT webhook_metrics_event_type_date_key UNIQUE (event_type, date);


--
-- Name: webhook_metrics webhook_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_metrics
    ADD CONSTRAINT webhook_metrics_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_activity_type ON public.activity USING btree (activity_type);


--
-- Name: idx_activity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_created_at ON public.activity USING btree (created_at);


--
-- Name: idx_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_user_id ON public.activity USING btree (user_id);


--
-- Name: idx_documents_document_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_document_type ON public.documents USING btree (document_type);


--
-- Name: idx_documents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_type, entity_id);


--
-- Name: idx_documents_entity_type_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_entity_type_entity_id ON public.documents USING btree (entity_type, entity_id);


--
-- Name: idx_expenses_expense_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);


--
-- Name: idx_expenses_maintenance_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expenses_maintenance_request_id ON public.expenses USING btree (maintenance_request_id);


--
-- Name: idx_lease_tenants_lease_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lease_tenants_lease_id ON public.lease_tenants USING btree (lease_id);


--
-- Name: idx_lease_tenants_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lease_tenants_tenant_id ON public.lease_tenants USING btree (tenant_id);


--
-- Name: idx_leases_lease_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_lease_status ON public.leases USING btree (lease_status);


--
-- Name: idx_leases_primary_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_primary_tenant_id ON public.leases USING btree (primary_tenant_id);


--
-- Name: idx_leases_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_property_id ON public.leases USING btree (unit_id);


--
-- Name: idx_leases_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_property_owner_id ON public.leases USING btree (property_owner_id);


--
-- Name: idx_leases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_status ON public.leases USING btree (lease_status);


--
-- Name: idx_leases_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_stripe_subscription_id ON public.leases USING btree (stripe_subscription_id);


--
-- Name: idx_leases_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_tenant_id ON public.leases USING btree (primary_tenant_id);


--
-- Name: idx_leases_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leases_unit_id ON public.leases USING btree (unit_id);


--
-- Name: idx_maintenance_requests_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_assigned_to ON public.maintenance_requests USING btree (assigned_to);


--
-- Name: idx_maintenance_requests_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_priority ON public.maintenance_requests USING btree (priority);


--
-- Name: idx_maintenance_requests_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_property_owner_id ON public.maintenance_requests USING btree (property_owner_id);


--
-- Name: idx_maintenance_requests_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_requested_by ON public.maintenance_requests USING btree (requested_by);


--
-- Name: idx_maintenance_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests USING btree (status);


--
-- Name: idx_maintenance_requests_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests USING btree (tenant_id);


--
-- Name: idx_maintenance_requests_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests USING btree (unit_id);


--
-- Name: idx_notification_logs_notification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_notification_id ON public.notification_logs USING btree (notification_id);


--
-- Name: idx_notification_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_logs_status ON public.notification_logs USING btree (status);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_payment_methods_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_is_default ON public.payment_methods USING btree (is_default);


--
-- Name: idx_payment_methods_stripe_payment_method_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_stripe_payment_method_id ON public.payment_methods USING btree (stripe_payment_method_id);


--
-- Name: idx_payment_methods_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_tenant_id ON public.payment_methods USING btree (tenant_id);


--
-- Name: idx_payment_schedules_lease_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_schedules_lease_id ON public.payment_schedules USING btree (lease_id);


--
-- Name: idx_payment_schedules_next_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_schedules_next_payment_date ON public.payment_schedules USING btree (next_payment_date);


--
-- Name: idx_payment_transactions_payment_method_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_payment_method_id ON public.payment_transactions USING btree (payment_method_id);


--
-- Name: idx_payment_transactions_rent_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_rent_payment_id ON public.payment_transactions USING btree (rent_payment_id);


--
-- Name: idx_payment_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);


--
-- Name: idx_payment_transactions_stripe_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_transactions_stripe_payment_intent_id ON public.payment_transactions USING btree (stripe_payment_intent_id);


--
-- Name: idx_properties_date_sold; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_date_sold ON public.properties USING btree (date_sold);


--
-- Name: idx_properties_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_id ON public.properties USING btree (id);


--
-- Name: idx_properties_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_property_owner_id ON public.properties USING btree (property_owner_id);


--
-- Name: idx_properties_sale_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_sale_price ON public.properties USING btree (sale_price);


--
-- Name: idx_properties_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_properties_status ON public.properties USING btree (status);


--
-- Name: idx_property_images_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_images_property_id ON public.property_images USING btree (property_id);


--
-- Name: idx_property_owners_onboarding_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_owners_onboarding_status ON public.property_owners USING btree (onboarding_status);


--
-- Name: idx_property_owners_stripe_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_owners_stripe_account_id ON public.property_owners USING btree (stripe_account_id);


--
-- Name: idx_property_owners_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_property_owners_user_id ON public.property_owners USING btree (user_id);


--
-- Name: idx_rent_due_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_due_due_date ON public.rent_due USING btree (due_date);


--
-- Name: idx_rent_due_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_due_unit_id ON public.rent_due USING btree (unit_id);


--
-- Name: idx_rent_payments_lease_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_payments_lease_id ON public.rent_payments USING btree (lease_id);


--
-- Name: idx_rent_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_payments_status ON public.rent_payments USING btree (status);


--
-- Name: idx_rent_payments_stripe_payment_intent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_payments_stripe_payment_intent_id ON public.rent_payments USING btree (stripe_payment_intent_id);


--
-- Name: idx_rent_payments_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_payments_tenant_id ON public.rent_payments USING btree (tenant_id);


--
-- Name: idx_rent_payments_tenant_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rent_payments_tenant_id_created_at ON public.rent_payments USING btree (tenant_id, created_at DESC);


--
-- Name: idx_report_runs_execution_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_runs_execution_status ON public.report_runs USING btree (execution_status);


--
-- Name: idx_report_runs_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_runs_report_id ON public.report_runs USING btree (report_id);


--
-- Name: idx_report_runs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_runs_started_at ON public.report_runs USING btree (started_at);


--
-- Name: idx_reports_next_run_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_next_run_at ON public.reports USING btree (next_run_at);


--
-- Name: idx_reports_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_property_owner_id ON public.reports USING btree (property_owner_id);


--
-- Name: idx_reports_report_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_report_type ON public.reports USING btree (report_type);


--
-- Name: idx_security_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log USING btree (created_at);


--
-- Name: idx_security_audit_log_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_log_event_type ON public.security_audit_log USING btree (event_type);


--
-- Name: idx_security_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log USING btree (user_id);


--
-- Name: idx_subscriptions_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_tenant_invitations_accepted_by_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_invitations_accepted_by_user_id ON public.tenant_invitations USING btree (accepted_by_user_id);


--
-- Name: idx_tenant_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_invitations_email ON public.tenant_invitations USING btree (email);


--
-- Name: idx_tenant_invitations_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_invitations_property_owner_id ON public.tenant_invitations USING btree (property_owner_id);


--
-- Name: idx_tenant_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_invitations_status ON public.tenant_invitations USING btree (status);


--
-- Name: idx_tenant_invitations_unit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_invitations_unit_id ON public.tenant_invitations USING btree (unit_id);


--
-- Name: idx_tenants_identity_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_identity_verified ON public.tenants USING btree (identity_verified);


--
-- Name: idx_tenants_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);


--
-- Name: idx_units_property_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_units_property_id ON public.units USING btree (property_id);


--
-- Name: idx_units_property_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_units_property_owner_id ON public.units USING btree (property_owner_id) WHERE (property_owner_id IS NOT NULL);


--
-- Name: idx_units_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_units_status ON public.units USING btree (status);


--
-- Name: idx_user_access_log_accessed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_access_log_accessed_at ON public.user_access_log USING btree (accessed_at);


--
-- Name: idx_user_access_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_access_log_user_id ON public.user_access_log USING btree (user_id);


--
-- Name: idx_user_feature_access_feature_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feature_access_feature_name ON public.user_feature_access USING btree (feature_name);


--
-- Name: idx_user_feature_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feature_access_user_id ON public.user_feature_access USING btree (user_id);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_stripe_customer_id ON public.users USING btree (stripe_customer_id);


--
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);


--
-- Name: idx_webhook_attempts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_attempts_status ON public.webhook_attempts USING btree (status);


--
-- Name: idx_webhook_attempts_webhook_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_attempts_webhook_event_id ON public.webhook_attempts USING btree (webhook_event_id);


--
-- Name: idx_webhook_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_created_at ON public.webhook_events USING btree (created_at);


--
-- Name: idx_webhook_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_event_type ON public.webhook_events USING btree (event_type);


--
-- Name: idx_webhook_events_source_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_source_external_id ON public.webhook_events USING btree (webhook_source, external_id) WHERE (external_id IS NOT NULL);


--
-- Name: idx_webhook_events_webhook_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_webhook_source ON public.webhook_events USING btree (webhook_source);


--
-- Name: idx_webhook_metrics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_metrics_date ON public.webhook_metrics USING btree (date);


--
-- Name: idx_webhook_metrics_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_metrics_event_type ON public.webhook_metrics USING btree (event_type);


--
-- Name: activity activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity
    ADD CONSTRAINT activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_maintenance_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_maintenance_request_id_fkey FOREIGN KEY (maintenance_request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;


--
-- Name: lease_tenants lease_tenants_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_tenants
    ADD CONSTRAINT lease_tenants_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: lease_tenants lease_tenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lease_tenants
    ADD CONSTRAINT lease_tenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: leases leases_primary_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_primary_tenant_id_fkey FOREIGN KEY (primary_tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: leases leases_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id);


--
-- Name: leases leases_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: maintenance_requests maintenance_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: maintenance_requests maintenance_requests_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id);


--
-- Name: maintenance_requests maintenance_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: maintenance_requests maintenance_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: maintenance_requests maintenance_requests_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_requests
    ADD CONSTRAINT maintenance_requests_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_methods payment_methods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payment_schedules payment_schedules_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;


--
-- Name: payment_transactions payment_transactions_rent_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_rent_payment_id_fkey FOREIGN KEY (rent_payment_id) REFERENCES public.rent_payments(id) ON DELETE CASCADE;


--
-- Name: properties properties_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.properties
    ADD CONSTRAINT properties_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id) ON DELETE CASCADE;


--
-- Name: property_images property_images_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_images
    ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: property_owners property_owners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property_owners
    ADD CONSTRAINT property_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rent_due rent_due_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_due
    ADD CONSTRAINT rent_due_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: rent_payments rent_payments_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE RESTRICT;


--
-- Name: rent_payments rent_payments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: report_runs report_runs_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_runs
    ADD CONSTRAINT report_runs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- Name: reports reports_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id) ON DELETE CASCADE;


--
-- Name: security_audit_log security_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_audit_log
    ADD CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tenant_invitations tenant_invitations_accepted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id);


--
-- Name: tenant_invitations tenant_invitations_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id) ON DELETE CASCADE;


--
-- Name: tenant_invitations tenant_invitations_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_invitations
    ADD CONSTRAINT tenant_invitations_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: units units_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;


--
-- Name: units units_property_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_property_owner_id_fkey FOREIGN KEY (property_owner_id) REFERENCES public.property_owners(id);


--
-- Name: user_access_log user_access_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_access_log
    ADD CONSTRAINT user_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_feature_access user_feature_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feature_access
    ADD CONSTRAINT user_feature_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: webhook_attempts webhook_attempts_webhook_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_attempts
    ADD CONSTRAINT webhook_attempts_webhook_event_id_fkey FOREIGN KEY (webhook_event_id) REFERENCES public.webhook_events(id) ON DELETE CASCADE;


--
-- Name: tenant_invitations Invited users can select invitations sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invited users can select invitations sent to them" ON public.tenant_invitations FOR SELECT TO authenticated USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))))::text));


--
-- Name: tenant_invitations Invited users can update invitations sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Invited users can update invitations sent to them" ON public.tenant_invitations FOR UPDATE TO authenticated USING ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))))::text)) WITH CHECK ((email = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = ( SELECT auth.uid() AS uid))))::text));


--
-- Name: tenant_invitations Property owners can delete own invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can delete own invitations" ON public.tenant_invitations FOR DELETE TO authenticated USING ((property_owner_id IN ( SELECT property_owners.id
   FROM public.property_owners
  WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: units Property owners can delete units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can delete units" ON public.units FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = units.property_id) AND (p.property_owner_id IN ( SELECT property_owners.id
           FROM public.property_owners
          WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: tenant_invitations Property owners can insert invitations for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can insert invitations for their properties" ON public.tenant_invitations FOR INSERT TO authenticated WITH CHECK (((property_owner_id IN ( SELECT property_owners.id
   FROM public.property_owners
  WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid)))) AND (unit_id IN ( SELECT u.id
   FROM ((public.units u
     JOIN public.properties p ON ((u.property_id = p.id)))
     JOIN public.property_owners po ON ((p.property_owner_id = po.id)))
  WHERE (po.user_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: tenants Property owners can insert tenants for their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can insert tenants for their properties" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: units Property owners can insert units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can insert units" ON public.units FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = units.property_id) AND (p.property_owner_id IN ( SELECT property_owners.id
           FROM public.property_owners
          WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: tenant_invitations Property owners can select own invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can select own invitations" ON public.tenant_invitations FOR SELECT TO authenticated USING ((property_owner_id IN ( SELECT property_owners.id
   FROM public.property_owners
  WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: tenants Property owners can select tenants in their properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can select tenants in their properties" ON public.tenants FOR SELECT TO authenticated USING ((id IN ( SELECT DISTINCT lt.tenant_id
   FROM ((((public.lease_tenants lt
     JOIN public.leases l ON ((lt.lease_id = l.id)))
     JOIN public.units u ON ((l.unit_id = u.id)))
     JOIN public.properties p ON ((u.property_id = p.id)))
     JOIN public.property_owners po ON ((p.property_owner_id = po.id)))
  WHERE (po.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: units Property owners can select units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can select units" ON public.units FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = units.property_id) AND (p.property_owner_id IN ( SELECT property_owners.id
           FROM public.property_owners
          WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: tenant_invitations Property owners can update own invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can update own invitations" ON public.tenant_invitations FOR UPDATE TO authenticated USING ((property_owner_id IN ( SELECT property_owners.id
   FROM public.property_owners
  WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid))))) WITH CHECK ((property_owner_id IN ( SELECT property_owners.id
   FROM public.property_owners
  WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid)))));


--
-- Name: units Property owners can update units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Property owners can update units" ON public.units FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = units.property_id) AND (p.property_owner_id IN ( SELECT property_owners.id
           FROM public.property_owners
          WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = units.property_id) AND (p.property_owner_id IN ( SELECT property_owners.id
           FROM public.property_owners
          WHERE (property_owners.user_id = ( SELECT auth.uid() AS uid))))))));


--
-- Name: user_access_log Users can select own access logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select own access logs" ON public.user_access_log FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: security_audit_log Users can select own security audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select own security audit logs" ON public.security_audit_log FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));


--
-- Name: activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

--
-- Name: activity activity_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_select_own ON public.activity FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: activity activity_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY activity_service_role ON public.activity TO service_role USING (true) WITH CHECK (true);


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_delete_owner ON public.documents FOR DELETE TO authenticated USING ((((entity_type = 'property'::text) AND (entity_id IN ( SELECT properties.id
   FROM public.properties
  WHERE (properties.property_owner_id = public.get_current_property_owner_id())))) OR ((entity_type = 'maintenance_request'::text) AND (entity_id IN ( SELECT maintenance_requests.id
   FROM public.maintenance_requests
  WHERE (maintenance_requests.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: documents documents_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_insert_owner ON public.documents FOR INSERT TO authenticated WITH CHECK ((((entity_type = 'property'::text) AND (entity_id IN ( SELECT properties.id
   FROM public.properties
  WHERE (properties.property_owner_id = public.get_current_property_owner_id())))) OR ((entity_type = 'maintenance_request'::text) AND (entity_id IN ( SELECT maintenance_requests.id
   FROM public.maintenance_requests
  WHERE (maintenance_requests.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: documents documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated USING ((((entity_type = 'property'::text) AND (entity_id IN ( SELECT properties.id
   FROM public.properties
  WHERE (properties.property_owner_id = public.get_current_property_owner_id())))) OR ((entity_type = 'maintenance_request'::text) AND (entity_id IN ( SELECT maintenance_requests.id
   FROM public.maintenance_requests
  WHERE (maintenance_requests.property_owner_id = public.get_current_property_owner_id())))) OR ((entity_type = 'lease'::text) AND (entity_id IN ( SELECT lease_tenants.lease_id
   FROM public.lease_tenants
  WHERE (lease_tenants.tenant_id = public.get_current_tenant_id())))) OR ((entity_type = 'maintenance_request'::text) AND (entity_id IN ( SELECT maintenance_requests.id
   FROM public.maintenance_requests
  WHERE (maintenance_requests.tenant_id = public.get_current_tenant_id()))))));


--
-- Name: documents documents_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_service_role ON public.documents TO service_role USING (true) WITH CHECK (true);


--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_delete_owner ON public.expenses FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.maintenance_requests mr
  WHERE ((mr.id = expenses.maintenance_request_id) AND (mr.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: expenses expenses_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_insert_owner ON public.expenses FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.maintenance_requests mr
  WHERE ((mr.id = expenses.maintenance_request_id) AND (mr.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: expenses expenses_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_select_owner ON public.expenses FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.maintenance_requests mr
  WHERE ((mr.id = expenses.maintenance_request_id) AND (mr.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: expenses expenses_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_service_role ON public.expenses TO service_role USING (true) WITH CHECK (true);


--
-- Name: expenses expenses_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY expenses_update_owner ON public.expenses FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.maintenance_requests mr
  WHERE ((mr.id = expenses.maintenance_request_id) AND (mr.property_owner_id = public.get_current_property_owner_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.maintenance_requests mr
  WHERE ((mr.id = expenses.maintenance_request_id) AND (mr.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: lease_tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: lease_tenants lease_tenants_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lease_tenants_delete_owner ON public.lease_tenants FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: lease_tenants lease_tenants_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lease_tenants_insert_owner ON public.lease_tenants FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: lease_tenants lease_tenants_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lease_tenants_select ON public.lease_tenants FOR SELECT TO authenticated USING (((tenant_id = public.get_current_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: lease_tenants lease_tenants_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lease_tenants_service_role ON public.lease_tenants TO service_role USING (true) WITH CHECK (true);


--
-- Name: lease_tenants lease_tenants_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lease_tenants_update_owner ON public.lease_tenants FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: leases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

--
-- Name: leases leases_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_delete_owner ON public.leases FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: leases leases_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_insert_owner ON public.leases FOR INSERT TO authenticated WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: leases leases_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_select ON public.leases FOR SELECT TO authenticated USING (((property_owner_id = public.get_current_property_owner_id()) OR (EXISTS ( SELECT 1
   FROM public.lease_tenants lt
  WHERE ((lt.lease_id = leases.id) AND (lt.tenant_id = public.get_current_tenant_id()))))));


--
-- Name: leases leases_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_service_role ON public.leases TO service_role USING (true) WITH CHECK (true);


--
-- Name: leases leases_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_update_owner ON public.leases FOR UPDATE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id())) WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: maintenance_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_requests maintenance_requests_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_requests_delete_owner ON public.maintenance_requests FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: maintenance_requests maintenance_requests_insert_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_requests_insert_tenant ON public.maintenance_requests FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_current_tenant_id()));


--
-- Name: maintenance_requests maintenance_requests_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_requests_select ON public.maintenance_requests FOR SELECT TO authenticated USING (((property_owner_id = public.get_current_property_owner_id()) OR (tenant_id = public.get_current_tenant_id())));


--
-- Name: maintenance_requests maintenance_requests_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_requests_service_role ON public.maintenance_requests TO service_role USING (true) WITH CHECK (true);


--
-- Name: maintenance_requests maintenance_requests_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY maintenance_requests_update ON public.maintenance_requests FOR UPDATE TO authenticated USING (((property_owner_id = public.get_current_property_owner_id()) OR (tenant_id = public.get_current_tenant_id()))) WITH CHECK (((property_owner_id = public.get_current_property_owner_id()) OR (tenant_id = public.get_current_tenant_id())));


--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs notification_logs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_logs_select_own ON public.notification_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.notifications n
  WHERE ((n.id = notification_logs.notification_id) AND (n.user_id = auth.uid())))));


--
-- Name: notification_logs notification_logs_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_logs_service_role ON public.notification_logs TO service_role USING (true) WITH CHECK (true);


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: notifications notifications_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_service_role ON public.notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods payment_methods_delete_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_delete_tenant ON public.payment_methods FOR DELETE TO authenticated USING ((tenant_id = public.get_current_tenant_id()));


--
-- Name: payment_methods payment_methods_insert_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_insert_tenant ON public.payment_methods FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_current_tenant_id()));


--
-- Name: payment_methods payment_methods_select_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_select_tenant ON public.payment_methods FOR SELECT TO authenticated USING ((tenant_id = public.get_current_tenant_id()));


--
-- Name: payment_methods payment_methods_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_service_role ON public.payment_methods TO service_role USING (true) WITH CHECK (true);


--
-- Name: payment_methods payment_methods_update_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_methods_update_tenant ON public.payment_methods FOR UPDATE TO authenticated USING ((tenant_id = public.get_current_tenant_id())) WITH CHECK ((tenant_id = public.get_current_tenant_id()));


--
-- Name: payment_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_schedules payment_schedules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_schedules_select ON public.payment_schedules FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.lease_tenants lt
  WHERE ((lt.lease_id = payment_schedules.lease_id) AND (lt.tenant_id = public.get_current_tenant_id())))) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = payment_schedules.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: payment_schedules payment_schedules_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_schedules_service_role ON public.payment_schedules TO service_role USING (true) WITH CHECK (true);


--
-- Name: payment_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_transactions payment_transactions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_transactions_select ON public.payment_transactions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.rent_payments rp
  WHERE ((rp.id = payment_transactions.rent_payment_id) AND (rp.tenant_id = public.get_current_tenant_id())))) OR (EXISTS ( SELECT 1
   FROM (public.rent_payments rp
     JOIN public.leases l ON ((rp.lease_id = l.id)))
  WHERE ((rp.id = payment_transactions.rent_payment_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: payment_transactions payment_transactions_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_transactions_service_role ON public.payment_transactions TO service_role USING (true) WITH CHECK (true);


--
-- Name: properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

--
-- Name: properties properties_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY properties_delete_owner ON public.properties FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: properties properties_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY properties_insert_owner ON public.properties FOR INSERT TO authenticated WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: properties properties_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY properties_select_owner ON public.properties FOR SELECT TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: properties properties_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY properties_service_role ON public.properties TO service_role USING (true) WITH CHECK (true);


--
-- Name: properties properties_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY properties_update_owner ON public.properties FOR UPDATE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id())) WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: property_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

--
-- Name: property_images property_images_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_images_delete_owner ON public.property_images FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = property_images.property_id) AND (p.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: property_images property_images_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_images_insert_owner ON public.property_images FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = property_images.property_id) AND (p.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: property_images property_images_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_images_select_owner ON public.property_images FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = property_images.property_id) AND (p.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: property_images property_images_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_images_service_role ON public.property_images TO service_role USING (true) WITH CHECK (true);


--
-- Name: property_images property_images_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_images_update_owner ON public.property_images FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = property_images.property_id) AND (p.property_owner_id = public.get_current_property_owner_id()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.properties p
  WHERE ((p.id = property_images.property_id) AND (p.property_owner_id = public.get_current_property_owner_id())))));


--
-- Name: property_owners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.property_owners ENABLE ROW LEVEL SECURITY;

--
-- Name: property_owners property_owners_auth_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_auth_admin_select ON public.property_owners FOR SELECT TO supabase_auth_admin USING (true);


--
-- Name: property_owners property_owners_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_delete_own ON public.property_owners FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: property_owners property_owners_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_insert_own ON public.property_owners FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: property_owners property_owners_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_select_own ON public.property_owners FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: property_owners property_owners_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_service_role ON public.property_owners TO service_role USING (true) WITH CHECK (true);


--
-- Name: property_owners property_owners_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY property_owners_update_own ON public.property_owners FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: rent_due; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_due ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_due rent_due_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_due_select ON public.rent_due FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.lease_tenants lt
  WHERE ((lt.lease_id = rent_due.lease_id) AND (lt.tenant_id = public.get_current_tenant_id())))) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = rent_due.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: rent_due rent_due_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_due_service_role ON public.rent_due TO service_role USING (true) WITH CHECK (true);


--
-- Name: rent_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_payments rent_payments_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_payments_delete_owner ON public.rent_payments FOR DELETE TO authenticated USING ((lease_id IN ( SELECT l.id
   FROM public.leases l
  WHERE (l.property_owner_id = public.get_current_property_owner_id()))));


--
-- Name: rent_payments rent_payments_insert_tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_payments_insert_tenant ON public.rent_payments FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_current_tenant_id()));


--
-- Name: rent_payments rent_payments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_payments_select ON public.rent_payments FOR SELECT TO authenticated USING (((tenant_id = public.get_current_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = rent_payments.lease_id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: rent_payments rent_payments_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_payments_service_role ON public.rent_payments TO service_role USING (true) WITH CHECK (true);


--
-- Name: rent_payments rent_payments_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_payments_update_owner ON public.rent_payments FOR UPDATE TO authenticated USING ((lease_id IN ( SELECT l.id
   FROM public.leases l
  WHERE (l.property_owner_id = public.get_current_property_owner_id())))) WITH CHECK ((lease_id IN ( SELECT l.id
   FROM public.leases l
  WHERE (l.property_owner_id = public.get_current_property_owner_id()))));


--
-- Name: report_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: report_runs report_runs_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_runs_service_role ON public.report_runs TO service_role USING (true) WITH CHECK (true);


--
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- Name: reports reports_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_delete_owner ON public.reports FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: reports reports_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_insert_owner ON public.reports FOR INSERT TO authenticated WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: reports reports_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_select_owner ON public.reports FOR SELECT TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: reports reports_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_service_role ON public.reports TO service_role USING (true) WITH CHECK (true);


--
-- Name: reports reports_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_update_owner ON public.reports FOR UPDATE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id())) WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: security_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: security_audit_log security_audit_log_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY security_audit_log_service_role ON public.security_audit_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_auth_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_auth_admin_select ON public.subscriptions FOR SELECT TO supabase_auth_admin USING (true);


--
-- Name: subscriptions subscriptions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: subscriptions subscriptions_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_service_role ON public.subscriptions TO service_role USING (true) WITH CHECK (true);


--
-- Name: tenant_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_invitations tenant_invitations_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_invitations_delete_owner ON public.tenant_invitations FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: tenant_invitations tenant_invitations_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_invitations_insert_owner ON public.tenant_invitations FOR INSERT TO authenticated WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: tenant_invitations tenant_invitations_select_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_invitations_select_owner ON public.tenant_invitations FOR SELECT TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: tenant_invitations tenant_invitations_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_invitations_service_role ON public.tenant_invitations TO service_role USING (true) WITH CHECK (true);


--
-- Name: tenant_invitations tenant_invitations_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_invitations_update_owner ON public.tenant_invitations FOR UPDATE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id())) WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_delete_own ON public.tenants FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: tenants tenants_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_insert_own ON public.tenants FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: tenants tenants_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_select_own ON public.tenants FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.lease_tenants lt
     JOIN public.leases l ON ((lt.lease_id = l.id)))
  WHERE ((lt.tenant_id = tenants.id) AND (l.property_owner_id = public.get_current_property_owner_id()))))));


--
-- Name: tenants tenants_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_service_role ON public.tenants TO service_role USING (true) WITH CHECK (true);


--
-- Name: tenants tenants_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_update_own ON public.tenants FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: properties tenants_view_properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_view_properties ON public.properties FOR SELECT TO authenticated USING ((id IN ( SELECT DISTINCT p.id
   FROM (((public.properties p
     JOIN public.units u ON ((u.property_id = p.id)))
     JOIN public.leases l ON ((l.unit_id = u.id)))
     JOIN public.lease_tenants lt ON ((lt.lease_id = l.id)))
  WHERE (lt.tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid))));


--
-- Name: units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

--
-- Name: units units_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY units_delete_owner ON public.units FOR DELETE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: units units_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY units_insert_owner ON public.units FOR INSERT TO authenticated WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: units units_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY units_select ON public.units FOR SELECT TO authenticated USING (((property_owner_id = public.get_current_property_owner_id()) OR (EXISTS ( SELECT 1
   FROM (public.leases l
     JOIN public.lease_tenants lt ON ((l.id = lt.lease_id)))
  WHERE ((l.unit_id = units.id) AND (lt.tenant_id = public.get_current_tenant_id()))))));


--
-- Name: units units_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY units_service_role ON public.units TO service_role USING (true) WITH CHECK (true);


--
-- Name: units units_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY units_update_owner ON public.units FOR UPDATE TO authenticated USING ((property_owner_id = public.get_current_property_owner_id())) WITH CHECK ((property_owner_id = public.get_current_property_owner_id()));


--
-- Name: user_access_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_access_log ENABLE ROW LEVEL SECURITY;

--
-- Name: user_access_log user_access_log_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_access_log_service_role ON public.user_access_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_feature_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feature_access user_feature_access_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_feature_access_select_own ON public.user_feature_access FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_feature_access user_feature_access_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_feature_access_service_role ON public.user_feature_access TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences user_preferences_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_delete_own ON public.user_preferences FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_preferences user_preferences_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_insert_own ON public.user_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_preferences user_preferences_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_select_own ON public.user_preferences FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_preferences user_preferences_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_service_role ON public.user_preferences TO service_role USING (true) WITH CHECK (true);


--
-- Name: user_preferences user_preferences_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_update_own ON public.user_preferences FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_auth_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_auth_admin_select ON public.users FOR SELECT TO supabase_auth_admin USING (true);


--
-- Name: users users_delete_own_record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_own_record ON public.users FOR DELETE TO authenticated USING ((id = auth.uid()));


--
-- Name: users users_insert_own_record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_record ON public.users FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) OR ((auth.jwt() ->> 'role'::text) = 'service_role'::text)));


--
-- Name: users users_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: users users_select_own_record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_record ON public.users FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: users users_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_service_role ON public.users TO service_role USING (true) WITH CHECK (true);


--
-- Name: users users_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_service_role_all ON public.users TO service_role USING (true) WITH CHECK (true);


--
-- Name: users users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: users users_update_own_record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_record ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: webhook_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_attempts webhook_attempts_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_attempts_service_role ON public.webhook_attempts TO service_role USING (true) WITH CHECK (true);


--
-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events webhook_events_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_events_service_role ON public.webhook_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: webhook_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_metrics webhook_metrics_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_metrics_service_role ON public.webhook_metrics TO service_role USING (true) WITH CHECK (true);


--
-- PostgreSQL database dump complete
--

\unrestrict VCsSYlNiZlgyOPsLqtDzJOuFCU7oo1maiQIaNUybNWhF59VHRu1RgwkMxBIAHXJ

