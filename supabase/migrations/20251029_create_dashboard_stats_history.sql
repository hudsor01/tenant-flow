-- Dashboard Stats History - Time Series Tracking
-- Enables trend analysis, growth metrics, and historical comparisons
-- Designed for scalability with partitioning and efficient indexing

-- Create the history table with time-series optimization
CREATE TABLE IF NOT EXISTS dashboard_stats_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Snapshot metadata
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Property metrics
  total_properties INTEGER NOT NULL DEFAULT 0,
  occupied_properties INTEGER NOT NULL DEFAULT 0,
  
  -- Unit metrics
  total_units INTEGER NOT NULL DEFAULT 0,
  occupied_units INTEGER NOT NULL DEFAULT 0,
  vacant_units INTEGER NOT NULL DEFAULT 0,
  maintenance_units INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_potential_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_actual_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Lease metrics
  total_leases INTEGER NOT NULL DEFAULT 0,
  active_leases INTEGER NOT NULL DEFAULT 0,
  expired_leases INTEGER NOT NULL DEFAULT 0,
  expiring_soon_leases INTEGER NOT NULL DEFAULT 0,
  total_lease_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Tenant metrics
  total_tenants INTEGER NOT NULL DEFAULT 0,
  active_tenants INTEGER NOT NULL DEFAULT 0,
  inactive_tenants INTEGER NOT NULL DEFAULT 0,
  
  -- Maintenance metrics
  total_maintenance INTEGER NOT NULL DEFAULT 0,
  open_maintenance INTEGER NOT NULL DEFAULT 0,
  in_progress_maintenance INTEGER NOT NULL DEFAULT 0,
  completed_maintenance INTEGER NOT NULL DEFAULT 0,
  avg_resolution_time_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  
  -- Revenue metrics (stored in cents for precision)
  daily_revenue BIGINT NOT NULL DEFAULT 0,
  monthly_revenue BIGINT NOT NULL DEFAULT 0,
  yearly_revenue BIGINT NOT NULL DEFAULT 0,
  
  -- Constraints
  CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date),
  CONSTRAINT valid_occupancy_rate CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_history_user_date 
