-- migration: create missing analytics rpc functions
-- purpose: migrations 20251225140000 and 20251230090000 defined these functions
--   but were apparently never pushed to production. all three return 404 in prod.
--   this migration creates them using owner_user_id directly (no property_owners lookup).
--
-- functions created:
--   1. get_financial_overview(p_user_id uuid) returns jsonb
--   2. get_occupancy_trends_optimized(p_user_id uuid, p_months integer) returns jsonb
--   3. get_revenue_trends_optimized(p_user_id uuid, p_months integer) returns jsonb
--
-- callers (from use-analytics.ts):
--   supabase.rpc('get_financial_overview', { p_user_id: user.id })
--   supabase.rpc('get_occupancy_trends_optimized', { p_user_id: user.id, p_months: 12 })
--   get_revenue_trends_optimized called indirectly / may be used in future hooks
--
-- all functions: security definer, set search_path to 'public', owner_user_id pattern

-- ============================================================================
-- 1. get_financial_overview
-- returns jsonb with { overview: {...}, highlights: [...] }
-- ============================================================================

create or replace function public.get_financial_overview(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_total_revenue    numeric;
  v_total_expenses   numeric;
  v_net_income       numeric;
  v_accounts_receivable numeric;
begin
  -- annual revenue from active leases (owner_user_id directly on leases)
  select coalesce(sum(rent_amount) * 12, 0) into v_total_revenue
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active';

  -- total expenses this year via maintenance → units → properties chain
  select coalesce(sum(e.amount), 0) into v_total_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  join units u on u.id = mr.unit_id
  join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  -- accounts receivable: pending/processing rent payments
  select coalesce(sum(rp.amount), 0) into v_accounts_receivable
  from rent_payments rp
  join leases l on rp.lease_id = l.id
  where l.owner_user_id = p_user_id
    and rp.status in ('pending', 'processing');

  return jsonb_build_object(
    'overview', jsonb_build_object(
      'total_revenue',        v_total_revenue,
      'total_expenses',       v_total_expenses,
      'net_income',           v_net_income,
      'accounts_receivable',  v_accounts_receivable,
      'accounts_payable',     0
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object(
        'label', 'Monthly Revenue',
        'value', v_total_revenue / 12,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Operating Margin',
        'value', case
          when v_total_revenue > 0
          then round((v_net_income / v_total_revenue * 100)::numeric, 1)
          else 0
        end,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Cash Position',
        'value', v_net_income,
        'trend', null
      )
    )
  );
end;
$$;

comment on function public.get_financial_overview(uuid) is
  'Returns financial overview snapshot. Uses owner_user_id directly, no property_owners lookup.';

grant execute on function public.get_financial_overview(uuid) to authenticated;
grant execute on function public.get_financial_overview(uuid) to service_role;


-- ============================================================================
-- 2. get_occupancy_trends_optimized
-- returns jsonb array of { month, occupancy_rate, total_units, occupied_units }
-- called with: { p_user_id: uuid, p_months: 12 }
-- ============================================================================

create or replace function public.get_occupancy_trends_optimized(
  p_user_id uuid,
  p_months  integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
begin
  with
  -- snapshot of current unit counts (single pass, not per month)
  unit_snapshot as (
    select
      count(*) as total_units,
      count(*) filter (where u.status = 'occupied') as occupied_units
    from units u
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
  ),
  -- generate month series
  months as (
    select
      gs as month_offset,
      (current_date - (gs || ' months')::interval)::date as month_date
    from generate_series(0, p_months - 1) gs
  ),
  -- monthly occupancy: current month from live status; historical from lease data
  monthly_occupancy as (
    select
      m.month_date,
      to_char(m.month_date, 'YYYY-MM') as month,
      case
        when m.month_offset = 0 then us.occupied_units
        else coalesce(
          (
            select count(distinct l.unit_id)
            from leases l
            join units u on u.id = l.unit_id
            join properties p on p.id = u.property_id
            where p.owner_user_id = p_user_id
              and l.lease_status in ('active', 'ended')
              and l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
              and (l.end_date is null or l.end_date >= m.month_date)
          ), 0
        )::bigint
      end as occupied_units,
      us.total_units
    from months m
    cross join unit_snapshot us
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',          mo.month,
        'occupancy_rate', case
          when mo.total_units > 0
          then round((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          else 0
        end,
        'total_units',    mo.total_units,
        'occupied_units', mo.occupied_units
      )
      order by mo.month_date desc
    ),
    '[]'::jsonb
  ) into v_result
  from monthly_occupancy mo;

  return v_result;
end;
$$;

comment on function public.get_occupancy_trends_optimized(uuid, integer) is
  'Returns monthly occupancy trends. Single-CTE query, uses owner_user_id directly.';

grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to authenticated;
grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to service_role;


-- ============================================================================
-- 3. get_revenue_trends_optimized
-- returns jsonb array of { month, revenue, collections, outstanding }
-- called with: { p_user_id: uuid, p_months: 12 }
-- ============================================================================

create or replace function public.get_revenue_trends_optimized(
  p_user_id uuid,
  p_months  integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
begin
  with
  months as (
    select
      (current_date - (gs || ' months')::interval)::date as month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date as month_end
    from generate_series(0, p_months - 1) gs
  ),
  -- expected revenue: active/ended leases during each month
  monthly_expected as (
    select
      m.month_start,
      coalesce(sum(l.rent_amount), 0)::bigint as expected_revenue
    from months m
    left join leases l on
      l.owner_user_id = p_user_id
      and l.lease_status in ('active', 'ended')
      and l.start_date <= m.month_end
      and (l.end_date is null or l.end_date >= m.month_start)
    group by m.month_start
  ),
  -- actual collections: succeeded payments in each month
  monthly_collections as (
    select
      m.month_start,
      coalesce(sum(rp.amount), 0)::bigint as collected
    from months m
    left join rent_payments rp on
      rp.status = 'succeeded'
      and rp.paid_date >= m.month_start
      and rp.paid_date < (m.month_start + interval '1 month')
    left join leases l on l.id = rp.lease_id and l.owner_user_id = p_user_id
    where l.id is not null
    group by m.month_start
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',       to_char(m.month_start, 'YYYY-MM'),
        'revenue',     coalesce(me.expected_revenue, 0),
        'collections', coalesce(mc.collected, 0),
        'outstanding', greatest(0, coalesce(me.expected_revenue, 0) - coalesce(mc.collected, 0))
      )
      order by m.month_start desc
    ),
    '[]'::jsonb
  ) into v_result
  from months m
  left join monthly_expected me on me.month_start = m.month_start
  left join monthly_collections mc on mc.month_start = m.month_start;

  return v_result;
end;
$$;

comment on function public.get_revenue_trends_optimized(uuid, integer) is
  'Returns monthly revenue trends with actual collections. Uses owner_user_id directly.';

grant execute on function public.get_revenue_trends_optimized(uuid, integer) to authenticated;
grant execute on function public.get_revenue_trends_optimized(uuid, integer) to service_role;
