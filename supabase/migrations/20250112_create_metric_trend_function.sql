-- ============================================================================
-- Migration: Create get_metric_trend function for dashboard trends
-- Date: 2025-01-12
-- ============================================================================

-- Drop existing version if signature differs
DROP FUNCTION IF EXISTS public.get_metric_trend(text, text, text);

CREATE OR REPLACE FUNCTION public.get_metric_trend(
  p_user_id text,
  p_metric_name text,
  p_period text DEFAULT 'month'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result jsonb;
  current_value numeric;
  previous_value numeric;
  change_percent numeric;
  period_interval interval;
BEGIN
  -- Determine interval based on period
  CASE p_period
    WHEN 'day' THEN period_interval := '1 day'::interval;
    WHEN 'week' THEN period_interval := '1 week'::interval;
    WHEN 'month' THEN period_interval := '1 month'::interval;
    WHEN 'year' THEN period_interval := '1 year'::interval;
    ELSE period_interval := '1 month'::interval;
  END CASE;

  -- Calculate metric-specific values
  -- Placeholder implementation - customize per metric type
  CASE p_metric_name
    WHEN 'occupancy_rate' THEN
      -- Calculate current occupancy rate
      SELECT CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((COUNT(CASE WHEN EXISTS(
            SELECT 1 FROM lease l
            WHERE l."unitId" = u.id
            AND l.status = 'ACTIVE'
          ) THEN 1 END) * 100.0 / COUNT(*)), 2)
        ELSE 0
      END INTO current_value
      FROM unit u
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id::uuid;

      -- For now, set previous to same value (TODO: implement historical tracking)
      previous_value := current_value;

    WHEN 'active_tenants' THEN
      SELECT COUNT(DISTINCT t.id) INTO current_value
      FROM tenant t
      JOIN lease l ON t.id = l."tenantId"
      JOIN unit u ON l."unitId" = u.id
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id::uuid
      AND l.status = 'ACTIVE';

      previous_value := current_value;

    WHEN 'monthly_revenue' THEN
      SELECT COALESCE(SUM(rp.amount), 0) / 100 INTO current_value
      FROM rent_payment rp
      JOIN lease l ON rp."leaseId" = l.id
      JOIN unit u ON l."unitId" = u.id
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id::uuid
      AND rp.status = 'PAID'
      AND DATE_TRUNC('month', rp."paidAt") = DATE_TRUNC('month', CURRENT_DATE);

      previous_value := current_value;

    WHEN 'open_maintenance' THEN
      SELECT COUNT(*) INTO current_value
      FROM maintenance_request m
      JOIN unit u ON m."unitId" = u.id
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = p_user_id::uuid
      AND m.status IN ('PENDING', 'IN_PROGRESS');

      previous_value := current_value;

    ELSE
      -- Unknown metric
      current_value := 0;
      previous_value := 0;
  END CASE;

  -- Calculate change percentage
  IF previous_value > 0 THEN
    change_percent := ROUND(((current_value - previous_value) / previous_value) * 100, 2);
  ELSE
    change_percent := 0;
  END IF;

  result := jsonb_build_object(
    'current', current_value,
    'previous', previous_value,
    'change', change_percent,
    'metric', p_metric_name,
    'period', p_period
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_metric_trend(text, text, text) TO authenticated;

COMMENT ON FUNCTION public.get_metric_trend IS 'Calculate metric trends comparing current vs previous period. Supports multiple metrics (occupancy_rate, active_tenants, monthly_revenue, open_maintenance) and time periods (day, week, month, year).';
