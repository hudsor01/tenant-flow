-- ==========================================================================
-- Add property analytics RPC stubs
-- Created: 2025-10-14
-- These are safe stubs that return empty JSON arrays or objects to satisfy
-- the application's type expectations. Replace with full implementations
-- when ready.
-- ==========================================================================

-- get_property_stats
CREATE OR REPLACE FUNCTION public.get_property_stats(p_user_id uuid)
RETURNS JSON
LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total', 0,
    'occupied', 0,
    'vacant', 0,
    'occupancyRate', 0,
    'totalMonthlyRent', 0,
    'averageRent', 0
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_property_stats(uuid) TO authenticated;

-- get_property_performance_analytics
CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_timeframe text DEFAULT '30d',
  p_limit integer DEFAULT 10
)
RETURNS JSON[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY[json_build_object('propertyId', null, 'propertyName', '', 'occupancyRate', 0)];
$$;
GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO authenticated;

-- get_property_occupancy_analytics
CREATE OR REPLACE FUNCTION public.get_property_occupancy_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_period text DEFAULT 'monthly'
)
RETURNS JSON[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY[json_build_object('period', '', 'occupancyRate', 0)];
$$;
GRANT EXECUTE ON FUNCTION public.get_property_occupancy_analytics(uuid, uuid, text) TO authenticated;

-- get_property_financial_analytics
CREATE OR REPLACE FUNCTION public.get_property_financial_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_timeframe text DEFAULT '30d'
)
RETURNS JSON[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY[json_build_object('period', '', 'revenue', 0, 'expenses', 0, 'netIncome', 0)];
$$;
GRANT EXECUTE ON FUNCTION public.get_property_financial_analytics(uuid, uuid, text) TO authenticated;

-- get_property_maintenance_analytics
CREATE OR REPLACE FUNCTION public.get_property_maintenance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL,
  p_timeframe text DEFAULT '30d'
)
RETURNS JSON[]
LANGUAGE sql STABLE AS $$
  SELECT ARRAY[json_build_object('propertyId', null, 'totalRequests', 0, 'openRequests', 0)];
$$;
GRANT EXECUTE ON FUNCTION public.get_property_maintenance_analytics(uuid, uuid, text) TO authenticated;

-- End of migration
