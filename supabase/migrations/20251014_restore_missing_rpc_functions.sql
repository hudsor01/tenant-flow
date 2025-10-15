-- ==========================================================================
-- Restore missing RPC functions (safe stubs)
-- Generated: 2025-10-14
-- Purpose: Ensure application RPCs exist so the Supabase types generator includes
-- them. These implementations are safe stubs that return empty/zeroed rows and
-- should be replaced with full implementations as needed.
-- ==========================================================================

-- 1) get_property_performance
CREATE OR REPLACE FUNCTION public.get_property_performance(p_user_id uuid)
RETURNS TABLE(
  total integer,
  occupied integer,
  vacant integer,
  occupancy_rate numeric,
  total_monthly_rent numeric,
  average_rent numeric
)
LANGUAGE sql STABLE AS $$
  SELECT 0::int AS total, 0::int AS occupied, 0::int AS vacant, 0::numeric AS occupancy_rate, 0::numeric AS total_monthly_rent, 0::numeric AS average_rent;
$$;
GRANT EXECUTE ON FUNCTION public.get_property_performance(uuid) TO authenticated;

-- 2) get_property_units
CREATE OR REPLACE FUNCTION public.get_property_units(p_user_id uuid, p_property_id uuid)
RETURNS TABLE(
  unit_id uuid,
  unit_number text,
  status text,
  rent numeric,
  bedrooms integer,
  bathrooms numeric
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS unit_id, ''::text AS unit_number, ''::text AS status, 0::numeric AS rent, 0::int AS bedrooms, 0::numeric AS bathrooms;
$$;
GRANT EXECUTE ON FUNCTION public.get_property_units(uuid, uuid) TO authenticated;

-- 3) get_unit_statistics
CREATE OR REPLACE FUNCTION public.get_unit_statistics(p_user_id uuid)
RETURNS TABLE(
  unit_id uuid,
  total_units integer,
  occupied_units integer,
  vacancy_rate numeric
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS unit_id, 0::int AS total_units, 0::int AS occupied_units, 0::numeric AS vacancy_rate;
$$;
GRANT EXECUTE ON FUNCTION public.get_unit_statistics(uuid) TO authenticated;

-- 4) calculate_visitor_analytics_full
CREATE OR REPLACE FUNCTION public.calculate_visitor_analytics_full(p_user_id uuid)
RETURNS TABLE(
  period text,
  visitors bigint,
  conversions bigint,
  conversion_rate numeric
)
LANGUAGE sql STABLE AS $$
  SELECT ''::text AS period, 0::bigint AS visitors, 0::bigint AS conversions, 0::numeric AS conversion_rate;
$$;
GRANT EXECUTE ON FUNCTION public.calculate_visitor_analytics_full(uuid) TO authenticated;

-- 5) get_occupancy_trends
CREATE OR REPLACE FUNCTION public.get_occupancy_trends(p_user_id uuid, p_months integer DEFAULT 12)
RETURNS TABLE(
  period text,
  occupancy_rate numeric
)
LANGUAGE sql STABLE AS $$
  SELECT ''::text AS period, 0::numeric AS occupancy_rate;
$$;
GRANT EXECUTE ON FUNCTION public.get_occupancy_trends(uuid, integer) TO authenticated;

-- 6) get_vacancy_analysis
CREATE OR REPLACE FUNCTION public.get_vacancy_analysis(p_user_id uuid, p_months integer DEFAULT 12)
RETURNS TABLE(
  period text,
  vacancy_rate numeric
)
LANGUAGE sql STABLE AS $$
  SELECT ''::text AS period, 0::numeric AS vacancy_rate;
$$;
GRANT EXECUTE ON FUNCTION public.get_vacancy_analysis(uuid, integer) TO authenticated;

-- 7) get_occupancy_overview
CREATE OR REPLACE FUNCTION public.get_occupancy_overview(p_user_id uuid)
RETURNS TABLE(
  total_properties integer,
  total_units integer,
  overall_occupancy numeric
)
LANGUAGE sql STABLE AS $$
  SELECT 0::int AS total_properties, 0::int AS total_units, 0::numeric AS overall_occupancy;
$$;
GRANT EXECUTE ON FUNCTION public.get_occupancy_overview(uuid) TO authenticated;

-- 8) calculate_maintenance_metrics
CREATE OR REPLACE FUNCTION public.calculate_maintenance_metrics(p_user_id uuid)
RETURNS TABLE(
  total_requests integer,
  avg_resolution_hours numeric,
  open_requests integer
)
LANGUAGE sql STABLE AS $$
  SELECT 0::int AS total_requests, 0::numeric AS avg_resolution_hours, 0::int AS open_requests;
$$;
GRANT EXECUTE ON FUNCTION public.calculate_maintenance_metrics(uuid) TO authenticated;

-- 9) get_maintenance_analytics
CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(p_user_id uuid)
RETURNS TABLE(
  property_id uuid,
  property_name text,
  requests_count integer,
  avg_resolution_hours numeric
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS property_id, ''::text AS property_name, 0::int AS requests_count, 0::numeric AS avg_resolution_hours;
$$;
GRANT EXECUTE ON FUNCTION public.get_maintenance_analytics(uuid) TO authenticated;

-- 10) get_lease_financial_summary
CREATE OR REPLACE FUNCTION public.get_lease_financial_summary(p_lease_id uuid)
RETURNS TABLE(
  lease_id uuid,
  total_rent_due numeric,
  total_paid numeric,
  balance numeric
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS lease_id, 0::numeric AS total_rent_due, 0::numeric AS total_paid, 0::numeric AS balance;
$$;
GRANT EXECUTE ON FUNCTION public.get_lease_financial_summary(uuid) TO authenticated;

-- 11) get_leases_with_financial_analytics
CREATE OR REPLACE FUNCTION public.get_leases_with_financial_analytics(p_user_id uuid, p_status text DEFAULT NULL)
RETURNS TABLE(
  lease_id uuid,
  property_id uuid,
  tenant_id uuid,
  total_due numeric,
  status text
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS lease_id, NULL::uuid AS property_id, NULL::uuid AS tenant_id, 0::numeric AS total_due, ''::text AS status;
$$;
GRANT EXECUTE ON FUNCTION public.get_leases_with_financial_analytics(uuid, text) TO authenticated;

-- 12) get_lease_lifecycle_data
CREATE OR REPLACE FUNCTION public.get_lease_lifecycle_data(p_user_id uuid)
RETURNS TABLE(
  lease_id uuid,
  start_date date,
  end_date date,
  lifecycle_stage text
)
LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid AS lease_id, NULL::date AS start_date, NULL::date AS end_date, ''::text AS lifecycle_stage;
$$;
GRANT EXECUTE ON FUNCTION public.get_lease_lifecycle_data(uuid) TO authenticated;

-- 13) get_lease_status_breakdown
CREATE OR REPLACE FUNCTION public.get_lease_status_breakdown(p_user_id uuid)
RETURNS TABLE(
  status text,
  count integer
)
LANGUAGE sql STABLE AS $$
  SELECT ''::text AS status, 0::int AS count;
$$;
GRANT EXECUTE ON FUNCTION public.get_lease_status_breakdown(uuid) TO authenticated;

-- Keep a simple comment for clarity
COMMENT ON FUNCTION public.get_property_performance(uuid) IS 'Restored stub for property performance analytics.';

-- End of migration
