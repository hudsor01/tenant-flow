-- DATA-02: exclude soft-deleted (status='inactive') properties from the two
-- per-property performance TREND RPCs. get_property_performance_analytics was
-- already fixed in Phase 29 (20260708131721) and is intentionally NOT touched here.
-- Only the owner_properties CTE WHERE gains `AND p.status <> 'inactive'`; bodies are
-- otherwise byte-identical to the live definitions. No return-type change, so
-- CREATE OR REPLACE preserves grants (no DROP needed).
CREATE OR REPLACE FUNCTION public.get_property_performance_with_trends(p_user_id uuid, p_timeframe text DEFAULT '30d'::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue bigint, previous_revenue bigint, trend_percentage numeric, timeframe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  RETURN QUERY
  WITH owner_properties AS (
    SELECT p.id AS prop_id, p.name AS prop_name FROM properties p WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive'
  ),
  property_occupancy AS (
    SELECT op.prop_id, op.prop_name,
      COALESCE(ROUND((COUNT(*) FILTER (WHERE u.status = 'occupied')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE u.status IS DISTINCT FROM 'inactive')::numeric, 0)) * 100, 2), 0) AS occ_rate
    FROM owner_properties op LEFT JOIN units u ON u.property_id = op.prop_id
    GROUP BY op.prop_id, op.prop_name
  )
  SELECT po.prop_id, po.prop_name, po.occ_rate,
    0::bigint, 0::bigint, 0.00::numeric, p_timeframe AS timeframe
  FROM property_occupancy po ORDER BY po.prop_name LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  WITH owner_properties AS (
    SELECT p.id, p.name FROM properties p WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'property_id', op.id, 'current_month_revenue', 0, 'previous_month_revenue', 0,
    'trend', 'stable', 'trend_percentage', 0.00) ORDER BY op.name), '[]'::jsonb)
  INTO v_result FROM owner_properties op;
  RETURN v_result;
END;
$function$;
