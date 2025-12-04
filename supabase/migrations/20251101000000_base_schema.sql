


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'Removed Stripe sync tables - using Stripe API directly instead';



CREATE TYPE "public"."invitation_type" AS ENUM (
    'platform_access',
    'lease_signing'
);


ALTER TYPE "public"."invitation_type" OWNER TO "postgres";


CREATE TYPE "public"."signature_method" AS ENUM (
    'in_app',
    'docuseal'
);


ALTER TYPE "public"."signature_method" OWNER TO "postgres";


CREATE TYPE "public"."stripe_subscription_status" AS ENUM (
    'none',
    'pending',
    'active',
    'failed'
);


ALTER TYPE "public"."stripe_subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acquire_internal_event_lock"("p_event_name" "text", "p_idempotency_key" "text", "p_payload_hash" "text") RETURNS TABLE("lock_acquired" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Atomic INSERT with ON CONFLICT DO NOTHING
    -- FOUND will be true only if the INSERT succeeded (no conflict)
    INSERT INTO public.processed_internal_events (event_name, idempotency_key, payload_hash, status, created_at)
    VALUES (p_event_name, p_idempotency_key, p_payload_hash, 'processing', now())
    ON CONFLICT (event_name, idempotency_key) DO NOTHING;

    RETURN QUERY SELECT FOUND AS lock_acquired;
END;
$$;


ALTER FUNCTION "public"."acquire_internal_event_lock"("p_event_name" "text", "p_idempotency_key" "text", "p_payload_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acquire_internal_event_lock"("p_event_name" "text", "p_idempotency_key" "text", "p_payload_hash" "text") IS 'Atomically acquires a lock for processing an internal event. Returns lock_acquired=true if successful, false if event already exists.';



CREATE OR REPLACE FUNCTION "public"."activate_lease_with_pending_subscription"("p_lease_id" "uuid") RETURNS TABLE("success" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lease RECORD;
BEGIN
  -- Step 1: Lock the lease row to prevent concurrent modifications
  SELECT
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at,
    stripe_subscription_status,
    stripe_subscription_id
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;

  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Lease not found'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check if already active (idempotent - allow re-entry)
  IF v_lease.lease_status = 'active' THEN
    -- Already active - return success but don't modify
    RETURN QUERY SELECT TRUE, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 4: Validate lease status is pending_signature
  IF v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, ('Lease must be pending_signature to activate, current status: ' || v_lease.lease_status)::TEXT;
    RETURN;
  END IF;

  -- Step 5: Validate both parties have signed
  IF v_lease.owner_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Owner has not signed the lease'::TEXT;
    RETURN;
  END IF;

  IF v_lease.tenant_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Tenant has not signed the lease'::TEXT;
    RETURN;
  END IF;

  -- Step 6: Atomically activate lease with pending subscription status
  UPDATE public.leases
  SET
    lease_status = 'active',
    stripe_subscription_status = 'pending',
    subscription_last_attempt_at = NOW(),
    subscription_retry_count = 0,
    subscription_failure_reason = NULL,
    updated_at = NOW()
  WHERE id = p_lease_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


ALTER FUNCTION "public"."activate_lease_with_pending_subscription"("p_lease_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."activate_lease_with_pending_subscription"("p_lease_id" "uuid") IS 'Atomically activates a lease with pending subscription status. Called after both parties sign. Returns success/failure. Caller should then create Stripe subscription and update status to active/failed.';



CREATE OR REPLACE FUNCTION "public"."check_user_feature_access"("p_user_id" "text", "p_feature" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- All users have all features for now (can be restricted by plan later)
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."check_user_feature_access"("p_user_id" "text", "p_feature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_internal_events"("days_to_keep" integer DEFAULT 30) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.processed_internal_events
    WHERE created_at < now() - (days_to_keep || ' days')::interval;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_internal_events"("days_to_keep" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_internal_events"("days_to_keep" integer) IS 'Removes old processed events. Default retention: 30 days.';



CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  claims jsonb;
  auth_user_type text;
  public_user_type text;
  final_user_type text;
  stripe_customer_id_value text;
BEGIN
  -- Get current claims from event
  claims := event -> 'claims';

  -- PRIMARY: Read user_type from auth.users.raw_app_meta_data (native Supabase Auth)
  -- This is the authoritative source: server-only editable, part of auth schema
  SELECT raw_app_meta_data->>'user_type'
  INTO auth_user_type
  FROM auth.users
  WHERE id = (event ->> 'user_id')::uuid;

  -- FALLBACK: Read from public.users for backward compatibility
  -- Used when raw_app_meta_data doesn't have user_type yet
  SELECT u.user_type, u.stripe_customer_id
  INTO public_user_type, stripe_customer_id_value
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  -- Priority: auth.users.raw_app_meta_data > public.users > event user_metadata > default
  final_user_type := UPPER(COALESCE(
    auth_user_type,
    public_user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  -- Set app_metadata claims
  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(final_user_type));

  -- Only set stripe_customer_id if it has a value (avoid NULL breaking jsonb_set)
  IF stripe_customer_id_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(stripe_customer_id_value));
  END IF;

  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Custom access token hook that reads user_type from auth.users.raw_app_meta_data (primary, server-only editable) with fallback to public.users. Adds user_type and stripe_customer_id to JWT claims.';



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


ALTER FUNCTION "public"."get_billing_insights"("owner_id_param" "uuid", "start_date_param" timestamp without time zone, "end_date_param" timestamp without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_billing_insights"("owner_id_param" "uuid", "start_date_param" timestamp without time zone, "end_date_param" timestamp without time zone) IS 'Returns billing insights including revenue, churn rate, and MRR';



CREATE OR REPLACE FUNCTION "public"."get_current_property_owner_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid());
$$;


ALTER FUNCTION "public"."get_current_property_owner_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT id FROM public.tenants WHERE user_id = (SELECT auth.uid());
$$;


ALTER FUNCTION "public"."get_current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_type"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT user_type FROM public.users WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_user_type"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") IS 'Returns comprehensive dashboard statistics including properties, tenants, units, leases, maintenance, and revenue (FIXED: aggregation error)';



CREATE OR REPLACE FUNCTION "public"."get_dashboard_time_series"("p_user_id" "uuid", "p_metric_name" "text", "p_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_dashboard_time_series"("p_user_id" "uuid", "p_metric_name" "text", "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_time_series"("p_user_id" "uuid", "p_metric_name" "text", "p_days" integer) IS 'Returns time-series data for dashboard metrics over specified days';



CREATE OR REPLACE FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") IS 'Returns maintenance analytics including resolution time and completion rate';



CREATE OR REPLACE FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text" DEFAULT 'month'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text") IS 'Returns metric trend comparing current vs previous period';



CREATE OR REPLACE FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer DEFAULT 12) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer) IS 'Returns monthly occupancy trends over specified months';



CREATE OR REPLACE FUNCTION "public"."get_owner_lease_tenant_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT lt.id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  WHERE l.property_owner_id = get_current_property_owner_id();
$$;


ALTER FUNCTION "public"."get_owner_lease_tenant_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") IS 'Returns property performance metrics for all user properties';



CREATE OR REPLACE FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") IS 'Returns revenue trends for user properties (month-over-month)';



CREATE OR REPLACE FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer DEFAULT 12) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer) IS 'Returns monthly revenue trends over specified months';



CREATE OR REPLACE FUNCTION "public"."get_tenant_lease_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT lt.lease_id
  FROM lease_tenants lt
  WHERE lt.tenant_id = get_current_tenant_id();
$$;


ALTER FUNCTION "public"."get_tenant_lease_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_property_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT u.property_id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  JOIN units u ON u.id = l.unit_id
  WHERE lt.tenant_id = get_current_tenant_id();
$$;


ALTER FUNCTION "public"."get_tenant_property_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_unit_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT l.unit_id
  FROM lease_tenants lt
  JOIN leases l ON l.id = lt.lease_id
  WHERE lt.tenant_id = get_current_tenant_id();
$$;


ALTER FUNCTION "public"."get_tenant_unit_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenants_by_owner"("p_user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  -- Only returns results if the caller is the same user requesting their own data
  -- auth.uid() returns the authenticated user's ID from the JWT
  SELECT DISTINCT t.id
  FROM tenants t
  INNER JOIN lease_tenants lt ON lt.tenant_id = t.id
  INNER JOIN leases l ON l.id = lt.lease_id
  INNER JOIN units u ON u.id = l.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  INNER JOIN property_owners po ON po.id = p.property_owner_id
  WHERE po.user_id = p_user_id
    AND p_user_id = auth.uid();  -- Authorization: only allow querying your own data
$$;


ALTER FUNCTION "public"."get_tenants_by_owner"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenants_by_owner"("p_user_id" "uuid") IS 'Returns tenant IDs for properties owned by the given user.
SECURITY INVOKER: Runs with caller permissions.
Authorization: Only returns data when p_user_id matches auth.uid().';



CREATE OR REPLACE FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT t.id
  FROM tenants t
  INNER JOIN lease_tenants lt ON lt.tenant_id = t.id
  INNER JOIN leases l ON l.id = lt.lease_id
  INNER JOIN units u ON u.id = l.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  INNER JOIN property_owners po ON po.id = p.property_owner_id
  WHERE po.user_id = p_user_id
    AND p_user_id = auth.uid()  -- Authorization: only allow querying your own data
    AND l.lease_status = 'active';
$$;


ALTER FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") IS 'Returns tenant IDs with active leases for properties owned by the given user.
SECURITY INVOKER: Runs with caller permissions.
Authorization: Only returns data when p_user_id matches auth.uid().';



CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_activities"("p_user_id" "text", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "text", "title" "text", "description" "text", "activity_type" "text", "entity_type" "text", "entity_id" "text", "user_id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  WHERE a.user_id = p_user_id::uuid
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_user_dashboard_activities"("p_user_id" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_plan_limits"("p_user_id" "text") RETURNS TABLE("property_limit" integer, "unit_limit" integer, "user_limit" integer, "storage_gb" integer, "has_api_access" boolean, "has_white_label" boolean, "support_level" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT
    100::int,           -- property_limit
    1000::int,          -- unit_limit
    50::int,            -- user_limit
    100::int,           -- storage_gb
    true::boolean,      -- has_api_access
    false::boolean,     -- has_white_label
    'standard'::text;   -- support_level
END;
$$;


ALTER FUNCTION "public"."get_user_plan_limits"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_property_image_upload"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $$
DECLARE
  v_property_id uuid;
  v_image_url text;
  v_next_display_order integer;
BEGIN
  -- Only process property-images bucket
  IF NEW.bucket_id != 'property-images' THEN
    RETURN NEW;
  END IF;

  -- Only process when metadata is populated (second operation)
  -- The storage API does INSERT first, then UPDATE with metadata
  IF NEW.metadata IS NULL OR OLD.metadata IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Extract property_id from folder structure (e.g., "{property_id}/filename.webp")
  v_property_id := (storage.foldername(NEW.name))[1]::uuid;

  -- Skip if we can't extract a valid property_id
  IF v_property_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Construct public URL for the image (hardcoded project ref)
  v_image_url := CONCAT(
    'https://bshjmbshupiibfiewpxb.supabase.co',
    '/storage/v1/object/public/property-images/',
    NEW.name
  );

  -- Get next display_order for this property
  SELECT COALESCE(MAX(display_order), -1) + 1
  INTO v_next_display_order
  FROM public.property_images
  WHERE property_id = v_property_id;

  -- Insert record into property_images table
  INSERT INTO public.property_images (
    property_id,
    image_url,
    display_order,
    created_at
  ) VALUES (
    v_property_id,
    v_image_url,
    v_next_display_order,
    NOW()
  )
  -- Skip if record already exists (idempotent)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_property_image_upload"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."health_check"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT jsonb_build_object('ok', true, 'timestamp', NOW());
$$;


ALTER FUNCTION "public"."health_check"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."health_check"() IS 'Health check endpoint for backend monitoring - returns {ok: true} if database is accessible';



CREATE OR REPLACE FUNCTION "public"."record_processed_stripe_event_lock"("p_stripe_event_id" "text") RETURNS TABLE("success" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO stripe_processed_events (stripe_event_id, processed_at)
  VALUES (p_stripe_event_id, NOW())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true;
END;
$$;


ALTER FUNCTION "public"."record_processed_stripe_event_lock"("p_stripe_event_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sign_lease_and_check_activation"("p_lease_id" "uuid", "p_signer_type" "text", "p_signature_ip" "text", "p_signed_at" timestamp with time zone, "p_signature_method" "public"."signature_method" DEFAULT 'in_app'::"public"."signature_method") RETURNS TABLE("success" boolean, "both_signed" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lease RECORD;
BEGIN
  -- Step 1: Lock the lease row to prevent concurrent modifications
  SELECT 
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;
  
  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease not found'::TEXT;
    RETURN;
  END IF;
  
  -- Step 3: Validate lease status
  IF p_signer_type = 'tenant' AND v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease must be pending signature for tenant to sign'::TEXT;
    RETURN;
  END IF;
  
  IF p_signer_type = 'owner' AND v_lease.lease_status NOT IN ('draft', 'pending_signature') THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease cannot be signed in its current status'::TEXT;
    RETURN;
  END IF;
  
  -- Step 4: Check if already signed (prevent double signing)
  IF p_signer_type = 'owner' AND v_lease.owner_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Owner has already signed this lease'::TEXT;
    RETURN;
  END IF;
  
  IF p_signer_type = 'tenant' AND v_lease.tenant_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Tenant has already signed this lease'::TEXT;
    RETURN;
  END IF;
  
  -- Step 5: Record the signature atomically (now includes signature_method)
  IF p_signer_type = 'owner' THEN
    UPDATE public.leases
    SET 
      owner_signed_at = p_signed_at,
      owner_signature_ip = p_signature_ip,
      owner_signature_method = p_signature_method
    WHERE id = p_lease_id;
    
    -- Return whether both are now signed (tenant was already signed)
    RETURN QUERY SELECT TRUE, (v_lease.tenant_signed_at IS NOT NULL), NULL::TEXT;
  ELSE
    UPDATE public.leases
    SET 
      tenant_signed_at = p_signed_at,
      tenant_signature_ip = p_signature_ip,
      tenant_signature_method = p_signature_method
    WHERE id = p_lease_id;
    
    -- Return whether both are now signed (owner was already signed)
    RETURN QUERY SELECT TRUE, (v_lease.owner_signed_at IS NOT NULL), NULL::TEXT;
  END IF;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."sign_lease_and_check_activation"("p_lease_id" "uuid", "p_signer_type" "text", "p_signature_ip" "text", "p_signed_at" timestamp with time zone, "p_signature_method" "public"."signature_method") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sign_lease_and_check_activation"("p_lease_id" "uuid", "p_signer_type" "text", "p_signature_ip" "text", "p_signed_at" timestamp with time zone, "p_signature_method" "public"."signature_method") IS 'Atomically records a lease signature with row-level locking. Returns whether both parties have now signed. Prevents race conditions in simultaneous signing. Now tracks signature method (in_app or docuseal).';



CREATE OR REPLACE FUNCTION "public"."sync_user_type_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Sync user_type to auth.users.raw_app_meta_data
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object('user_type', NEW.user_type)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_type_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_tenant"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_is_tenant"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "activity_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "storage_url" "text" NOT NULL,
    "file_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "maintenance_request_id" "uuid" NOT NULL,
    "vendor_name" "text",
    "amount" integer NOT NULL,
    "expense_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lease_tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "responsibility_percentage" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lease_tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leases" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "primary_tenant_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "rent_amount" integer NOT NULL,
    "rent_currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "security_deposit" integer NOT NULL,
    "payment_day" integer DEFAULT 1 NOT NULL,
    "late_fee_amount" integer,
    "late_fee_days" integer DEFAULT 5,
    "lease_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "stripe_subscription_id" "text",
    "auto_pay_enabled" boolean DEFAULT false,
    "grace_period_days" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "property_owner_id" "uuid",
    "owner_signed_at" timestamp with time zone,
    "owner_signature_ip" "text",
    "tenant_signed_at" timestamp with time zone,
    "tenant_signature_ip" "text",
    "docuseal_submission_id" "text",
    "sent_for_signature_at" timestamp with time zone,
    "owner_signature_method" "public"."signature_method",
    "tenant_signature_method" "public"."signature_method",
    "stripe_subscription_status" "public"."stripe_subscription_status" DEFAULT 'none'::"public"."stripe_subscription_status" NOT NULL,
    "subscription_failure_reason" "text",
    "subscription_retry_count" integer DEFAULT 0,
    "subscription_last_attempt_at" timestamp with time zone,
    CONSTRAINT "leases_lease_status_check" CHECK (("lease_status" = ANY (ARRAY['draft'::"text", 'pending_signature'::"text", 'active'::"text", 'ended'::"text", 'terminated'::"text"])))
);


ALTER TABLE "public"."leases" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leases"."owner_signed_at" IS 'Timestamp when property owner signed the lease';



COMMENT ON COLUMN "public"."leases"."owner_signature_ip" IS 'IP address of owner at time of signing (for audit trail)';



COMMENT ON COLUMN "public"."leases"."tenant_signed_at" IS 'Timestamp when tenant signed the lease';



COMMENT ON COLUMN "public"."leases"."tenant_signature_ip" IS 'IP address of tenant at time of signing (for audit trail)';



COMMENT ON COLUMN "public"."leases"."docuseal_submission_id" IS 'DocuSeal submission ID for e-signature tracking';



COMMENT ON COLUMN "public"."leases"."sent_for_signature_at" IS 'Timestamp when lease was sent to tenant for signing';



COMMENT ON COLUMN "public"."leases"."owner_signature_method" IS 'Method used for owner signature: in_app (direct with IP capture) or docuseal (third-party e-signature)';



COMMENT ON COLUMN "public"."leases"."tenant_signature_method" IS 'Method used for tenant signature: in_app (direct with IP capture) or docuseal (third-party e-signature)';



COMMENT ON COLUMN "public"."leases"."stripe_subscription_status" IS 'Tracks Stripe subscription provisioning state: none -> pending -> active/failed. Enables database-first activation with deferred billing.';



COMMENT ON COLUMN "public"."leases"."subscription_failure_reason" IS 'Error message from last failed subscription creation attempt. Null on success.';



COMMENT ON COLUMN "public"."leases"."subscription_retry_count" IS 'Number of times subscription creation has been attempted. Used for exponential backoff.';



COMMENT ON COLUMN "public"."leases"."subscription_last_attempt_at" IS 'Timestamp of last subscription creation attempt. Used for retry backoff calculation.';



COMMENT ON CONSTRAINT "leases_lease_status_check" ON "public"."leases" IS 'Lease workflow states: draft (owner editing) -> pending_signature (awaiting signatures) -> active (signed, billing on) -> ended/terminated';



CREATE TABLE IF NOT EXISTS "public"."maintenance_requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "description" "text" NOT NULL,
    "requested_by" "uuid",
    "assigned_to" "uuid",
    "estimated_cost" integer,
    "actual_cost" integer,
    "scheduled_date" "date",
    "completed_at" timestamp with time zone,
    "inspector_id" "uuid",
    "inspection_date" "date",
    "inspection_findings" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "property_owner_id" "uuid",
    "title" "text" DEFAULT 'New Maintenance Request'::"text" NOT NULL,
    CONSTRAINT "maintenance_requests_priority_check" CHECK (("priority" = ANY (ARRAY['urgent'::"text", 'high'::"text", 'normal'::"text", 'low'::"text"]))),
    CONSTRAINT "maintenance_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "maintenance_requests_title_not_empty" CHECK (("length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."maintenance_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "delivery_channel" "text",
    "attempt_count" integer DEFAULT 1,
    "last_error" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_logs_delivery_channel_check" CHECK (("delivery_channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'in_app'::"text", 'push'::"text"]))),
    CONSTRAINT "notification_logs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'bounced'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "stripe_payment_method_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "last_four" "text",
    "brand" "text",
    "exp_month" integer,
    "exp_year" integer,
    "bank_name" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_methods_type_check" CHECK (("type" = ANY (ARRAY['card'::"text", 'bank_account'::"text", 'ach'::"text", 'sepa_debit'::"text"])))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_schedules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "frequency" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "next_payment_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_schedules_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'annually'::"text"])))
);


