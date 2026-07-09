-- DATA-03: the "Expired" lease tile must count naturally-lapsed leases. The
-- expire-leases cron (20260222120000) sets those to lease_status='expired', NOT
-- 'ended' (which is a manual end). Change the expiredLeases FILTER from 'ended' to
-- 'expired'. Body otherwise byte-identical to the live definition (from
-- 20260306190000). No return-type change -> CREATE OR REPLACE (grants preserved).
CREATE OR REPLACE FUNCTION public.get_lease_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'expiredLeases', count(*) filter (where lease_status = 'expired'),
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
$function$;
