-- DATA-03 (propagation tail): get_dashboard_stats + get_dashboard_data_v2 computed
-- the leases.expired output field as IN ('ended','terminated'), omitting the cron-set
-- 'expired' status (the JSON key is named 'expired' but the predicate excluded it).
-- Add 'expired' so the count agrees with get_lease_stats. Bodies byte-identical to
-- live except that single predicate. CREATE OR REPLACE (no return-type change).
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT id
    FROM properties
    WHERE owner_user_id = p_user_id
      AND status != 'inactive'
  ),

  unit_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE u.status <> 'inactive')::int AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int   AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available')::int  AS vacant_units,
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS maintenance_units,
      COALESCE(AVG(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS avg_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status <> 'inactive'), 0) AS total_potential_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status = 'occupied'), 0) AS total_actual_rent
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  property_unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS occ,
      COUNT(*) FILTER (WHERE u.status <> 'inactive')::int AS tot
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
    GROUP BY u.property_id
  ),
  property_agg AS (
    SELECT
      COUNT(op.id)::int                                                   AS total_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) > 0)::int              AS occupied_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) = 0)::int              AS vacant_props,
      COALESCE(
        ROUND(
          (SUM(COALESCE(puc.occ, 0))::decimal /
           NULLIF(SUM(COALESCE(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      )                                                                   AS occupancy_rate,
      COALESCE(SUM(ua.total_actual_rent), 0)                             AS monthly_rent,
      COALESCE(SUM(ua.avg_rent), 0)                                      AS avg_rent
    FROM owner_properties op
    LEFT JOIN property_unit_counts puc ON puc.property_id = op.id
    CROSS JOIN unit_agg ua
  ),

  active_leases AS (
    SELECT
      l.id,
      l.primary_tenant_id,
      l.rent_amount,
      l.end_date
    FROM leases l
    WHERE l.owner_user_id = p_user_id
      AND l.lease_status = 'active'
  ),
  lease_agg AS (
    SELECT
      (SELECT COUNT(*)::int FROM leases WHERE owner_user_id = p_user_id AND lease_status <> 'inactive') AS total_leases,
      COUNT(*)::int                                                                      AS active_leases,
      (SELECT COUNT(*)::int FROM leases
       WHERE owner_user_id = p_user_id
         AND lease_status IN ('ended', 'terminated', 'expired'))                         AS expired_leases,
      COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days')::int         AS expiring_soon,
      COALESCE(SUM(rent_amount), 0)                                                      AS monthly_revenue
    FROM active_leases
  ),

  tenant_active_ids AS (
    SELECT DISTINCT primary_tenant_id AS tenant_id
    FROM active_leases
  ),
  tenant_agg AS (
    SELECT
      COUNT(t.id)::int                                                     AS total_tenants,
      COUNT(tai.tenant_id)::int                                            AS active_tenants,
      COUNT(t.id)::int - COUNT(tai.tenant_id)::int                        AS inactive_tenants,
      COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
    FROM tenants t
    LEFT JOIN tenant_active_ids tai ON tai.tenant_id = t.id
    WHERE EXISTS (
      SELECT 1 FROM leases l2
      JOIN units u2 ON u2.id = l2.unit_id
      WHERE u2.property_id IN (SELECT id FROM owner_properties)
        AND l2.primary_tenant_id = t.id
        AND l2.lease_status <> 'inactive'
    )
  ),

  maintenance_agg AS (
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int                               AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int                        AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int                          AS completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::int AS completed_today,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
        FILTER (WHERE completed_at IS NOT NULL), 0
      )                                                                           AS avg_resolution_days,
      COUNT(*) FILTER (WHERE priority = 'low')::int                              AS priority_low,
      COUNT(*) FILTER (WHERE priority = 'normal')::int                           AS priority_normal,
      COUNT(*) FILTER (WHERE priority = 'high')::int                             AS priority_high,
      COUNT(*) FILTER (WHERE priority = 'urgent')::int                           AS priority_urgent
    FROM maintenance_requests
    WHERE owner_user_id = p_user_id
  )

  SELECT json_build_object(
    'properties', json_build_object(
      'total',           pa.total_props,
      'occupied',        pa.occupied_props,
      'vacant',          pa.vacant_props,
      'occupancyRate',   pa.occupancy_rate,
      'totalMonthlyRent', (SELECT total_actual_rent FROM unit_agg),
      'averageRent',     (SELECT avg_rent FROM unit_agg)
    ),
    'tenants', json_build_object(
      'total',         ta.total_tenants,
      'active',        ta.active_tenants,
      'inactive',      ta.inactive_tenants,
      'newThisMonth',  ta.new_this_month
    ),
    'units', json_build_object(
      'total',              ua.total_units,
      'occupied',           ua.occupied_units,
      'vacant',             ua.vacant_units,
      'maintenance',        ua.maintenance_units,
      'available',          ua.vacant_units,
      'averageRent',        ua.avg_rent,
      'occupancyRate',      CASE WHEN ua.total_units > 0
                              THEN ROUND((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                              ELSE 0 END,
      'occupancyChange',    0,
      'totalPotentialRent', ua.total_potential_rent,
      'totalActualRent',    ua.total_actual_rent
    ),
    'leases', json_build_object(
      'total',        la.total_leases,
      'active',       la.active_leases,
      'expired',      la.expired_leases,
      'expiringSoon', la.expiring_soon
    ),
    'maintenance', json_build_object(
      'total',           ma.total,
      'open',            ma.open_count,
      'inProgress',      ma.in_progress,
      'completed',       ma.completed,
      'completedToday',  ma.completed_today,
      'avgResolutionTime', ma.avg_resolution_days,
      'byPriority', json_build_object(
        'low',    ma.priority_low,
        'normal', ma.priority_normal,
        'high',   ma.priority_high,
        'urgent', ma.priority_urgent
      )
    ),
    'revenue', json_build_object(
      'monthly', la.monthly_revenue,
      'yearly',  la.monthly_revenue * 12,
      'growth',  0
    )
  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  with
  owner_properties as (
    select id, name, address_line1, property_type
    from properties
    where owner_user_id = p_user_id
      and status != 'inactive'
  ),

  all_units as (
    select u.id, u.property_id, u.status, u.rent_amount
    from units u
    where u.property_id in (select id from owner_properties)
      and u.status <> 'inactive'
  ),

  all_leases as (
    select l.id, l.unit_id, l.primary_tenant_id, l.rent_amount,
           l.start_date, l.end_date, l.lease_status
    from leases l
    join all_units au on au.id = l.unit_id
    where l.owner_user_id = p_user_id
      and l.lease_status <> 'inactive'
  ),

  active_leases as (
    select * from all_leases where lease_status = 'active'
  ),

  all_maintenance as (
    select id, status, priority, created_at, completed_at
    from maintenance_requests
    where owner_user_id = p_user_id
  ),

  unit_agg as (
    select
      count(*)::int                                          as total_units,
      count(*) filter (where status = 'occupied')::int       as occupied_units,
      count(*) filter (where status = 'available')::int      as vacant_units,
      count(*) filter (where status = 'maintenance')::int    as maintenance_units,
      coalesce(avg(rent_amount), 0)                          as avg_rent,
      coalesce(sum(rent_amount), 0)                          as total_potential_rent,
      coalesce(sum(rent_amount) filter (where status = 'occupied'), 0) as total_actual_rent
    from all_units
  ),

  property_unit_counts as (
    select
      property_id,
      count(*) filter (where status = 'occupied')::int as occ,
      count(*)::int as tot
    from all_units
    group by property_id
  ),

  property_agg as (
    select
      count(op.id)::int as total_props,
      count(*) filter (where coalesce(puc.occ, 0) > 0)::int as occupied_props,
      count(*) filter (where coalesce(puc.occ, 0) = 0)::int as vacant_props,
      coalesce(
        round(
          (sum(coalesce(puc.occ, 0))::decimal /
           nullif(sum(coalesce(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      ) as occupancy_rate
    from owner_properties op
    left join property_unit_counts puc on puc.property_id = op.id
  ),

  lease_agg as (
    select
      (select count(*)::int from all_leases)                            as total_leases,
      count(*)::int                                                     as active_leases_count,
      (select count(*)::int from all_leases
       where lease_status in ('ended', 'terminated', 'expired'))        as expired_leases,
      count(*) filter (where end_date <= current_date + interval '30 days')::int as expiring_soon,
      coalesce(sum(rent_amount), 0)                                     as monthly_revenue
    from active_leases
  ),

  tenant_active_ids as (
    select distinct primary_tenant_id as tenant_id from active_leases
  ),

  tenant_agg as (
    select
      count(t.id)::int                                                      as total_tenants,
      count(tai.tenant_id)::int                                             as active_tenants,
      count(t.id)::int - count(tai.tenant_id)::int                         as inactive_tenants,
      count(*) filter (where t.created_at >= date_trunc('month', current_date))::int as new_this_month
    from tenants t
    left join tenant_active_ids tai on tai.tenant_id = t.id
    where exists (
      select 1 from all_leases l2
      where l2.primary_tenant_id = t.id
    )
  ),

  maintenance_agg as (
    select
      count(*)::int                                                                as total,
      count(*) filter (where status = 'open')::int                                as open_count,
      count(*) filter (where status = 'in_progress')::int                         as in_progress,
      count(*) filter (where status = 'completed')::int                           as completed,
      count(*) filter (where status = 'completed' and date(completed_at) = current_date)::int as completed_today,
      coalesce(
        avg(extract(epoch from (completed_at - created_at)) / 86400)
        filter (where completed_at is not null), 0
      )                                                                            as avg_resolution_days,
      count(*) filter (where priority = 'low')::int                               as priority_low,
      count(*) filter (where priority = 'normal')::int                            as priority_normal,
      count(*) filter (where priority = 'high')::int                              as priority_high,
      count(*) filter (where priority = 'urgent')::int                            as priority_urgent
    from all_maintenance
  ),

  trend_occupancy as (
    select
      coalesce(
        round(
          (select count(distinct l.unit_id)::numeric
           from all_leases l
           where l.lease_status = 'active'
             and l.start_date <= current_date
             and (l.end_date is null or l.end_date >= current_date)
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) as current_val,
      coalesce(
        round(
          (select count(distinct l.unit_id)::numeric
           from all_leases l
           where l.lease_status = 'active'
             and l.start_date <= current_date - interval '30 days'
             and (l.end_date is null or l.end_date >= current_date - interval '30 days')
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) as previous_val
    from all_units
  ),

  trend_revenue as (
    select
      coalesce(sum(rent_amount), 0) as current_val,
      coalesce((
        select sum(l.rent_amount)
        from all_leases l
        where l.lease_status = 'active'
          and l.start_date <= current_date - interval '30 days'
          and (l.end_date is null or l.end_date >= current_date - interval '30 days')
      ), 0) as previous_val
    from active_leases
  ),

  trend_tenants as (
    select
      (select count(distinct al.primary_tenant_id)::numeric from active_leases al) as current_val,
      coalesce((
        select count(distinct l.primary_tenant_id)::numeric
        from all_leases l
        where l.lease_status = 'active'
          and l.start_date <= current_date - interval '30 days'
          and (l.end_date is null or l.end_date >= current_date - interval '30 days')
      ), 0) as previous_val
  ),

  trend_maintenance as (
    select
      count(*) filter (where status not in ('completed', 'cancelled'))::numeric as current_val,
      coalesce((
        select count(*)::numeric
        from all_maintenance
        where created_at <= current_date - interval '30 days'
          and status != 'cancelled'
          and (status != 'completed' or completed_at > current_date - interval '30 days')
      ), 0) as previous_val
    from all_maintenance
  ),

  date_series as (
    select d::date as series_date
    from generate_series(current_date - 29, current_date, '1 day'::interval) d
  ),

  month_series as (
    select date_trunc('month', d)::date as month_start
    from generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      '1 month'::interval
    ) d
  ),

  total_unit_count as (
    select count(*)::numeric as cnt from all_units
  ),

  ts_occupancy as (
    select jsonb_agg(
      jsonb_build_object('date', occ.date, 'value', occ.rate)
      order by occ.date
    ) as data
    from (
      select
        to_char(ds.series_date, 'YYYY-MM-DD') as date,
        case when tuc.cnt > 0
          then coalesce(
            round(count(distinct l.unit_id)::numeric / tuc.cnt * 100, 2), 0
          )
          else 0
        end as rate
      from date_series ds
      cross join total_unit_count tuc
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= ds.series_date
        and (l.end_date is null or l.end_date >= ds.series_date)
      group by ds.series_date, tuc.cnt
    ) occ
  ),

  ts_revenue as (
    select jsonb_agg(
      jsonb_build_object('date', rev.date, 'value', rev.value)
      order by rev.date
    ) as data
    from (
      select
        to_char(ds.series_date, 'YYYY-MM-DD') as date,
        coalesce(sum(l.rent_amount), 0)::numeric as value
      from date_series ds
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= ds.series_date
        and (l.end_date is null or l.end_date >= ds.series_date)
      group by ds.series_date
    ) rev
  ),

  ts_revenue_6mo as (
    select jsonb_agg(
      jsonb_build_object('month', to_char(rev.month_start, 'YYYY-MM'),
                         'value', rev.value)
      order by rev.month_start
    ) as data
    from (
      select
        ms.month_start,
        coalesce(sum(l.rent_amount), 0)::numeric as value
      from month_series ms
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= (ms.month_start + interval '1 month' - interval '1 day')
        and (l.end_date is null or l.end_date >= ms.month_start)
      group by ms.month_start
    ) rev
  ),

  perf_unit_counts as (
    select
      property_id,
      count(*) as total_units,
      count(*) filter (where status = 'occupied') as occupied_units,
      count(*) filter (where status = 'available') as vacant_units
    from all_units
    group by property_id
  ),

  perf_lease_revenues as (
    select
      u.property_id,
      coalesce(sum(l.rent_amount), 0) as monthly_revenue
    from all_units u
    left join active_leases l on l.unit_id = u.id
    group by u.property_id
  ),

  perf_potential_revenues as (
    select
      property_id,
      coalesce(sum(rent_amount), 0) as potential_revenue
    from all_units
    group by property_id
  ),

  perf_open_maintenance as (
    select
      u.property_id,
      count(*) filter (where am.status in ('open', 'in_progress'))::int as open_maintenance
    from all_maintenance am
    join maintenance_requests mr on mr.id = am.id
    join all_units u on u.id = mr.unit_id
    group by u.property_id
  ),

  property_perf as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'property_name', op.name,
          'property_id', op.id,
          'total_units', coalesce(puc.total_units, 0),
          'occupied_units', coalesce(puc.occupied_units, 0),
          'vacant_units', coalesce(puc.vacant_units, 0),
          'occupancy_rate', case
            when coalesce(puc.total_units, 0) > 0
            then round((puc.occupied_units::numeric / puc.total_units::numeric) * 100, 2)
            else 0
          end,
          'annual_revenue', coalesce(plr.monthly_revenue, 0) * 12,
          'monthly_revenue', coalesce(plr.monthly_revenue, 0),
          'potential_revenue', coalesce(ppr.potential_revenue, 0),
          'open_maintenance', coalesce(pom.open_maintenance, 0),
          'address', op.address_line1,
          'property_type', op.property_type,
          'status', case
            when coalesce(puc.total_units, 0) = 0 then 'NO_UNITS'
            when coalesce(puc.occupied_units, 0) = 0 then 'vacant'
            when puc.occupied_units = puc.total_units then 'FULL'
            else 'PARTIAL'
          end
        ) order by op.name
      ),
      '[]'::jsonb
    ) as data
    from owner_properties op
    left join perf_unit_counts puc on puc.property_id = op.id
    left join perf_lease_revenues plr on plr.property_id = op.id
    left join perf_potential_revenues ppr on ppr.property_id = op.id
    left join perf_open_maintenance pom on pom.property_id = op.id
  ),

  recent_activities as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id::text,
          'title', a.title,
          'description', a.description,
          'activity_type', a.activity_type,
          'entity_type', a.entity_type,
          'entity_id', a.entity_id::text,
          'user_id', a.user_id::text,
          'created_at', a.created_at
        ) order by a.created_at desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select id, title, description, activity_type, entity_type, entity_id, user_id, created_at
      from activity
      where user_id = p_user_id
      order by created_at desc
      limit 10
    ) a
  )

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'properties', jsonb_build_object(
        'total',           pa.total_props,
        'occupied',        pa.occupied_props,
        'vacant',          pa.vacant_props,
        'occupancyRate',   pa.occupancy_rate,
        'totalMonthlyRent', ua.total_actual_rent,
        'averageRent',     ua.avg_rent
      ),
      'tenants', jsonb_build_object(
        'total',         ta.total_tenants,
        'active',        ta.active_tenants,
        'inactive',      ta.inactive_tenants,
        'newThisMonth',  ta.new_this_month
      ),
      'units', jsonb_build_object(
        'total',              ua.total_units,
        'occupied',           ua.occupied_units,
        'vacant',             ua.total_units - ua.occupied_units,
        'maintenance',        ua.maintenance_units,
        'available',          ua.vacant_units,
        'averageRent',        ua.avg_rent,
        'occupancyRate',      case when ua.total_units > 0
                                then round((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                                else 0 end,
        'occupancyChange',    tocc.current_val - tocc.previous_val,
        'totalPotentialRent', ua.total_potential_rent,
        'totalActualRent',    ua.total_actual_rent
      ),
      'leases', jsonb_build_object(
        'total',        la.total_leases,
        'active',       la.active_leases_count,
        'expired',      la.expired_leases,
        'expiringSoon', la.expiring_soon
      ),
      'maintenance', jsonb_build_object(
        'total',           ma.total,
        'open',            ma.open_count,
        'inProgress',      ma.in_progress,
        'completed',       ma.completed,
        'completedToday',  ma.completed_today,
        'avgResolutionTime', ma.avg_resolution_days,
        'byPriority', jsonb_build_object(
          'low',    ma.priority_low,
          'normal', ma.priority_normal,
          'high',   ma.priority_high,
          'urgent', ma.priority_urgent
        )
      ),
      'revenue', jsonb_build_object(
        'monthly', la.monthly_revenue,
        'yearly',  la.monthly_revenue * 12,
        'growth',  case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else 0
        end
      )
    ),
    'trends', jsonb_build_object(
      'occupancy_rate', jsonb_build_object(
        'current', tocc.current_val,
        'previous', tocc.previous_val,
        'change', tocc.current_val - tocc.previous_val,
        'percentChange', case
          when tocc.previous_val > 0
          then round(((tocc.current_val - tocc.previous_val) / tocc.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tocc.current_val > tocc.previous_val then 'up'
          when tocc.current_val < tocc.previous_val then 'down'
          else 'stable'
        end
      ),
      'monthly_revenue', jsonb_build_object(
        'current', trev.current_val,
        'previous', trev.previous_val,
        'change', trev.current_val - trev.previous_val,
        'percentChange', case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when trev.current_val > trev.previous_val then 'up'
          when trev.current_val < trev.previous_val then 'down'
          else 'stable'
        end
      ),
      'active_tenants', jsonb_build_object(
        'current', tten.current_val,
        'previous', tten.previous_val,
        'change', tten.current_val - tten.previous_val,
        'percentChange', case
          when tten.previous_val > 0
          then round(((tten.current_val - tten.previous_val) / tten.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tten.current_val > tten.previous_val then 'up'
          when tten.current_val < tten.previous_val then 'down'
          else 'stable'
        end
      ),
      'open_maintenance', jsonb_build_object(
        'current', tmnt.current_val,
        'previous', tmnt.previous_val,
        'change', tmnt.current_val - tmnt.previous_val,
        'percentChange', case
          when tmnt.previous_val > 0
          then round(((tmnt.current_val - tmnt.previous_val) / tmnt.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tmnt.current_val > tmnt.previous_val then 'up'
          when tmnt.current_val < tmnt.previous_val then 'down'
          else 'stable'
        end
      )
    ),
    'time_series', jsonb_build_object(
      'occupancy_rate', coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue', coalesce(tsr.data, '[]'::jsonb),
      'monthly_revenue_6mo', coalesce(ts6.data, '[]'::jsonb)
    ),
    'property_performance', pp.data,
    'activities', ra.data
  ) into v_result
  from property_agg pa
  cross join unit_agg ua
  cross join tenant_agg ta
  cross join lease_agg la
  cross join maintenance_agg ma
  cross join trend_occupancy tocc
  cross join trend_revenue trev
  cross join trend_tenants tten
  cross join trend_maintenance tmnt
  cross join ts_occupancy tso
  cross join ts_revenue tsr
  cross join ts_revenue_6mo ts6
  cross join property_perf pp
  cross join recent_activities ra;

  return v_result;
end;
$function$;