ALTER TABLE "public"."payment_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "payment_method_id" "uuid",
    "rent_payment_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "amount" integer NOT NULL,
    "failure_reason" "text",
    "retry_count" integer DEFAULT 0,
    "attempted_at" timestamp with time zone DEFAULT "now"(),
    "last_attempted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_internal_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_name" "text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "status" "text" DEFAULT 'processing'::"text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "processed_internal_events_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'processed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."processed_internal_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."processed_internal_events" IS 'Tracks processed internal events for idempotency. Used by @OnEvent handlers to prevent duplicate processing.';



COMMENT ON COLUMN "public"."processed_internal_events"."event_name" IS 'Event name (e.g., maintenance.updated, payment.received)';



COMMENT ON COLUMN "public"."processed_internal_events"."idempotency_key" IS 'SHA-256 hash of event_name + payload for deduplication';



COMMENT ON COLUMN "public"."processed_internal_events"."payload_hash" IS 'Short hash of payload for debugging/auditing';



COMMENT ON COLUMN "public"."processed_internal_events"."status" IS 'Processing status: processing, processed, or failed';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'US'::"text" NOT NULL,
    "property_type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "date_sold" "date",
    "sale_price" numeric(12,2),
    CONSTRAINT "properties_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'sold'::"text"])))
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_owners" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_account_id" "text" NOT NULL,
    "business_name" "text",
    "business_type" "text" NOT NULL,
    "tax_id" "text",
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "onboarding_status" "text" DEFAULT 'not_started'::"text",
    "current_step" "text",
    "completion_percentage" integer DEFAULT 0,
    "onboarding_started_at" timestamp with time zone,
    "onboarding_completed_at" timestamp with time zone,
    "requirements_due" "text"[],
    "default_platform_fee_percent" numeric(5,2) DEFAULT 3.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_owners_onboarding_status_check" CHECK (("onboarding_status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."property_owners" OWNER TO "postgres";


