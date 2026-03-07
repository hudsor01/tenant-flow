-- ============================================================================
-- Phase 8: Performance Optimization - Consolidate stats queries into single RPCs
-- Replaces 7 HEAD queries (maintenance) and 6 queries (leases) with single RPCs
-- using PostgreSQL FILTER aggregates for efficient single-pass counting.
-- ============================================================================

-- get_maintenance_stats: Returns all status counts in one query
-- Replaces 7 separate HEAD queries in maintenance-keys.ts stats()
create or replace function get_maintenance_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- SEC-01: Validate caller identity
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'open', count(*) filter (where status = 'open'),
      'assigned', count(*) filter (where status = 'assigned'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'needs_reassignment', count(*) filter (where status = 'needs_reassignment'),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'on_hold', count(*) filter (where status = 'on_hold'),
      'total', count(*)
    )
    from maintenance_requests
    where owner_user_id = p_user_id
  );
end;
$$;

-- get_lease_stats: Returns all lease counts and rent aggregates in one query
-- Replaces 6 separate queries in lease-keys.ts stats()
create or replace function get_lease_stats(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
  v_active_count integer;
  v_total_rent numeric;
  v_total_deposits numeric;
  v_avg_rent numeric;
begin
  -- SEC-01: Validate caller identity
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  -- Counts (single table scan with FILTER)
  select
    jsonb_build_object(
      'totalLeases', count(*) filter (where lease_status != 'inactive'),
      'activeLeases', count(*) filter (where lease_status = 'active'),
      'expiredLeases', count(*) filter (where lease_status = 'ended'),
      'terminatedLeases', count(*) filter (where lease_status = 'terminated'),
      'expiringLeases', count(*) filter (
        where lease_status = 'active'
        and end_date <= (now() + interval '30 days')
        and end_date >= now()
      )
    )
  into v_result
  from leases
  where owner_user_id = p_user_id;

  -- Rent aggregates (only active leases)
  select
    count(*),
    coalesce(sum(rent_amount), 0),
    coalesce(sum(security_deposit), 0)
  into v_active_count, v_total_rent, v_total_deposits
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active';

  v_avg_rent := case when v_active_count > 0
    then v_total_rent / v_active_count
    else 0
  end;

  -- Merge aggregates into result
  v_result := v_result || jsonb_build_object(
    'totalMonthlyRent', v_total_rent,
    'averageRent', v_avg_rent,
    'total_security_deposits', v_total_deposits
  );

  return v_result;
end;
$$;
