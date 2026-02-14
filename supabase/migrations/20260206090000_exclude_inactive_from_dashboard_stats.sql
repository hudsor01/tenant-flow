-- Migration: Exclude inactive (soft-deleted) properties from dashboard stats
-- Purpose: The get_dashboard_stats function counted all properties regardless of status.
--   Properties with status='inactive' (soft-deleted via bulk delete or single delete)
--   should be excluded from all dashboard statistics: property counts, unit queries,
--   tenant queries, and revenue calculations.
-- Affected function: get_dashboard_stats(uuid)

drop function if exists public.get_dashboard_stats(uuid);

create or replace function public.get_dashboard_stats(p_user_id uuid)
returns table (
  properties public.property_stats_type,
  tenants public.tenant_stats_type,
  units public.unit_stats_type,
  leases public.lease_stats_type,
  maintenance public.maintenance_stats_type,
  revenue public.revenue_stats_type
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_properties public.property_stats_type;
  v_tenants public.tenant_stats_type;
  v_units public.unit_stats_type;
  v_leases public.lease_stats_type;
  v_maintenance public.maintenance_stats_type;
  v_revenue public.revenue_stats_type;
  v_maintenance_priority public.maintenance_priority_type;

  -- Property stats temp vars
  v_prop_total integer;
  v_prop_occupied integer;
  v_prop_vacant integer;
  v_prop_occupancy_rate numeric;
  v_prop_total_monthly_rent bigint;
  v_prop_average_rent numeric;

  -- Tenant stats temp vars
  v_tenant_total integer;
  v_tenant_active integer;
  v_tenant_inactive integer;
  v_tenant_new_this_month integer;

  -- Unit stats temp vars
  v_unit_total integer;
  v_unit_occupied integer;
  v_unit_vacant integer;
  v_unit_maintenance integer;
  v_unit_average_rent numeric;
  v_unit_available integer;
  v_unit_occupancy_rate numeric;
  v_unit_occupancy_change numeric;
  v_unit_total_potential_rent bigint;
  v_unit_total_actual_rent bigint;

  -- Lease stats temp vars
  v_lease_total integer;
  v_lease_active integer;
  v_lease_expired integer;
  v_lease_expiring_soon integer;

  -- Maintenance stats temp vars
  v_maint_total integer;
  v_maint_open integer;
  v_maint_in_progress integer;
  v_maint_completed integer;
  v_maint_completed_today integer;
  v_maint_avg_resolution_time numeric;

  -- Maintenance priority temp vars
  v_maint_priority_low integer;
  v_maint_priority_normal integer;
  v_maint_priority_high integer;
  v_maint_priority_urgent integer;

  -- Revenue stats temp vars
  v_rev_monthly bigint;
  v_rev_yearly bigint;
  v_rev_growth numeric;
begin
  -- Check if user has any non-inactive properties (is an active property owner)
  -- Excludes soft-deleted properties (status = 'inactive')
  if not exists (select 1 from properties where owner_user_id = p_user_id and status != 'inactive') then
    -- Return empty stats for non-owners using direct field assignment
    v_properties.total := 0;
    v_properties.occupied := 0;
    v_properties.vacant := 0;
    v_properties.occupancy_rate := 0;
    v_properties.total_monthly_rent := 0;
    v_properties.average_rent := 0;

    v_tenants.total := 0;
    v_tenants.active := 0;
    v_tenants.inactive := 0;
    v_tenants.new_this_month := 0;

    v_units.total := 0;
    v_units.occupied := 0;
    v_units.vacant := 0;
    v_units.maintenance := 0;
    v_units.average_rent := 0;
    v_units.available := 0;
    v_units.occupancy_rate := 0;
    v_units.occupancy_change := 0;
    v_units.total_potential_rent := 0;
    v_units.total_actual_rent := 0;

    v_leases.total := 0;
    v_leases.active := 0;
    v_leases.expired := 0;
    v_leases.expiring_soon := 0;

    v_maintenance_priority.low := 0;
    v_maintenance_priority.normal := 0;
    v_maintenance_priority.high := 0;
    v_maintenance_priority.urgent := 0;

    v_maintenance.total := 0;
    v_maintenance.open := 0;
    v_maintenance.in_progress := 0;
    v_maintenance.completed := 0;
    v_maintenance.completed_today := 0;
    v_maintenance.avg_resolution_time := 0;
    v_maintenance.by_priority := v_maintenance_priority;

    v_revenue.monthly := 0;
    v_revenue.yearly := 0;
    v_revenue.growth := 0;

    return query select v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
    return;
  end if;

  -- Properties statistics using temp vars then assign to composite
  -- Excludes inactive (soft-deleted) properties from all counts
  with property_stats as (
    select
      p.id,
      (select count(*) from units u where u.property_id = p.id and u.status = 'occupied') as occupied_units,
      (select count(*) from units u where u.property_id = p.id) as total_units
    from properties p
    where p.owner_user_id = p_user_id
      and p.status != 'inactive'
  )
  select
    count(*)::integer,
    count(*) filter (where occupied_units > 0)::integer,
    count(*) filter (where occupied_units = 0 or total_units = 0)::integer,
    coalesce(
      round(
        (sum(occupied_units)::numeric / nullif(sum(total_units)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    coalesce(
      (select sum(u.rent_amount)
       from units u
       join properties p on p.id = u.property_id
       where p.owner_user_id = p_user_id
       and p.status != 'inactive'
       and u.status = 'occupied'),
      0
    )::bigint,
    coalesce(
      (select avg(u.rent_amount)
       from units u
       join properties p on p.id = u.property_id
       where p.owner_user_id = p_user_id
       and p.status != 'inactive'),
      0
    )::numeric
  into v_prop_total, v_prop_occupied, v_prop_vacant,
       v_prop_occupancy_rate, v_prop_total_monthly_rent, v_prop_average_rent
  from property_stats;

  v_properties.total := v_prop_total;
  v_properties.occupied := v_prop_occupied;
  v_properties.vacant := v_prop_vacant;
  v_properties.occupancy_rate := v_prop_occupancy_rate;
  v_properties.total_monthly_rent := v_prop_total_monthly_rent;
  v_properties.average_rent := v_prop_average_rent;

  -- Tenants statistics
  -- Only count tenants linked to non-inactive properties
  select
    count(*)::integer,
    count(*) filter (where exists (
      select 1 from leases l
      where l.primary_tenant_id = t.id
      and l.lease_status = 'active'
    ))::integer,
    count(*) filter (where not exists (
      select 1 from leases l
      where l.primary_tenant_id = t.id
      and l.lease_status = 'active'
    ))::integer,
    count(*) filter (where t.created_at >= date_trunc('month', current_date))::integer
  into v_tenant_total, v_tenant_active, v_tenant_inactive, v_tenant_new_this_month
  from tenants t
  where exists (
    select 1 from units u
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
    and p.status != 'inactive'
    and exists (select 1 from leases l where l.unit_id = u.id and l.primary_tenant_id = t.id)
  );

  v_tenants.total := coalesce(v_tenant_total, 0);
  v_tenants.active := coalesce(v_tenant_active, 0);
  v_tenants.inactive := coalesce(v_tenant_inactive, 0);
  v_tenants.new_this_month := coalesce(v_tenant_new_this_month, 0);

  -- Units statistics
  -- Only count units belonging to non-inactive properties
  select
    count(*)::integer,
    count(*) filter (where status = 'occupied')::integer,
    count(*) filter (where status = 'available')::integer,
    count(*) filter (where status = 'maintenance')::integer,
    coalesce(avg(rent_amount), 0)::numeric,
    count(*) filter (where status = 'available')::integer,
    coalesce(
      round(
        (count(*) filter (where status = 'occupied')::numeric / nullif(count(*)::numeric, 0)) * 100,
        2
      ),
      0
    )::numeric,
    0::numeric,
    coalesce(sum(rent_amount), 0)::bigint,
    coalesce(sum(rent_amount) filter (where status = 'occupied'), 0)::bigint
  into v_unit_total, v_unit_occupied, v_unit_vacant, v_unit_maintenance,
       v_unit_average_rent, v_unit_available, v_unit_occupancy_rate,
       v_unit_occupancy_change, v_unit_total_potential_rent, v_unit_total_actual_rent
  from units
  where property_id in (
    select id from properties where owner_user_id = p_user_id and status != 'inactive'
  );

  v_units.total := coalesce(v_unit_total, 0);
  v_units.occupied := coalesce(v_unit_occupied, 0);
  v_units.vacant := coalesce(v_unit_vacant, 0);
  v_units.maintenance := coalesce(v_unit_maintenance, 0);
  v_units.average_rent := coalesce(v_unit_average_rent, 0);
  v_units.available := coalesce(v_unit_available, 0);
  v_units.occupancy_rate := coalesce(v_unit_occupancy_rate, 0);
  v_units.occupancy_change := coalesce(v_unit_occupancy_change, 0);
  v_units.total_potential_rent := coalesce(v_unit_total_potential_rent, 0);
  v_units.total_actual_rent := coalesce(v_unit_total_actual_rent, 0);

  -- Leases statistics
  select
    count(*)::integer,
    count(*) filter (where lease_status = 'active')::integer,
    count(*) filter (where lease_status in ('ended', 'terminated'))::integer,
    count(*) filter (
      where lease_status = 'active'
      and end_date <= current_date + interval '30 days'
    )::integer
  into v_lease_total, v_lease_active, v_lease_expired, v_lease_expiring_soon
  from leases
  where owner_user_id = p_user_id;

  v_leases.total := coalesce(v_lease_total, 0);
  v_leases.active := coalesce(v_lease_active, 0);
  v_leases.expired := coalesce(v_lease_expired, 0);
  v_leases.expiring_soon := coalesce(v_lease_expiring_soon, 0);

  -- Maintenance priority breakdown
  select
    count(*) filter (where priority = 'low')::integer,
    count(*) filter (where priority = 'normal')::integer,
    count(*) filter (where priority = 'high')::integer,
    count(*) filter (where priority = 'urgent')::integer
  into v_maint_priority_low, v_maint_priority_normal, v_maint_priority_high, v_maint_priority_urgent
  from maintenance_requests
  where owner_user_id = p_user_id;

  v_maintenance_priority.low := coalesce(v_maint_priority_low, 0);
  v_maintenance_priority.normal := coalesce(v_maint_priority_normal, 0);
  v_maintenance_priority.high := coalesce(v_maint_priority_high, 0);
  v_maintenance_priority.urgent := coalesce(v_maint_priority_urgent, 0);

  -- Maintenance statistics
  select
    count(*)::integer,
    count(*) filter (where status = 'open')::integer,
    count(*) filter (where status = 'in_progress')::integer,
    count(*) filter (where status = 'completed')::integer,
    count(*) filter (where status = 'completed' and date(completed_at) = current_date)::integer,
    coalesce(
      avg(extract(epoch from (completed_at - created_at)) / 86400) filter (where completed_at is not null),
      0
    )::numeric
  into v_maint_total, v_maint_open, v_maint_in_progress,
       v_maint_completed, v_maint_completed_today, v_maint_avg_resolution_time
  from maintenance_requests
  where owner_user_id = p_user_id;

  v_maintenance.total := coalesce(v_maint_total, 0);
  v_maintenance.open := coalesce(v_maint_open, 0);
  v_maintenance.in_progress := coalesce(v_maint_in_progress, 0);
  v_maintenance.completed := coalesce(v_maint_completed, 0);
  v_maintenance.completed_today := coalesce(v_maint_completed_today, 0);
  v_maintenance.avg_resolution_time := coalesce(v_maint_avg_resolution_time, 0);
  v_maintenance.by_priority := v_maintenance_priority;

  -- Revenue statistics
  select
    coalesce(sum(rent_amount), 0)::bigint,
    coalesce(sum(rent_amount) * 12, 0)::bigint
  into v_rev_monthly, v_rev_yearly
  from leases
  where owner_user_id = p_user_id and lease_status = 'active';

  v_revenue.monthly := coalesce(v_rev_monthly, 0);
  v_revenue.yearly := coalesce(v_rev_yearly, 0);
  v_revenue.growth := 0;

  -- Return all stats as a single row
  return query select v_properties, v_tenants, v_units, v_leases, v_maintenance, v_revenue;
end;
$$;

-- Grant execute permission
grant execute on function public.get_dashboard_stats(uuid) to authenticated;
grant execute on function public.get_dashboard_stats(uuid) to service_role;

comment on function public.get_dashboard_stats(uuid) is 'Returns typed dashboard statistics for a property owner. Excludes inactive (soft-deleted) properties from all counts and calculations.';

-- ============================================================================
-- Fix get_property_performance_cached: exclude inactive properties
-- ============================================================================

create or replace function public.get_property_performance_cached(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
begin
  with
  -- Get all non-inactive properties for this owner
  owner_properties as (
    select p.id, p.name
    from properties p
    where p.owner_user_id = p_user_id
      and p.status != 'inactive'
  ),
  -- Pre-calculate ALL unit counts in single pass
  unit_counts as (
    select
      u.property_id,
      count(*) as total_units,
      count(*) filter (where u.status = 'occupied') as occupied_units,
      count(*) filter (where u.status = 'available') as vacant_units
    from units u
    join owner_properties op on op.id = u.property_id
    group by u.property_id
  ),
  -- Pre-calculate ALL lease revenues in single pass
  lease_revenues as (
    select
      u.property_id,
      coalesce(sum(l.rent_amount), 0) as monthly_revenue
    from units u
    join owner_properties op on op.id = u.property_id
    left join leases l on l.unit_id = u.id and l.lease_status = 'active'
    group by u.property_id
  ),
  -- Pre-calculate potential revenue (from all units, not just occupied)
  potential_revenues as (
    select
      u.property_id,
      coalesce(sum(u.rent_amount), 0) as potential_revenue
    from units u
    join owner_properties op on op.id = u.property_id
    group by u.property_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'property_name', op.name,
        'property_id', op.id,
        'total_units', coalesce(uc.total_units, 0),
        'occupied_units', coalesce(uc.occupied_units, 0),
        'vacant_units', coalesce(uc.vacant_units, 0),
        'occupancy_rate', case
          when coalesce(uc.total_units, 0) > 0
          then round((uc.occupied_units::numeric / uc.total_units::numeric) * 100, 2)
          else 0
        end,
        'annual_revenue', coalesce(lr.monthly_revenue, 0) * 12,
        'monthly_revenue', coalesce(lr.monthly_revenue, 0),
        'potential_revenue', coalesce(pr.potential_revenue, 0)
      ) order by op.name
    ),
    '[]'::jsonb
  ) into v_result
  from owner_properties op
  left join unit_counts uc on uc.property_id = op.id
  left join lease_revenues lr on lr.property_id = op.id
  left join potential_revenues pr on pr.property_id = op.id;

  return v_result;
end;
$$;

grant execute on function public.get_property_performance_cached(uuid) to authenticated;
grant execute on function public.get_property_performance_cached(uuid) to service_role;

comment on function public.get_property_performance_cached(uuid) is
  'Returns property performance metrics. Excludes inactive (soft-deleted) properties.';

-- ============================================================================
-- Fix get_property_performance_with_trends: exclude inactive properties
-- ============================================================================

create or replace function public.get_property_performance_with_trends(
  p_user_id uuid,
  p_timeframe text default '30d',
  p_limit integer default 100
)
returns table (
  property_id uuid,
  property_name text,
  occupancy_rate numeric,
  total_revenue bigint,
  previous_revenue bigint,
  trend_percentage numeric,
  timeframe text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_days integer;
  v_start_date date;
  v_prev_start_date date;
  v_prev_end_date date;
begin
  v_days := case p_timeframe
    when '7d' then 7
    when '30d' then 30
    when '90d' then 90
    when '180d' then 180
    when '365d' then 365
    else 30
  end;

  v_start_date := current_date - v_days;
  v_prev_end_date := v_start_date - interval '1 day';
  v_prev_start_date := v_prev_end_date - v_days;

  return query
  with
  -- Get all non-inactive properties for this owner
  owner_properties as (
    select p.id as prop_id, p.name as prop_name
    from properties p
    where p.owner_user_id = p_user_id
      and p.status != 'inactive'
  ),
  -- Calculate occupancy per property
  property_occupancy as (
    select
      op.prop_id,
      op.prop_name,
      coalesce(
        round(
          (count(*) filter (where u.status = 'occupied')::numeric /
           nullif(count(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) as occ_rate
    from owner_properties op
    left join units u on u.property_id = op.prop_id
    group by op.prop_id, op.prop_name
  ),
  -- Current period revenue per property (only non-inactive properties)
  current_revenue as (
    select
      p.id as prop_id,
      coalesce(sum(rp.amount), 0)::bigint as revenue
    from properties p
    left join units u on u.property_id = p.id
    left join leases l on l.unit_id = u.id
    left join rent_payments rp on
      rp.lease_id = l.id
      and rp.status = 'succeeded'
      and rp.paid_date >= v_start_date
    where p.owner_user_id = p_user_id
      and p.status != 'inactive'
    group by p.id
  ),
  -- Previous period revenue per property (only non-inactive properties)
  previous_revenue as (
    select
      p.id as prop_id,
      coalesce(sum(rp.amount), 0)::bigint as revenue
    from properties p
    left join units u on u.property_id = p.id
    left join leases l on l.unit_id = u.id
    left join rent_payments rp on
      rp.lease_id = l.id
      and rp.status = 'succeeded'
      and rp.paid_date >= v_prev_start_date
      and rp.paid_date < v_start_date
    where p.owner_user_id = p_user_id
      and p.status != 'inactive'
    group by p.id
  )
  select
    po.prop_id as property_id,
    po.prop_name as property_name,
    po.occ_rate as occupancy_rate,
    coalesce(cr.revenue, 0) as total_revenue,
    coalesce(pr.revenue, 0) as previous_revenue,
    case
      when coalesce(pr.revenue, 0) > 0
      then round(((coalesce(cr.revenue, 0) - pr.revenue)::numeric / pr.revenue::numeric) * 100, 2)
      when coalesce(cr.revenue, 0) > 0 then 100.00
      else 0.00
    end as trend_percentage,
    p_timeframe as timeframe
  from property_occupancy po
  left join current_revenue cr on cr.prop_id = po.prop_id
  left join previous_revenue pr on pr.prop_id = po.prop_id
  order by po.prop_name
  limit p_limit;
end;
$$;

grant execute on function public.get_property_performance_with_trends(uuid, text, integer) to authenticated;
grant execute on function public.get_property_performance_with_trends(uuid, text, integer) to service_role;

comment on function public.get_property_performance_with_trends(uuid, text, integer) is
  'Returns property performance with revenue trends. Excludes inactive (soft-deleted) properties.';