COMMENT ON COLUMN "public"."property_owners"."stripe_account_id" IS 'Stripe Connect account ID for this property owner. One-to-one mapping with user.';



CREATE TABLE IF NOT EXISTS "public"."rent_due" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "unit_id" "uuid" NOT NULL,
    "lease_id" "uuid",
    "due_date" "date" NOT NULL,
    "amount" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rent_due_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text", 'waived'::"text"])))
);


ALTER TABLE "public"."rent_due" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rent_payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "lease_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "amount" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "payment_method_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "paid_date" timestamp with time zone,
    "application_fee_amount" integer NOT NULL,
    "late_fee_amount" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rent_payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."rent_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_runs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "report_id" "uuid" NOT NULL,
    "execution_status" "text" NOT NULL,
    "file_path" "text",
    "file_size" integer,
    "execution_time_ms" integer,
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "report_runs_execution_status_check" CHECK (("execution_status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."report_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "report_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "schedule_cron" "text",
    "next_run_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "property_owner_id" "uuid" NOT NULL
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "security_audit_log_event_type_check" CHECK (("event_type" = ANY (ARRAY['login'::"text", 'logout'::"text", 'password_change'::"text", 'password_failed'::"text", 'permission_change'::"text", 'data_access'::"text", 'audit'::"text"])))
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "stripe_price_id" "text",
    "status" "text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'canceled'::"text", 'past_due'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "unit_id" "uuid",
    "property_owner_id" "uuid" NOT NULL,
    "invitation_code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invitation_url" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "property_id" "uuid",
    "lease_id" "uuid",
    "type" "text" DEFAULT 'platform_access'::"text",
    CONSTRAINT "tenant_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "tenant_invitations_type_check" CHECK (("type" = ANY (ARRAY['platform_access'::"text", 'lease_signing'::"text"])))
);


ALTER TABLE "public"."tenant_invitations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenant_invitations"."unit_id" IS 'Optional: specific unit for the invitation (NULL if inviting to platform only)';



COMMENT ON COLUMN "public"."tenant_invitations"."property_id" IS 'Optional: property context for the invitation';



COMMENT ON COLUMN "public"."tenant_invitations"."lease_id" IS 'Optional: specific lease this invitation is for (for lease signing invitations)';



COMMENT ON COLUMN "public"."tenant_invitations"."type" IS 'Purpose of invitation: platform_access (join system) or lease_signing (sign specific lease)';



COMMENT ON CONSTRAINT "tenant_invitations_status_check" ON "public"."tenant_invitations" IS 'Invitation workflow: pending -> sent -> accepted/expired/cancelled';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date_of_birth" "date",
    "ssn_last_four" "text",
    "identity_verified" boolean DEFAULT false,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_customer_id" "text"
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "unit_number" "text",
    "bedrooms" integer,
    "bathrooms" numeric(3,1),
    "square_feet" integer,
    "rent_amount" integer NOT NULL,
    "rent_currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "rent_period" "text" DEFAULT 'monthly'::"text" NOT NULL,
    "status" "text" DEFAULT 'available'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "property_owner_id" "uuid",
    CONSTRAINT "units_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'occupied'::"text", 'maintenance'::"text"])))
);


