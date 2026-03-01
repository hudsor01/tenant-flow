-- migration: create unified dashboard RPC to replace 9 separate HTTP round trips
-- purpose: consolidate get_dashboard_stats + 4x get_metric_trend + 2x get_dashboard_time_series
--          + get_property_performance_cached + get_user_dashboard_activities into one call
-- affected tables: properties, units, leases, tenants, maintenance_requests, activity
-- safety: additive-only (new function). old functions are NOT dropped — frontend can revert
--         without a DB migration rollback.
-- performance: 9 HTTP round trips → 1. tables scanned once via shared CTEs.
--              time series uses set-based generate_series instead of PL/pgSQL FOR LOOP (30 queries → 1).
--              metric trends now compute real previous-period values instead of always returning "stable".

create or replace function public.get_dashboard_data_v2(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result jsonb;
begin
  with
  -- ============================================================
  -- SHARED BASE CTEs — each table scanned exactly ONCE
  -- ============================================================

  owner_properties as (
    select id, name
    from properties
    where owner_user_id = p_user_id
      and status != 'inactive'
  ),

  all_units as (
    select u.id, u.property_id, u.status, u.rent_amount
    from units u
    where u.property_id in (select id from owner_properties)
  ),

  all_leases as (
    select l.id, l.unit_id, l.primary_tenant_id, l.rent_amount,
           l.start_date, l.end_date, l.lease_status
    from leases l
    where l.owner_user_id = p_user_id
  ),

  active_leases as (
    select * from all_leases where lease_status = 'active'
  ),

  all_maintenance as (
    select id, status, priority, created_at, completed_at
    from maintenance_requests
    where owner_user_id = p_user_id
  ),

  -- ============================================================
  -- STATS AGGREGATIONS (replaces get_dashboard_stats)
  -- ============================================================

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
       where lease_status in ('ended', 'terminated'))                   as expired_leases,
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
      join all_units u2 on u2.id = l2.unit_id
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

  -- ============================================================
  -- METRIC TRENDS (replaces 4x get_metric_trend)
  -- now computes REAL previous-period values (30 days ago)
  -- ============================================================

  trend_occupancy as (
    select
      coalesce(
        round(count(*) filter (where status = 'occupied')::numeric /
              nullif(count(*)::numeric, 0) * 100, 2), 0
      ) as current_val,
      -- previous occupancy: count units that had active leases 30 days ago
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
          and (status != 'completed' or completed_at > current_date - interval '30 days')
      ), 0) as previous_val
    from all_maintenance
  ),

  -- ============================================================
  -- TIME SERIES (replaces 2x get_dashboard_time_series)
  -- set-based generate_series — no PL/pgSQL FOR LOOP
  -- ============================================================

  date_series as (
    select d::date as series_date
    from generate_series(current_date - 29, current_date, '1 day'::interval) d
  ),

  -- occupancy rate: no historical unit status tracking exists
  -- returns current occupancy for every day (matches original behavior)
  ts_occupancy as (
    select jsonb_agg(
      jsonb_build_object(
        'date', to_char(ds.series_date, 'YYYY-MM-DD'),
        'value', (select coalesce(
          round(count(*) filter (where status = 'occupied')::numeric /
                nullif(count(*)::numeric, 0) * 100, 2), 0
        ) from all_units)
      ) order by ds.series_date
    ) as data
    from date_series ds
  ),

  -- monthly revenue: historical via lease start_date/end_date
  ts_revenue as (
    select jsonb_agg(
      jsonb_build_object('date', rev.date, 'value', rev.value)
      order by rev.date
    ) as data
    from (
      select
        to_char(ds.series_date, 'YYYY-MM-DD') as date,
        coalesce((
          select sum(l.rent_amount)
          from all_leases l
          where l.lease_status = 'active'
            and l.start_date <= ds.series_date
            and (l.end_date is null or l.end_date >= ds.series_date)
        ), 0)::numeric as value
      from date_series ds
    ) rev
  ),

  -- ============================================================
  -- PROPERTY PERFORMANCE (replaces get_property_performance_cached)
  -- ============================================================

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
          'potential_revenue', coalesce(ppr.potential_revenue, 0)
        ) order by op.name
      ),
      '[]'::jsonb
    ) as data
    from owner_properties op
    left join perf_unit_counts puc on puc.property_id = op.id
    left join perf_lease_revenues plr on plr.property_id = op.id
    left join perf_potential_revenues ppr on ppr.property_id = op.id
  ),

  -- ============================================================
  -- ACTIVITIES (replaces get_user_dashboard_activities)
  -- ============================================================

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

  -- ============================================================
  -- ASSEMBLE FINAL JSONB (single row)
  -- ============================================================

  select jsonb_build_object(
    -- Stats section (identical structure to get_dashboard_stats)
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
        'vacant',             ua.vacant_units,
        'maintenance',        ua.maintenance_units,
        'available',          ua.vacant_units,
        'averageRent',        ua.avg_rent,
        'occupancyRate',      case when ua.total_units > 0
                                then round((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                                else 0 end,
        'occupancyChange',    0,
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
        'growth',  0
      )
    ),

    -- Metric trends section (4 metrics with real previous-period comparison)
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

    -- Time series section (30-day series, set-based)
    'time_series', jsonb_build_object(
      'occupancy_rate', coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue', coalesce(tsr.data, '[]'::jsonb)
    ),

    -- Property performance array
    'property_performance', pp.data,

    -- Recent activities array
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
  cross join property_perf pp
  cross join recent_activities ra;

  return v_result;
end;
$function$;

-- grant execute to authenticated (PostgREST needs this)
grant execute on function public.get_dashboard_data_v2(uuid) to authenticated;
grant execute on function public.get_dashboard_data_v2(uuid) to service_role;

comment on function public.get_dashboard_data_v2 is
  'Unified dashboard data fetch — replaces 9 separate RPCs with 1 call. '
  'Returns stats, trends, time_series, property_performance, and activities in a single JSONB response.';
