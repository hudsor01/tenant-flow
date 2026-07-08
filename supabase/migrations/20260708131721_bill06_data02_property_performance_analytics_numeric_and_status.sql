-- BILL-06 + DATA-02 (one recreate so Phase 30 does not clobber the numeric cast):
--   BILL-06: change SUM(e.amount)::bigint -> ::numeric and the RETURNS TABLE
--     total_revenue/total_expenses/net_income from bigint -> numeric so fractional
--     dollars survive.
--   DATA-02 (its get_property_performance_analytics portion only): add
--     `p.status <> 'inactive'` to both property-scan CTEs so soft-deleted properties
--     don't emit rows / inflate totals. (Phase 30 still owns _with_trends / _trends.)
-- Return-type change => DROP + CREATE (CREATE OR REPLACE errors). Grants re-issued.
DROP FUNCTION IF EXISTS public.get_property_performance_analytics(uuid, uuid, text, integer);

CREATE FUNCTION public.get_property_performance_analytics(p_user_id uuid, p_property_id uuid DEFAULT NULL::uuid, p_timeframe text DEFAULT '30d'::text, p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue numeric, total_expenses numeric, net_income numeric, timeframe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_days integer; v_start_date date;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  v_days := CASE p_timeframe WHEN '7d' THEN 7 WHEN '30d' THEN 30 WHEN '90d' THEN 90
    WHEN '180d' THEN 180 WHEN '365d' THEN 365 ELSE 30 END;
  v_start_date := CURRENT_DATE - v_days;
  RETURN QUERY
  WITH property_units AS (
    SELECT p.id AS prop_id, p.name AS prop_name, u.id AS unit_id, u.status AS unit_status
    FROM properties p LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive' AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT pu.prop_id, pu.prop_name,
      COALESCE(ROUND((COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE pu.unit_status IS DISTINCT FROM 'inactive')::numeric, 0)) * 100, 2), 0) AS occ_rate
    FROM property_units pu GROUP BY pu.prop_id, pu.prop_name
  ),
  property_expenses AS (
    SELECT p.id AS prop_id, COALESCE(SUM(e.amount), 0)::numeric AS expenses
    FROM properties p LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id AND e.status <> 'inactive'
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive' AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT po.prop_id, po.prop_name, po.occ_rate, 0::numeric AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses, -COALESCE(pe.expenses, 0)::numeric AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name LIMIT COALESCE(p_limit, 100);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_property_performance_analytics(uuid, uuid, text, integer) TO authenticated, service_role;