ALTER TABLE "public"."units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_access_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "endpoint" "text",
    "method" "text",
    "status_code" integer,
    "accessed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_access_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_feature_access" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "feature_name" "text" NOT NULL,
    "access_level" "text" DEFAULT 'basic'::"text",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_feature_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'light'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "user_type" "text" NOT NULL,
    "stripe_customer_id" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "identity_verified_at" timestamp with time zone,
    "identity_verification_status" "text",
    "identity_verification_session_id" "text",
    "identity_verification_data" "jsonb",
    "identity_verification_error" "text",
    "onboarding_completed_at" timestamp with time zone,
    "onboarding_status" "text" DEFAULT 'not_started'::"text",
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"]))),
    CONSTRAINT "users_user_type_check" CHECK (("user_type" = ANY (ARRAY['OWNER'::"text", 'TENANT'::"text", 'MANAGER'::"text", 'ADMIN'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "webhook_event_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "retry_count" integer DEFAULT 0,
    "failure_reason" "text",
    "last_attempted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "webhook_attempts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'succeeded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."webhook_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" "text" NOT NULL,
    "webhook_source" "text" DEFAULT 'stripe'::"text" NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "external_id" "text",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "webhook_events_webhook_source_check" CHECK (("webhook_source" = ANY (ARRAY['stripe'::"text", 'auth'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."webhook_events"."external_id" IS 'External event ID for idempotency tracking. For Stripe webhooks, this stores the Stripe event ID (evt_xxx). Combined with webhook_source, ensures no duplicate event processing.';



CREATE TABLE IF NOT EXISTS "public"."webhook_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "event_type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "total_received" integer DEFAULT 0,
    "total_processed" integer DEFAULT 0,
    "total_failed" integer DEFAULT 0,
    "average_latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_metrics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_lease_id_tenant_id_key" UNIQUE ("lease_id", "tenant_id");



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_stripe_payment_method_id_key" UNIQUE ("stripe_payment_method_id");



ALTER TABLE ONLY "public"."payment_schedules"
    ADD CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_internal_events"
    ADD CONSTRAINT "processed_internal_events_event_name_idempotency_key_key" UNIQUE ("event_name", "idempotency_key");



ALTER TABLE ONLY "public"."processed_internal_events"
    ADD CONSTRAINT "processed_internal_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_owners"
    ADD CONSTRAINT "property_owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_owners"
    ADD CONSTRAINT "property_owners_stripe_account_id_key" UNIQUE ("stripe_account_id");



ALTER TABLE ONLY "public"."property_owners"
    ADD CONSTRAINT "property_owners_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."rent_due"
    ADD CONSTRAINT "rent_due_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_invitation_code_key" UNIQUE ("invitation_code");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "unique_webhook_source_external_id" UNIQUE ("webhook_source", "external_id");



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_access_log"
    ADD CONSTRAINT "user_access_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feature_access"
    ADD CONSTRAINT "user_feature_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feature_access"
    ADD CONSTRAINT "user_feature_access_user_id_feature_name_key" UNIQUE ("user_id", "feature_name");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."webhook_attempts"
    ADD CONSTRAINT "webhook_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_metrics"
    ADD CONSTRAINT "webhook_metrics_event_type_date_key" UNIQUE ("event_type", "date");



ALTER TABLE ONLY "public"."webhook_metrics"
    ADD CONSTRAINT "webhook_metrics_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_activity_type" ON "public"."activity" USING "btree" ("activity_type");



CREATE INDEX "idx_activity_created_at" ON "public"."activity" USING "btree" ("created_at");



CREATE INDEX "idx_activity_user_id" ON "public"."activity" USING "btree" ("user_id");



CREATE INDEX "idx_documents_document_type" ON "public"."documents" USING "btree" ("document_type");



CREATE INDEX "idx_documents_entity" ON "public"."documents" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_documents_entity_type_entity_id" ON "public"."documents" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_expenses_expense_date" ON "public"."expenses" USING "btree" ("expense_date");



CREATE INDEX "idx_expenses_maintenance_request_id" ON "public"."expenses" USING "btree" ("maintenance_request_id");



CREATE INDEX "idx_lease_tenants_lease_id" ON "public"."lease_tenants" USING "btree" ("lease_id");



CREATE INDEX "idx_lease_tenants_tenant_id" ON "public"."lease_tenants" USING "btree" ("tenant_id");



CREATE INDEX "idx_leases_draft" ON "public"."leases" USING "btree" ("lease_status") WHERE ("lease_status" = 'draft'::"text");



CREATE INDEX "idx_leases_lease_status" ON "public"."leases" USING "btree" ("lease_status");



CREATE INDEX "idx_leases_pending_signature" ON "public"."leases" USING "btree" ("lease_status") WHERE ("lease_status" = 'pending_signature'::"text");



CREATE INDEX "idx_leases_primary_tenant_id" ON "public"."leases" USING "btree" ("primary_tenant_id");



CREATE INDEX "idx_leases_property_id" ON "public"."leases" USING "btree" ("unit_id");



CREATE INDEX "idx_leases_property_owner_id" ON "public"."leases" USING "btree" ("property_owner_id");



CREATE INDEX "idx_leases_status" ON "public"."leases" USING "btree" ("lease_status");



CREATE INDEX "idx_leases_stripe_subscription_id" ON "public"."leases" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_leases_subscription_pending" ON "public"."leases" USING "btree" ("stripe_subscription_status") WHERE ("stripe_subscription_status" = ANY (ARRAY['pending'::"public"."stripe_subscription_status", 'failed'::"public"."stripe_subscription_status"]));



CREATE INDEX "idx_leases_tenant_id" ON "public"."leases" USING "btree" ("primary_tenant_id");



CREATE INDEX "idx_leases_unit_id" ON "public"."leases" USING "btree" ("unit_id");



CREATE INDEX "idx_maintenance_requests_assigned_to" ON "public"."maintenance_requests" USING "btree" ("assigned_to");



CREATE INDEX "idx_maintenance_requests_priority" ON "public"."maintenance_requests" USING "btree" ("priority");



CREATE INDEX "idx_maintenance_requests_property_owner_id" ON "public"."maintenance_requests" USING "btree" ("property_owner_id");



CREATE INDEX "idx_maintenance_requests_requested_by" ON "public"."maintenance_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_maintenance_requests_status" ON "public"."maintenance_requests" USING "btree" ("status");



CREATE INDEX "idx_maintenance_requests_tenant_id" ON "public"."maintenance_requests" USING "btree" ("tenant_id");



CREATE INDEX "idx_maintenance_requests_unit_id" ON "public"."maintenance_requests" USING "btree" ("unit_id");



CREATE INDEX "idx_notification_logs_notification_id" ON "public"."notification_logs" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_logs_status" ON "public"."notification_logs" USING "btree" ("status");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_payment_methods_is_default" ON "public"."payment_methods" USING "btree" ("is_default");



CREATE INDEX "idx_payment_methods_stripe_payment_method_id" ON "public"."payment_methods" USING "btree" ("stripe_payment_method_id");



CREATE INDEX "idx_payment_methods_tenant_id" ON "public"."payment_methods" USING "btree" ("tenant_id");



CREATE INDEX "idx_payment_schedules_lease_id" ON "public"."payment_schedules" USING "btree" ("lease_id");



CREATE INDEX "idx_payment_schedules_next_payment_date" ON "public"."payment_schedules" USING "btree" ("next_payment_date");



CREATE INDEX "idx_payment_transactions_payment_method_id" ON "public"."payment_transactions" USING "btree" ("payment_method_id");



CREATE INDEX "idx_payment_transactions_rent_payment_id" ON "public"."payment_transactions" USING "btree" ("rent_payment_id");



CREATE INDEX "idx_payment_transactions_status" ON "public"."payment_transactions" USING "btree" ("status");



CREATE INDEX "idx_payment_transactions_stripe_payment_intent_id" ON "public"."payment_transactions" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_processed_internal_events_created_at" ON "public"."processed_internal_events" USING "btree" ("created_at");



CREATE INDEX "idx_processed_internal_events_event_name" ON "public"."processed_internal_events" USING "btree" ("event_name");



CREATE INDEX "idx_processed_internal_events_status" ON "public"."processed_internal_events" USING "btree" ("status") WHERE ("status" = 'processing'::"text");



CREATE INDEX "idx_properties_date_sold" ON "public"."properties" USING "btree" ("date_sold");



CREATE INDEX "idx_properties_id" ON "public"."properties" USING "btree" ("id");



CREATE INDEX "idx_properties_property_owner_id" ON "public"."properties" USING "btree" ("property_owner_id");



CREATE INDEX "idx_properties_sale_price" ON "public"."properties" USING "btree" ("sale_price");



CREATE INDEX "idx_properties_status" ON "public"."properties" USING "btree" ("status");



CREATE INDEX "idx_property_images_property_id" ON "public"."property_images" USING "btree" ("property_id");



CREATE INDEX "idx_property_owners_onboarding_status" ON "public"."property_owners" USING "btree" ("onboarding_status");



CREATE INDEX "idx_property_owners_stripe_account_id" ON "public"."property_owners" USING "btree" ("stripe_account_id");



CREATE INDEX "idx_property_owners_user_id" ON "public"."property_owners" USING "btree" ("user_id");



CREATE INDEX "idx_rent_due_due_date" ON "public"."rent_due" USING "btree" ("due_date");



CREATE INDEX "idx_rent_due_unit_id" ON "public"."rent_due" USING "btree" ("unit_id");



CREATE INDEX "idx_rent_payments_lease_id" ON "public"."rent_payments" USING "btree" ("lease_id");



CREATE INDEX "idx_rent_payments_status" ON "public"."rent_payments" USING "btree" ("status");



CREATE INDEX "idx_rent_payments_stripe_payment_intent_id" ON "public"."rent_payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_rent_payments_tenant_id" ON "public"."rent_payments" USING "btree" ("tenant_id");



CREATE INDEX "idx_rent_payments_tenant_id_created_at" ON "public"."rent_payments" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_report_runs_execution_status" ON "public"."report_runs" USING "btree" ("execution_status");



CREATE INDEX "idx_report_runs_report_id" ON "public"."report_runs" USING "btree" ("report_id");



CREATE INDEX "idx_report_runs_started_at" ON "public"."report_runs" USING "btree" ("started_at");



CREATE INDEX "idx_reports_next_run_at" ON "public"."reports" USING "btree" ("next_run_at");



CREATE INDEX "idx_reports_property_owner_id" ON "public"."reports" USING "btree" ("property_owner_id");



CREATE INDEX "idx_reports_report_type" ON "public"."reports" USING "btree" ("report_type");



CREATE INDEX "idx_security_audit_log_created_at" ON "public"."security_audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_security_audit_log_event_type" ON "public"."security_audit_log" USING "btree" ("event_type");



CREATE INDEX "idx_security_audit_log_user_id" ON "public"."security_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_tenant_invitations_accepted_by_user_id" ON "public"."tenant_invitations" USING "btree" ("accepted_by_user_id");



CREATE INDEX "idx_tenant_invitations_email" ON "public"."tenant_invitations" USING "btree" ("email");



CREATE INDEX "idx_tenant_invitations_lease_id" ON "public"."tenant_invitations" USING "btree" ("lease_id") WHERE ("lease_id" IS NOT NULL);



CREATE INDEX "idx_tenant_invitations_property_owner_id" ON "public"."tenant_invitations" USING "btree" ("property_owner_id");



CREATE INDEX "idx_tenant_invitations_status" ON "public"."tenant_invitations" USING "btree" ("status");



CREATE INDEX "idx_tenant_invitations_type" ON "public"."tenant_invitations" USING "btree" ("type");



CREATE INDEX "idx_tenant_invitations_unit_id" ON "public"."tenant_invitations" USING "btree" ("unit_id");



CREATE INDEX "idx_tenants_identity_verified" ON "public"."tenants" USING "btree" ("identity_verified");



CREATE INDEX "idx_tenants_user_id" ON "public"."tenants" USING "btree" ("user_id");



CREATE INDEX "idx_units_property_id" ON "public"."units" USING "btree" ("property_id");



CREATE INDEX "idx_units_property_owner_id" ON "public"."units" USING "btree" ("property_owner_id") WHERE ("property_owner_id" IS NOT NULL);



CREATE INDEX "idx_units_status" ON "public"."units" USING "btree" ("status");



CREATE INDEX "idx_user_access_log_accessed_at" ON "public"."user_access_log" USING "btree" ("accessed_at");



CREATE INDEX "idx_user_access_log_user_id" ON "public"."user_access_log" USING "btree" ("user_id");



CREATE INDEX "idx_user_feature_access_feature_name" ON "public"."user_feature_access" USING "btree" ("feature_name");



CREATE INDEX "idx_user_feature_access_user_id" ON "public"."user_feature_access" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("status");



CREATE INDEX "idx_users_stripe_customer_id" ON "public"."users" USING "btree" ("stripe_customer_id");



CREATE INDEX "idx_users_user_type" ON "public"."users" USING "btree" ("user_type");



CREATE INDEX "idx_webhook_attempts_status" ON "public"."webhook_attempts" USING "btree" ("status");



CREATE INDEX "idx_webhook_attempts_webhook_event_id" ON "public"."webhook_attempts" USING "btree" ("webhook_event_id");



CREATE INDEX "idx_webhook_events_created_at" ON "public"."webhook_events" USING "btree" ("created_at");



CREATE INDEX "idx_webhook_events_event_type" ON "public"."webhook_events" USING "btree" ("event_type");



CREATE INDEX "idx_webhook_events_source_external_id" ON "public"."webhook_events" USING "btree" ("webhook_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_webhook_events_webhook_source" ON "public"."webhook_events" USING "btree" ("webhook_source");



CREATE INDEX "idx_webhook_metrics_date" ON "public"."webhook_metrics" USING "btree" ("date");



CREATE INDEX "idx_webhook_metrics_event_type" ON "public"."webhook_metrics" USING "btree" ("event_type");



CREATE OR REPLACE TRIGGER "sync_user_type_trigger" AFTER UPDATE OF "user_type" ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."sync_user_type_to_auth"();



ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "public"."maintenance_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lease_tenants"
    ADD CONSTRAINT "lease_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_primary_tenant_id_fkey" FOREIGN KEY ("primary_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id");



ALTER TABLE ONLY "public"."leases"
    ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_schedules"
    ADD CONSTRAINT "payment_schedules_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_rent_payment_id_fkey" FOREIGN KEY ("rent_payment_id") REFERENCES "public"."rent_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_images"
    ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_owners"
    ADD CONSTRAINT "property_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_due"
    ADD CONSTRAINT "rent_due_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rent_payments"
    ADD CONSTRAINT "rent_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."report_runs"
    ADD CONSTRAINT "report_runs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."units"
    ADD CONSTRAINT "units_property_owner_id_fkey" FOREIGN KEY ("property_owner_id") REFERENCES "public"."property_owners"("id");



ALTER TABLE ONLY "public"."user_access_log"
    ADD CONSTRAINT "user_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_feature_access"
    ADD CONSTRAINT "user_feature_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_attempts"
    ADD CONSTRAINT "webhook_attempts_webhook_event_id_fkey" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_events"("id") ON DELETE CASCADE;



ALTER TABLE "public"."activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_select_own" ON "public"."activity" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



COMMENT ON POLICY "activity_select_own" ON "public"."activity" IS 'Optimized: Uses (SELECT auth.uid()) for better query planning';



CREATE POLICY "activity_service_role" ON "public"."activity" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete_owner" ON "public"."documents" FOR DELETE TO "authenticated" USING (((("entity_type" = 'property'::"text") AND ("entity_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."property_owner_id" = "public"."get_current_property_owner_id"())))) OR (("entity_type" = 'maintenance_request'::"text") AND ("entity_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_owner_id" = "public"."get_current_property_owner_id"()))))));



CREATE POLICY "documents_insert_owner" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (((("entity_type" = 'property'::"text") AND ("entity_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."property_owner_id" = "public"."get_current_property_owner_id"())))) OR (("entity_type" = 'maintenance_request'::"text") AND ("entity_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_owner_id" = "public"."get_current_property_owner_id"()))))));



CREATE POLICY "documents_select" ON "public"."documents" FOR SELECT TO "authenticated" USING (((("entity_type" = 'property'::"text") AND ("entity_id" IN ( SELECT "properties"."id"
   FROM "public"."properties"
  WHERE ("properties"."property_owner_id" = "public"."get_current_property_owner_id"())))) OR (("entity_type" = 'maintenance_request'::"text") AND ("entity_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."property_owner_id" = "public"."get_current_property_owner_id"())))) OR (("entity_type" = 'lease'::"text") AND ("entity_id" IN ( SELECT "lease_tenants"."lease_id"
   FROM "public"."lease_tenants"
  WHERE ("lease_tenants"."tenant_id" = "public"."get_current_tenant_id"())))) OR (("entity_type" = 'maintenance_request'::"text") AND ("entity_id" IN ( SELECT "maintenance_requests"."id"
   FROM "public"."maintenance_requests"
  WHERE ("maintenance_requests"."tenant_id" = "public"."get_current_tenant_id"()))))));



CREATE POLICY "documents_service_role" ON "public"."documents" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses_delete_owner" ON "public"."expenses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."maintenance_requests" "mr"
  WHERE (("mr"."id" = "expenses"."maintenance_request_id") AND ("mr"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "expenses_insert_owner" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."maintenance_requests" "mr"
  WHERE (("mr"."id" = "expenses"."maintenance_request_id") AND ("mr"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "expenses_select_owner" ON "public"."expenses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."maintenance_requests" "mr"
  WHERE (("mr"."id" = "expenses"."maintenance_request_id") AND ("mr"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "expenses_service_role" ON "public"."expenses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "expenses_update_owner" ON "public"."expenses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."maintenance_requests" "mr"
  WHERE (("mr"."id" = "expenses"."maintenance_request_id") AND ("mr"."property_owner_id" = "public"."get_current_property_owner_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."maintenance_requests" "mr"
  WHERE (("mr"."id" = "expenses"."maintenance_request_id") AND ("mr"."property_owner_id" = "public"."get_current_property_owner_id"())))));



ALTER TABLE "public"."lease_tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lease_tenants_delete_owner" ON "public"."lease_tenants" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "get_owner_lease_tenant_ids"."get_owner_lease_tenant_ids"
   FROM "public"."get_owner_lease_tenant_ids"() "get_owner_lease_tenant_ids"("get_owner_lease_tenant_ids"))));



CREATE POLICY "lease_tenants_insert_owner" ON "public"."lease_tenants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "lease_tenants"."lease_id") AND ("l"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "lease_tenants_select" ON "public"."lease_tenants" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR ("id" IN ( SELECT "get_owner_lease_tenant_ids"."get_owner_lease_tenant_ids"
   FROM "public"."get_owner_lease_tenant_ids"() "get_owner_lease_tenant_ids"("get_owner_lease_tenant_ids")))));



CREATE POLICY "lease_tenants_service_role" ON "public"."lease_tenants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "lease_tenants_update_owner" ON "public"."lease_tenants" FOR UPDATE TO "authenticated" USING (("id" IN ( SELECT "get_owner_lease_tenant_ids"."get_owner_lease_tenant_ids"
   FROM "public"."get_owner_lease_tenant_ids"() "get_owner_lease_tenant_ids"("get_owner_lease_tenant_ids"))));



