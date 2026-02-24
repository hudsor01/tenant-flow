-- migration: fix analytics rpcs that still reference dropped property_owners table
-- purpose: get_maintenance_analytics and get_billing_insights were defined in
--   20251208120000_fix_analytics_rpc_user_id_mapping.sql with a property_owners lookup.
--   the property_owners table was renamed to stripe_connected_accounts in
--   20251220100000_rename_property_owners_to_stripe_connected_accounts.sql.
--   20251230090000_fix_property_owners_references.sql fixed 10 other functions but
--   missed these two. both return 404 or runtime errors in production.
--
-- fixes:
--   1. get_maintenance_analytics(user_id uuid) — remove property_owners lookup
--   2. get_billing_insights(owner_id_param uuid, ...) — remove property_owners lookup
--
-- affected tables: maintenance_requests, leases, rent_payments (owner_user_id column)
-- risk: low — create or replace, backward-compatible signatures

-- ============================================================================
-- function 1: get_maintenance_analytics
-- signature: get_maintenance_analytics(user_id uuid) returns jsonb
-- called from: use-analytics.ts, use-reports.ts
--   supabase.rpc('get_maintenance_analytics', { user_id: user.id })
-- ============================================================================

create or replace function public.get_maintenance_analytics(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_result jsonb;
  v_total_requests integer;
  v_completed_requests integer;
  v_open_requests integer;
  v_avg_resolution_hours numeric;
  v_by_status jsonb;
  v_by_priority jsonb;
begin
  -- alias parameter to avoid ambiguity in WHERE clauses below
  v_user_id := user_id;

  select count(*) into v_total_requests
  from maintenance_requests
  where owner_user_id = v_user_id;

  select count(*) into v_completed_requests
  from maintenance_requests
  where owner_user_id = v_user_id
    and status = 'completed';

  select count(*) into v_open_requests
  from maintenance_requests
  where owner_user_id = v_user_id
    and status = 'open';

  select coalesce(
    extract(epoch from avg(completed_at - created_at) filter (where completed_at is not null)) / 3600,
    0
  ) into v_avg_resolution_hours
  from maintenance_requests
  where owner_user_id = v_user_id;

  select coalesce(
    jsonb_agg(jsonb_build_object('status', s, 'count', c)),
    '[]'::jsonb
  ) into v_by_status
  from (
    select status as s, count(*) as c
    from maintenance_requests
    where owner_user_id = v_user_id
    group by status
  ) sub;

  select coalesce(
    jsonb_agg(jsonb_build_object('priority', pr, 'count', c)),
    '[]'::jsonb
  ) into v_by_priority
  from (
    select priority as pr, count(*) as c
    from maintenance_requests
    where owner_user_id = v_user_id
    group by priority
  ) sub;

  v_result := jsonb_build_object(
    'total_requests', v_total_requests,
    'open_requests', v_open_requests,
    'avg_resolution_hours', v_avg_resolution_hours,
    'total_cost', 0,
    'average_cost', 0,
    'avgResolutionTime', v_avg_resolution_hours / 24,
    'completionRate', case
      when v_total_requests > 0
      then round((v_completed_requests::decimal / v_total_requests::decimal) * 100, 2)
      else 0
    end,
    'priorityBreakdown', (
      select jsonb_build_object(
        'low',    coalesce(sum(case when priority = 'low'    then 1 else 0 end), 0),
        'normal', coalesce(sum(case when priority = 'normal' then 1 else 0 end), 0),
        'high',   coalesce(sum(case when priority = 'high'   then 1 else 0 end), 0),
        'urgent', coalesce(sum(case when priority = 'urgent' then 1 else 0 end), 0)
      )
      from maintenance_requests where owner_user_id = v_user_id
    ),
    'by_status', v_by_status,
    'by_priority', v_by_priority,
    'monthly_cost', '[]'::jsonb,
    'vendor_performance', '[]'::jsonb,
    'trendsOverTime', '[]'::jsonb
  );

  return v_result;
end;
$$;

comment on function public.get_maintenance_analytics(uuid) is
  'Returns maintenance analytics. FIXED: Uses owner_user_id directly on maintenance_requests, no property_owners lookup.';

grant execute on function public.get_maintenance_analytics(uuid) to authenticated;
grant execute on function public.get_maintenance_analytics(uuid) to service_role;


-- ============================================================================
-- function 2: get_billing_insights
-- signature: get_billing_insights(owner_id_param uuid, ...) returns jsonb
-- called from: use-analytics.ts
--   supabase.rpc('get_billing_insights', { owner_id_param: user.id })
-- ============================================================================

create or replace function public.get_billing_insights(
  owner_id_param uuid,
  start_date_param timestamp without time zone default null,
  end_date_param timestamp without time zone default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
  v_mrr numeric;
  v_total_revenue numeric;
  v_active_leases integer;
  v_expired_leases integer;
  v_unpaid_total numeric;
  v_unpaid_count integer;
  v_late_fee_total numeric;
  v_tenant_count integer;
begin
  -- monthly recurring revenue from active leases
  -- uses owner_user_id directly — no property_owners lookup needed
  select coalesce(sum(rent_amount), 0) into v_mrr
  from leases
  where owner_user_id = owner_id_param
    and lease_status = 'active';

  v_total_revenue := v_mrr * 12;

  -- active and expired lease counts for churn rate
  select
    count(*) filter (where lease_status = 'active'),
    count(*) filter (where lease_status in ('ended', 'terminated'))
  into v_active_leases, v_expired_leases
  from leases
  where owner_user_id = owner_id_param;

  -- unpaid/pending rent payments
  select
    coalesce(sum(rp.amount), 0),
    count(*)::integer
  into v_unpaid_total, v_unpaid_count
  from rent_payments rp
  join leases l on rp.lease_id = l.id
  where l.owner_user_id = owner_id_param
    and rp.status in ('pending', 'processing', 'failed');

  -- late fee total: outstanding payments past due date
  select coalesce(sum(rp.amount), 0) into v_late_fee_total
  from rent_payments rp
  join leases l on rp.lease_id = l.id
  where l.owner_user_id = owner_id_param
    and rp.status not in ('succeeded', 'refunded')
    and rp.due_date < current_date;

  -- active tenant count
  select count(distinct l.primary_tenant_id) into v_tenant_count
  from leases l
  where l.owner_user_id = owner_id_param
    and l.lease_status = 'active';

  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'mrr', v_mrr,
    'churnRate', case
      when (v_active_leases + v_expired_leases) > 0
      then round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      else 0
    end,
    'unpaidTotal', v_unpaid_total,
    'unpaidCount', v_unpaid_count,
    'lateFeeTotal', v_late_fee_total,
    'tenantCount', v_tenant_count
  );

  return v_result;
end;
$$;

comment on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) is
  'Returns billing insights including MRR, churn rate, and payment status. FIXED: Uses owner_user_id directly, no property_owners lookup.';

grant execute on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) to authenticated;
grant execute on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) to service_role;


-- note: get_financial_overview, get_occupancy_trends_optimized, and
-- get_revenue_trends_optimized are created/fixed in other migrations
-- (20251225140000, 20251230090000). re-grants omitted here since those
-- migrations may not be applied; they include their own grants.
