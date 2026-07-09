-- DATA-03 (propagation): the expire-leases cron sets lapsed leases to
-- lease_status='expired', but several DB functions/triggers predate that value and
-- special-case only 'ended'/'terminated'. Propagate 'expired' so the status behaves
-- consistently everywhere. All CREATE OR REPLACE (no return-type change; grants kept).
-- Bodies are byte-identical to live except the noted lease-status predicate.

-- 1) Trigger: a lapsing lease must FREE its unit like ended/terminated/inactive.
CREATE OR REPLACE FUNCTION public.sync_unit_status_from_lease()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.lease_status = 'active' and (old is null or old.lease_status != 'active') then
    update public.units set status = 'occupied'
      where id = new.unit_id and status <> 'inactive';
  end if;

  -- When a lease leaves active (ended / terminated / expired / soft-deleted
  -- 'inactive'), free the unit if no other active lease holds it. Never resurrect
  -- a soft-deleted (inactive) unit.
  if old.lease_status = 'active' and new.lease_status in ('ended', 'terminated', 'inactive', 'expired') then
    if not exists (
      select 1 from public.leases
      where unit_id = new.unit_id
      and id != new.id
      and lease_status = 'active'
    ) then
      update public.units set status = 'available'
        where id = new.unit_id and status <> 'inactive';
    end if;
  end if;

  return new;
end;
$function$;

-- 2) Occupancy history must count months an expired lease actually occupied.
CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_owner_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_owner_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  unit_snapshot AS (
    SELECT
      COUNT(*) FILTER (WHERE u.status <> 'inactive')       AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')        AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
  ),
  months AS (
    SELECT
      gs AS month_offset,
      (CURRENT_DATE - (gs || ' months')::interval)::date AS month_date
    FROM generate_series(0, p_months - 1) gs
  ),
  historical_occupancy AS (
    SELECT
      m.month_date,
      COUNT(DISTINCT l.unit_id) AS occupied_units
    FROM months m
    JOIN leases l ON
      l.lease_status IN ('active', 'ended', 'expired')
      AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
      AND (l.end_date IS NULL OR l.end_date >= m.month_date)
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
      AND m.month_offset > 0
    GROUP BY m.month_date
  ),
  monthly_occupancy AS (
    SELECT
      m.month_date,
      TO_CHAR(m.month_date, 'YYYY-MM') AS month,
      CASE
        WHEN m.month_offset = 0 THEN us.occupied_units
        ELSE COALESCE(ho.occupied_units, 0)
      END AS occupied_units,
      us.total_units
    FROM months m
    CROSS JOIN unit_snapshot us
    LEFT JOIN historical_occupancy ho ON ho.month_date = m.month_date
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mo.month,
        'occupancy_rate', CASE
          WHEN mo.total_units > 0
          THEN ROUND((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'total_units',    mo.total_units,
        'occupied_units', mo.occupied_units
      ) ORDER BY mo.month_date DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_occupancy mo;

  RETURN v_result;
END;
$function$;

-- 3) Revenue history must count months an expired lease was actually active.
CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12)
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
  WITH months AS (
    SELECT (current_date - (gs || ' months')::interval)::date AS month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(0, p_months - 1) gs
  ),
  monthly_expected AS (
    SELECT m.month_start, coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m LEFT JOIN leases l ON l.owner_user_id = p_user_id
      AND l.lease_status IN ('active', 'ended', 'expired') AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
    GROUP BY m.month_start
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(m.month_start, 'YYYY-MM'),
    'revenue', coalesce(me.expected_revenue, 0),
    'collections', 0,
    'outstanding', coalesce(me.expected_revenue, 0)
  ) ORDER BY m.month_start DESC), '[]'::jsonb) INTO v_result
  FROM months m LEFT JOIN monthly_expected me ON me.month_start = m.month_start;
  RETURN v_result;
END;
$function$;

-- 4) Billing churn must count expired leases (a lapsed lease is churn).
CREATE OR REPLACE FUNCTION public.get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone, end_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb; v_mrr numeric; v_total_revenue numeric;
  v_active_leases integer; v_expired_leases integer; v_tenant_count integer;
BEGIN
  IF owner_id_param != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  SELECT coalesce(sum(rent_amount), 0) INTO v_mrr FROM leases WHERE owner_user_id = owner_id_param AND lease_status = 'active';
  v_total_revenue := v_mrr * 12;
  SELECT count(*) FILTER (WHERE lease_status = 'active'), count(*) FILTER (WHERE lease_status IN ('ended', 'terminated', 'expired'))
  INTO v_active_leases, v_expired_leases FROM leases WHERE owner_user_id = owner_id_param;
  SELECT count(DISTINCT l.primary_tenant_id) INTO v_tenant_count FROM leases l
  WHERE l.owner_user_id = owner_id_param AND l.lease_status = 'active';
  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue, 'mrr', v_mrr,
    'churnRate', CASE WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0 END,
    'unpaidTotal', 0, 'unpaidCount', 0, 'lateFeeTotal', 0, 'tenantCount', v_tenant_count
  );
  RETURN v_result;
END;
$function$;

-- 5) DATA-02 tail: the dead-but-granted cached per-property RPC also excludes
-- soft-deleted properties (property-level status filter it was missing).
CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id AND p.status <> 'inactive'
  ),
  unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status <> 'inactive') AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available') AS vacant_units
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  ),
  lease_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(l.rent_amount), 0) AS monthly_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
    GROUP BY u.property_id
  ),
  potential_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS potential_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_name', op.name,
        'property_id', op.id,
        'total_units', COALESCE(uc.total_units, 0),
        'occupied_units', COALESCE(uc.occupied_units, 0),
        'vacant_units', COALESCE(uc.vacant_units, 0),
        'occupancy_rate', CASE
          WHEN COALESCE(uc.total_units, 0) > 0
          THEN ROUND((uc.occupied_units::numeric / uc.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'annual_revenue', COALESCE(lr.monthly_revenue, 0) * 12,
        'monthly_revenue', COALESCE(lr.monthly_revenue, 0),
        'potential_revenue', COALESCE(pr.potential_revenue, 0)
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN unit_counts uc ON uc.property_id = op.id
  LEFT JOIN lease_revenues lr ON lr.property_id = op.id
  LEFT JOIN potential_revenues pr ON pr.property_id = op.id;

  RETURN v_result;
END;
$function$;