ALTER TABLE "public"."leases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leases_delete_owner" ON "public"."leases" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "leases_insert_owner" ON "public"."leases" FOR INSERT TO "authenticated" WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "leases_select" ON "public"."leases" FOR SELECT TO "authenticated" USING ((("property_owner_id" = "public"."get_current_property_owner_id"()) OR ("id" IN ( SELECT "get_tenant_lease_ids"."get_tenant_lease_ids"
   FROM "public"."get_tenant_lease_ids"() "get_tenant_lease_ids"("get_tenant_lease_ids")))));



CREATE POLICY "leases_service_role" ON "public"."leases" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "leases_update_owner" ON "public"."leases" FOR UPDATE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"())) WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



ALTER TABLE "public"."maintenance_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "maintenance_requests_delete_owner" ON "public"."maintenance_requests" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "maintenance_requests_insert_tenant" ON "public"."maintenance_requests" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "maintenance_requests_select" ON "public"."maintenance_requests" FOR SELECT TO "authenticated" USING ((("property_owner_id" = "public"."get_current_property_owner_id"()) OR ("tenant_id" = "public"."get_current_tenant_id"())));



CREATE POLICY "maintenance_requests_service_role" ON "public"."maintenance_requests" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "maintenance_requests_update" ON "public"."maintenance_requests" FOR UPDATE TO "authenticated" USING ((("property_owner_id" = "public"."get_current_property_owner_id"()) OR ("tenant_id" = "public"."get_current_tenant_id"()))) WITH CHECK ((("property_owner_id" = "public"."get_current_property_owner_id"()) OR ("tenant_id" = "public"."get_current_tenant_id"())));



ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_logs_select_own" ON "public"."notification_logs" FOR SELECT TO "authenticated" USING (("notification_id" IN ( SELECT "notifications"."id"
   FROM "public"."notifications"
  WHERE ("notifications"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "notification_logs_service_role" ON "public"."notification_logs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_service_role" ON "public"."notifications" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_delete_tenant" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "payment_methods_insert_tenant" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "payment_methods_select_tenant" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "payment_methods_service_role" ON "public"."payment_methods" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "payment_methods_update_tenant" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."get_current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



ALTER TABLE "public"."payment_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_schedules_select" ON "public"."payment_schedules" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."lease_tenants" "lt"
  WHERE (("lt"."lease_id" = "payment_schedules"."lease_id") AND ("lt"."tenant_id" = "public"."get_current_tenant_id"())))) OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "payment_schedules"."lease_id") AND ("l"."property_owner_id" = "public"."get_current_property_owner_id"()))))));