ON dashboard_stats_history(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_history_snapshot_date 
ON dashboard_stats_history(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_history_user_timestamp 
ON dashboard_stats_history(user_id, snapshot_timestamp DESC);

-- Enable Row Level Security
ALTER TABLE dashboard_stats_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "dashboard_history_owner_access" ON dashboard_stats_history;
CREATE POLICY "dashboard_history_owner_access"
ON dashboard_stats_history
FOR SELECT
TO authenticated
USING (user_id = get_auth_uid());

DROP POLICY IF EXISTS "dashboard_history_service_access" ON dashboard_stats_history;
CREATE POLICY "dashboard_history_service_access"
ON dashboard_stats_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Prevent direct inserts/updates from authenticated users (only service role via snapshots)
DROP POLICY IF EXISTS "dashboard_history_no_user_modifications" ON dashboard_stats_history;
CREATE POLICY "dashboard_history_no_user_modifications"
ON dashboard_stats_history
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Function to create daily snapshot
CREATE OR REPLACE FUNCTION create_dashboard_stats_snapshot()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_inserted INTEGER := 0;
BEGIN
  -- Insert or update daily snapshots for all users with properties
  INSERT INTO dashboard_stats_history (
    user_id,
    snapshot_date,
    snapshot_timestamp,
    total_properties,
    occupied_properties,
    total_units,
    occupied_units,
    vacant_units,
    maintenance_units,
    occupancy_rate,
    total_potential_rent,
    total_actual_rent,
    total_leases,
    active_leases,
    expired_leases,
    expiring_soon_leases,
    total_lease_rent,
    total_tenants,
    active_tenants,
    inactive_tenants,
    total_maintenance,
    open_maintenance,
    in_progress_maintenance,
    completed_maintenance,
    avg_resolution_time_hours,
    daily_revenue,
    monthly_revenue,
    yearly_revenue
  )
  SELECT 
    mv.user_id,
    CURRENT_DATE,
    NOW(),
    mv.total_properties,
    mv.occupied_properties,
    mv.total_units,
    mv.occupied_units,
    mv.vacant_units,
    mv.maintenance_units,
    mv.occupancy_rate,
    ROUND((mv.total_potential_rent / 100.0)::numeric, 2),
    ROUND((mv.total_actual_rent / 100.0)::numeric, 2),
    mv.total_leases,
    mv.active_leases,
    mv.expired_leases,
    mv.expiring_soon_leases,
    ROUND((mv.total_lease_rent / 100.0)::numeric, 2),
    mv.total_tenants,
    mv.active_tenants,
    mv.inactive_tenants,
    mv.total_maintenance,
    mv.open_maintenance,
    mv.in_progress_maintenance,
    mv.completed_maintenance,
    ROUND(mv.avg_resolution_time_hours::numeric, 2),
    -- Calculate daily revenue (today's successful payments)
    COALESCE((
      SELECT SUM(rp."netAmount")
      FROM rent_payments rp
      JOIN tenant t ON rp."tenantId" = t.id
      JOIN lease l ON t.id = l."tenantId"
      JOIN unit u ON l."unitId" = u.id
      JOIN property p ON u."propertyId" = p.id
      WHERE p."ownerId" = mv.user_id
        AND rp.status = 'SUCCEEDED'
        AND rp."paidAt"::date = CURRENT_DATE
    ), 0),
    mv.monthly_revenue,
    mv.yearly_revenue
  FROM dashboard_stats_mv mv
  ON CONFLICT (user_id, snapshot_date) 
  DO UPDATE SET
    snapshot_timestamp = EXCLUDED.snapshot_timestamp,
    total_properties = EXCLUDED.total_properties,
    occupied_properties = EXCLUDED.occupied_properties,
    total_units = EXCLUDED.total_units,
    occupied_units = EXCLUDED.occupied_units,
    vacant_units = EXCLUDED.vacant_units,
    maintenance_units = EXCLUDED.maintenance_units,
    occupancy_rate = EXCLUDED.occupancy_rate,
    total_potential_rent = EXCLUDED.total_potential_rent,
    total_actual_rent = EXCLUDED.total_actual_rent,
    total_leases = EXCLUDED.total_leases,
    active_leases = EXCLUDED.active_leases,
    expired_leases = EXCLUDED.expired_leases,
    expiring_soon_leases = EXCLUDED.expiring_soon_leases,
    total_lease_rent = EXCLUDED.total_lease_rent,
    total_tenants = EXCLUDED.total_tenants,
    active_tenants = EXCLUDED.active_tenants,
    inactive_tenants = EXCLUDED.inactive_tenants,
    total_maintenance = EXCLUDED.total_maintenance,
    open_maintenance = EXCLUDED.open_maintenance,
    in_progress_maintenance = EXCLUDED.in_progress_maintenance,
    completed_maintenance = EXCLUDED.completed_maintenance,
    avg_resolution_time_hours = EXCLUDED.avg_resolution_time_hours,
    daily_revenue = EXCLUDED.daily_revenue,
    monthly_revenue = EXCLUDED.monthly_revenue,
    yearly_revenue = EXCLUDED.yearly_revenue;
  
  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  
  RETURN rows_inserted;
END;
$$;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION create_dashboard_stats_snapshot() TO service_role;
REVOKE EXECUTE ON FUNCTION create_dashboard_stats_snapshot() FROM authenticated;
REVOKE EXECUTE ON FUNCTION create_dashboard_stats_snapshot() FROM PUBLIC;

-- Function to get occupancy change from history
CREATE OR REPLACE FUNCTION get_occupancy_change(p_user_id TEXT, p_days_back INTEGER DEFAULT 30)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  WITH current_occupancy AS (
    SELECT occupancy_rate
    FROM dashboard_stats_mv
    WHERE user_id = p_user_id
  ),
  historical_occupancy AS (
    SELECT occupancy_rate
    FROM dashboard_stats_history
    WHERE user_id = p_user_id
      AND snapshot_date = CURRENT_DATE - p_days_back
    ORDER BY snapshot_timestamp DESC
    LIMIT 1
  )
  SELECT COALESCE(
    ROUND((c.occupancy_rate - h.occupancy_rate)::numeric, 2),
    0
  )
  FROM current_occupancy c
  LEFT JOIN historical_occupancy h ON true;
$$;

GRANT EXECUTE ON FUNCTION get_occupancy_change(TEXT, INTEGER) TO authenticated;

-- Function to get metric trend (generic for any metric)
CREATE OR REPLACE FUNCTION get_metric_trend(
  p_user_id TEXT,
  p_metric_name TEXT,
  p_period TEXT DEFAULT 'month' -- 'day', 'week', 'month', 'year'
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  interval_value INTERVAL;
BEGIN
  -- SECURITY: Whitelist validation to prevent SQL injection
  -- Only allow known metric column names from dashboard_stats_history table
  IF p_metric_name NOT IN (
    'total_properties', 'occupied_properties', 'total_units', 'occupied_units',
    'vacant_units', 'maintenance_units', 'occupancy_rate', 'total_potential_rent',
    'total_actual_rent', 'total_leases', 'active_leases', 'expired_leases',
    'expiring_soon_leases', 'total_lease_rent', 'total_tenants', 'active_tenants',
    'inactive_tenants', 'total_maintenance', 'open_maintenance', 'in_progress_maintenance',
    'completed_maintenance', 'avg_resolution_time_hours', 'daily_revenue',
    'monthly_revenue', 'yearly_revenue'
  ) THEN
    RAISE EXCEPTION 'Invalid metric name: %. Must be a valid dashboard metric.', p_metric_name
      USING HINT = 'Use one of: occupancy_rate, total_units, monthly_revenue, etc.';
  END IF;

  -- Determine interval based on period
  interval_value := CASE p_period
    WHEN 'day' THEN INTERVAL '1 day'
    WHEN 'week' THEN INTERVAL '7 days'
    WHEN 'month' THEN INTERVAL '30 days'
    WHEN 'year' THEN INTERVAL '365 days'
    ELSE INTERVAL '30 days'
  END;

  -- Build dynamic query - now safe after whitelist validation
  EXECUTE format(
    'SELECT json_build_object(
       ''current'', (SELECT %I FROM dashboard_stats_mv WHERE user_id = $1),
       ''previous'', (
         SELECT %I 
         FROM dashboard_stats_history 
         WHERE user_id = $1 
           AND snapshot_date <= CURRENT_DATE - $2
         ORDER BY snapshot_date DESC 
         LIMIT 1
       ),
       ''change'', (
         SELECT ROUND(
           ((SELECT %I FROM dashboard_stats_mv WHERE user_id = $1) - 
            COALESCE((
              SELECT %I 
              FROM dashboard_stats_history 
              WHERE user_id = $1 
                AND snapshot_date <= CURRENT_DATE - $2
              ORDER BY snapshot_date DESC 
              LIMIT 1
            ), 0))::numeric,
           2
         )
       ),
       ''percentChange'', (
         SELECT CASE 
           WHEN COALESCE((
             SELECT %I 
             FROM dashboard_stats_history 
             WHERE user_id = $1 
               AND snapshot_date <= CURRENT_DATE - $2
             ORDER BY snapshot_date DESC 
             LIMIT 1
           ), 0) > 0
           THEN ROUND(
             ((
               (SELECT %I FROM dashboard_stats_mv WHERE user_id = $1) - 
               (SELECT %I FROM dashboard_stats_history WHERE user_id = $1 AND snapshot_date <= CURRENT_DATE - $2 ORDER BY snapshot_date DESC LIMIT 1)
             )::numeric / 
             (SELECT %I FROM dashboard_stats_history WHERE user_id = $1 AND snapshot_date <= CURRENT_DATE - $2 ORDER BY snapshot_date DESC LIMIT 1)) * 100,
             2
           )
           ELSE 0
         END
       )
     )',
    p_metric_name, p_metric_name, p_metric_name, p_metric_name, p_metric_name, 
    p_metric_name, p_metric_name, p_metric_name
  )
  INTO result
  USING p_user_id, interval_value;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_metric_trend(TEXT, TEXT, TEXT) TO authenticated;

-- Function to get time series data for charts
CREATE OR REPLACE FUNCTION get_dashboard_time_series(
  p_user_id TEXT,
  p_metric_name TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  -- SECURITY: Whitelist validation to prevent SQL injection
  -- Only allow known metric column names from dashboard_stats_history table
  IF p_metric_name NOT IN (
    'total_properties', 'occupied_properties', 'total_units', 'occupied_units',
    'vacant_units', 'maintenance_units', 'occupancy_rate', 'total_potential_rent',
    'total_actual_rent', 'total_leases', 'active_leases', 'expired_leases',
    'expiring_soon_leases', 'total_lease_rent', 'total_tenants', 'active_tenants',
    'inactive_tenants', 'total_maintenance', 'open_maintenance', 'in_progress_maintenance',
    'completed_maintenance', 'avg_resolution_time_hours', 'daily_revenue',
    'monthly_revenue', 'yearly_revenue'
  ) THEN
    RAISE EXCEPTION 'Invalid metric name: %. Must be a valid dashboard metric.', p_metric_name
      USING HINT = 'Use one of: occupancy_rate, total_units, monthly_revenue, etc.';
  END IF;

  EXECUTE format(
    'SELECT json_agg(data ORDER BY data->>''date'')
     FROM (
       SELECT json_build_object(
         ''date'', snapshot_date,
         ''value'', %I
       ) as data
       FROM dashboard_stats_history
       WHERE user_id = $1
         AND snapshot_date >= CURRENT_DATE - $2
       ORDER BY snapshot_date
     ) t',
    p_metric_name
  )
  INTO result
  USING p_user_id, p_days;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_dashboard_time_series(TEXT, TEXT, INTEGER) TO authenticated;

-- Data retention function (keep last 2 years, monthly snapshots beyond that)
CREATE OR REPLACE FUNCTION cleanup_dashboard_history()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete daily snapshots older than 2 years, keep only month-end snapshots
  DELETE FROM dashboard_stats_history
  WHERE snapshot_date < CURRENT_DATE - INTERVAL '2 years'
    AND snapshot_date != (date_trunc('month', snapshot_date) + INTERVAL '1 month - 1 day')::date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_dashboard_history() TO service_role;

-- Initial snapshot for existing users
SELECT create_dashboard_stats_snapshot();

COMMENT ON TABLE dashboard_stats_history IS 
'Time-series storage for dashboard statistics. Enables trend analysis and historical comparisons. Daily snapshots created via cron job.';

COMMENT ON FUNCTION create_dashboard_stats_snapshot() IS 
'Creates daily snapshot of dashboard stats for all users. Run via pg_cron at midnight UTC.';

COMMENT ON FUNCTION get_occupancy_change(TEXT, INTEGER) IS 
'Calculates occupancy rate change over specified days. Default 30 days.';

COMMENT ON FUNCTION get_metric_trend(TEXT, TEXT, TEXT) IS 
'Generic trend calculator for any metric with current/previous/change/percentChange.';

COMMENT ON FUNCTION get_dashboard_time_series(TEXT, TEXT, INTEGER) IS 
'Returns time-series array for charting. Default 30 days of history.';

COMMENT ON FUNCTION cleanup_dashboard_history() IS 
'Data retention: Keeps 2 years of daily data, then monthly snapshots only.';