CREATE POLICY "payment_schedules_service_role" ON "public"."payment_schedules" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."payment_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_transactions_select" ON "public"."payment_transactions" FOR SELECT TO "authenticated" USING ((("rent_payment_id" IN ( SELECT "rent_payments"."id"
   FROM "public"."rent_payments"
  WHERE ("rent_payments"."tenant_id" = "public"."get_current_tenant_id"()))) OR ("rent_payment_id" IN ( SELECT "rp"."id"
   FROM "public"."rent_payments" "rp"
  WHERE ("rp"."lease_id" IN ( SELECT "l"."id"
           FROM "public"."leases" "l"
          WHERE ("l"."property_owner_id" = "public"."get_current_property_owner_id"())))))));



COMMENT ON POLICY "payment_transactions_select" ON "public"."payment_transactions" IS 'Optimized: Uses nested IN pattern instead of EXISTS with JOIN';



CREATE POLICY "payment_transactions_service_role" ON "public"."payment_transactions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."processed_internal_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_delete_owner" ON "public"."properties" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "properties_insert_owner" ON "public"."properties" FOR INSERT TO "authenticated" WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "properties_select_owner" ON "public"."properties" FOR SELECT TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "properties_service_role" ON "public"."properties" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "properties_update_owner" ON "public"."properties" FOR UPDATE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"())) WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



ALTER TABLE "public"."property_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_images_delete_owner" ON "public"."property_images" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "property_images_insert_owner" ON "public"."property_images" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "property_images_select_owner" ON "public"."property_images" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."property_owner_id" = "public"."get_current_property_owner_id"())))));



CREATE POLICY "property_images_service_role" ON "public"."property_images" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "property_images_update_owner" ON "public"."property_images" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."property_owner_id" = "public"."get_current_property_owner_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."properties" "p"
  WHERE (("p"."id" = "property_images"."property_id") AND ("p"."property_owner_id" = "public"."get_current_property_owner_id"())))));



ALTER TABLE "public"."property_owners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_owners_auth_admin_select" ON "public"."property_owners" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "property_owners_delete_own" ON "public"."property_owners" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "property_owners_insert_own" ON "public"."property_owners" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "property_owners_select_own" ON "public"."property_owners" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "property_owners_service_role" ON "public"."property_owners" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "property_owners_update_own" ON "public"."property_owners" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."rent_due" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rent_due_select" ON "public"."rent_due" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."lease_tenants" "lt"
  WHERE (("lt"."lease_id" = "rent_due"."lease_id") AND ("lt"."tenant_id" = "public"."get_current_tenant_id"())))) OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "rent_due"."lease_id") AND ("l"."property_owner_id" = "public"."get_current_property_owner_id"()))))));



CREATE POLICY "rent_due_service_role" ON "public"."rent_due" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."rent_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rent_payments_delete_owner" ON "public"."rent_payments" FOR DELETE TO "authenticated" USING (("lease_id" IN ( SELECT "l"."id"
   FROM "public"."leases" "l"
  WHERE ("l"."property_owner_id" = "public"."get_current_property_owner_id"()))));



CREATE POLICY "rent_payments_insert_tenant" ON "public"."rent_payments" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."get_current_tenant_id"()));



CREATE POLICY "rent_payments_select" ON "public"."rent_payments" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_current_tenant_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."leases" "l"
  WHERE (("l"."id" = "rent_payments"."lease_id") AND ("l"."property_owner_id" = "public"."get_current_property_owner_id"()))))));



CREATE POLICY "rent_payments_service_role" ON "public"."rent_payments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "rent_payments_update_owner" ON "public"."rent_payments" FOR UPDATE TO "authenticated" USING (("lease_id" IN ( SELECT "l"."id"
   FROM "public"."leases" "l"
  WHERE ("l"."property_owner_id" = "public"."get_current_property_owner_id"())))) WITH CHECK (("lease_id" IN ( SELECT "l"."id"
   FROM "public"."leases" "l"
  WHERE ("l"."property_owner_id" = "public"."get_current_property_owner_id"()))));



ALTER TABLE "public"."report_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_runs_service_role" ON "public"."report_runs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reports_delete_owner" ON "public"."reports" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "reports_insert_owner" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "reports_select_owner" ON "public"."reports" FOR SELECT TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "reports_service_role" ON "public"."reports" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "reports_update_owner" ON "public"."reports" FOR UPDATE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"())) WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "security_audit_log_service_role" ON "public"."security_audit_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_auth_admin_select" ON "public"."subscriptions" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "subscriptions_select_own" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "subscriptions_service_role" ON "public"."subscriptions" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tenant_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_invitations_delete_owner" ON "public"."tenant_invitations" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "tenant_invitations_insert_owner" ON "public"."tenant_invitations" FOR INSERT TO "authenticated" WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "tenant_invitations_select_owner" ON "public"."tenant_invitations" FOR SELECT TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "tenant_invitations_service_role" ON "public"."tenant_invitations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "tenant_invitations_update_owner" ON "public"."tenant_invitations" FOR UPDATE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"())) WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_delete_own" ON "public"."tenants" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenants_insert_own" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenants_select_own" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("id" IN ( SELECT "lt"."tenant_id"
   FROM "public"."lease_tenants" "lt"
  WHERE ("lt"."lease_id" IN ( SELECT "l"."id"
           FROM "public"."leases" "l"
          WHERE ("l"."property_owner_id" = "public"."get_current_property_owner_id"())))))));



COMMENT ON POLICY "tenants_select_own" ON "public"."tenants" IS 'Optimized: Uses IN pattern instead of EXISTS with JOIN for owner access';



CREATE POLICY "tenants_service_role" ON "public"."tenants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "tenants_update_own" ON "public"."tenants" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "tenants_view_properties" ON "public"."properties" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "get_tenant_property_ids"."get_tenant_property_ids"
   FROM "public"."get_tenant_property_ids"() "get_tenant_property_ids"("get_tenant_property_ids"))));



ALTER TABLE "public"."units" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "units_delete_owner" ON "public"."units" FOR DELETE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "units_insert_owner" ON "public"."units" FOR INSERT TO "authenticated" WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



CREATE POLICY "units_select" ON "public"."units" FOR SELECT TO "authenticated" USING ((("property_owner_id" = "public"."get_current_property_owner_id"()) OR ("id" IN ( SELECT "get_tenant_unit_ids"."get_tenant_unit_ids"
   FROM "public"."get_tenant_unit_ids"() "get_tenant_unit_ids"("get_tenant_unit_ids")))));



CREATE POLICY "units_service_role" ON "public"."units" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "units_update_owner" ON "public"."units" FOR UPDATE TO "authenticated" USING (("property_owner_id" = "public"."get_current_property_owner_id"())) WITH CHECK (("property_owner_id" = "public"."get_current_property_owner_id"()));



ALTER TABLE "public"."user_access_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_access_log_service_role" ON "public"."user_access_log" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_feature_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_feature_access_select_own" ON "public"."user_feature_access" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_feature_access_service_role" ON "public"."user_feature_access" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_preferences_delete_own" ON "public"."user_preferences" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_preferences_insert_own" ON "public"."user_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_preferences_select_own" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "user_preferences_service_role" ON "public"."user_preferences" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "user_preferences_update_own" ON "public"."user_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_auth_admin_select" ON "public"."users" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "users_delete_own_record" ON "public"."users" FOR DELETE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_insert_own_record" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_select_own" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_select_own_record" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_service_role" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "users_service_role_all" ON "public"."users" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "users_update_own_record" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."webhook_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_attempts_service_role" ON "public"."webhook_attempts" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_events_service_role" ON "public"."webhook_events" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."webhook_metrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhook_metrics_service_role" ON "public"."webhook_metrics" TO "service_role" USING (true) WITH CHECK (true);



GRANT USAGE ON SCHEMA "public" TO "authenticator";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."activate_lease_with_pending_subscription"("p_lease_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."get_billing_insights"("owner_id_param" "uuid", "start_date_param" timestamp without time zone, "end_date_param" timestamp without time zone) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_current_property_owner_id"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_current_tenant_id"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_current_user_type"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_dashboard_time_series"("p_user_id" "uuid", "p_metric_name" "text", "p_days" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_maintenance_analytics"("user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_metric_trend"("p_user_id" "uuid", "p_metric_name" "text", "p_period" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_occupancy_trends_optimized"("p_user_id" "uuid", "p_months" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_owner_lease_tenant_ids"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_property_performance_cached"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_property_performance_trends"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_revenue_trends_optimized"("p_user_id" "uuid", "p_months" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_tenant_lease_ids"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_tenant_property_ids"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_tenant_unit_ids"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_tenants_by_owner"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tenants_by_owner"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tenants_with_lease_by_owner"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."handle_property_image_upload"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."health_check"() TO "anon";
GRANT ALL ON FUNCTION "public"."health_check"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."health_check"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sign_lease_and_check_activation"("p_lease_id" "uuid", "p_signer_type" "text", "p_signature_ip" "text", "p_signed_at" timestamp with time zone, "p_signature_method" "public"."signature_method") TO "authenticated";



GRANT SELECT ON TABLE "public"."activity" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."activity" TO "authenticated";



GRANT SELECT ON TABLE "public"."documents" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."documents" TO "authenticated";



GRANT SELECT ON TABLE "public"."expenses" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."expenses" TO "authenticated";



GRANT SELECT ON TABLE "public"."lease_tenants" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."lease_tenants" TO "authenticated";



GRANT SELECT ON TABLE "public"."leases" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."leases" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."leases" TO "service_role";



GRANT SELECT ON TABLE "public"."maintenance_requests" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."maintenance_requests" TO "authenticated";



GRANT SELECT ON TABLE "public"."notification_logs" TO "authenticator";
GRANT SELECT ON TABLE "public"."notification_logs" TO "authenticated";



GRANT SELECT ON TABLE "public"."notifications" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notifications" TO "authenticated";



GRANT SELECT ON TABLE "public"."payment_methods" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payment_methods" TO "authenticated";



GRANT SELECT ON TABLE "public"."payment_schedules" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payment_schedules" TO "authenticated";



GRANT SELECT ON TABLE "public"."payment_transactions" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."payment_transactions" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."processed_internal_events" TO "authenticated";



GRANT SELECT ON TABLE "public"."properties" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."properties" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."properties" TO "service_role";



GRANT SELECT ON TABLE "public"."property_images" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_images" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_images" TO "service_role";



GRANT SELECT ON TABLE "public"."property_owners" TO "authenticator";
GRANT SELECT ON TABLE "public"."property_owners" TO "supabase_auth_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_owners" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."property_owners" TO "service_role";



GRANT SELECT ON TABLE "public"."rent_due" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rent_due" TO "authenticated";



GRANT SELECT ON TABLE "public"."rent_payments" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rent_payments" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."rent_payments" TO "service_role";



GRANT SELECT ON TABLE "public"."report_runs" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_runs" TO "authenticated";



GRANT SELECT ON TABLE "public"."reports" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reports" TO "authenticated";



GRANT SELECT ON TABLE "public"."security_audit_log" TO "authenticator";



GRANT SELECT ON TABLE "public"."subscriptions" TO "authenticator";
GRANT SELECT ON TABLE "public"."subscriptions" TO "supabase_auth_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscriptions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subscriptions" TO "service_role";



GRANT SELECT ON TABLE "public"."tenant_invitations" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_invitations" TO "authenticated";



GRANT SELECT ON TABLE "public"."tenants" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "service_role";



GRANT SELECT ON TABLE "public"."units" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."units" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."units" TO "service_role";



GRANT SELECT ON TABLE "public"."user_access_log" TO "authenticator";



GRANT SELECT ON TABLE "public"."user_feature_access" TO "authenticator";
GRANT SELECT ON TABLE "public"."user_feature_access" TO "authenticated";



GRANT SELECT ON TABLE "public"."user_preferences" TO "authenticator";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_preferences" TO "authenticated";



GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";
GRANT SELECT ON TABLE "public"."users" TO "authenticator";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "authenticated";



GRANT SELECT ON TABLE "public"."webhook_attempts" TO "authenticator";
GRANT SELECT,UPDATE ON TABLE "public"."webhook_attempts" TO "service_role";



GRANT SELECT ON TABLE "public"."webhook_events" TO "authenticator";
GRANT SELECT ON TABLE "public"."webhook_events" TO "service_role";



GRANT SELECT ON TABLE "public"."webhook_metrics" TO "authenticator";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";




