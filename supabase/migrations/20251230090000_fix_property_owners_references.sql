-- Migration: Fix property_owners references in RPC functions
-- Purpose: Update functions that reference the deprecated property_owners table
--
-- Background:
--   - property_owners table was renamed to stripe_connected_accounts (for Stripe Connect only)
--   - properties/leases/units now use owner_user_id directly (references users.id)
--   - Functions still trying to lookup property_owner_id from property_owners fail with:
--     "relation 'property_owners' does not exist"
--
-- Affected functions (from 20251225130000_optimize_rpc_functions.sql):
--   1. get_occupancy_trends_optimized
--   2. get_revenue_trends_optimized
--
-- Affected functions (from 20251225140000_add_financial_analytics_functions.sql):
--   3. calculate_financial_metrics
--   4. calculate_net_operating_income
--   5. get_financial_overview
--   6. get_expense_summary
--   7. get_invoice_statistics
--   8. calculate_monthly_metrics
--   9. get_lease_financial_summary
--   10. get_leases_with_financial_analytics

-- ============================================================================
-- FUNCTION 1: get_occupancy_trends_optimized (FIX)
-- Remove property_owners lookup, use p_user_id directly
-- ============================================================================

create or replace function public.get_occupancy_trends_optimized(
  p_user_id uuid,
  p_months integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
begin
  -- OPTIMIZED: Single query using CTE instead of N+1 subqueries
  -- FIXED: Use p_user_id directly, no property_owners lookup needed
  with
  -- Pre-calculate unit counts ONCE (not per month)
  unit_snapshot as (
    select
      count(*) as total_units,
      count(*) filter (where u.status = 'occupied') as occupied_units
    from units u
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
  ),
  -- Generate month series
  months as (
    select
      generate_series(0, p_months - 1) as month_offset,
      (current_date - (generate_series(0, p_months - 1) || ' months')::interval)::date as month_date
  ),
  -- Calculate historical occupancy trends using lease data
  monthly_occupancy as (
    select
      m.month_date,
      to_char(m.month_date, 'YYYY-MM') as month,
      case
        when m.month_offset = 0 then us.occupied_units
        else coalesce(
          (select count(distinct l.unit_id)
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
        'month', mo.month,
        'occupancy_rate', case
          when mo.total_units > 0
          then round((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          else 0
        end,
        'total_units', mo.total_units,
        'occupied_units', mo.occupied_units
      ) order by mo.month_date desc
    ),
    '[]'::jsonb
  ) into v_result
  from monthly_occupancy mo;

  return v_result;
end;
$$;

comment on function public.get_occupancy_trends_optimized(uuid, integer) is
  'Returns monthly occupancy trends. FIXED: Removed property_owners lookup, uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 2: get_revenue_trends_optimized (FIX)
-- Remove property_owners lookup, use p_user_id directly
-- ============================================================================

create or replace function public.get_revenue_trends_optimized(
  p_user_id uuid,
  p_months integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_result jsonb;
begin
  -- OPTIMIZED: Single query with actual data calculations
  -- FIXED: Use p_user_id directly via leases.owner_user_id
  with
  -- Generate month series
  months as (
    select
      generate_series(0, p_months - 1) as month_offset,
      (current_date - (generate_series(0, p_months - 1) || ' months')::interval)::date as month_start,
      ((current_date - (generate_series(0, p_months - 1) || ' months')::interval) + interval '1 month' - interval '1 day')::date as month_end
  ),
  -- Calculate expected rent (from active leases during each month)
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
  -- Calculate actual collections (successful payments in each month)
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
  ),
  -- Combine into final result
  monthly_revenue as (
    select
      to_char(m.month_start, 'YYYY-MM') as month,
      m.month_start,
      coalesce(me.expected_revenue, 0) as revenue,
      coalesce(mc.collected, 0) as collections,
      greatest(0, coalesce(me.expected_revenue, 0) - coalesce(mc.collected, 0)) as outstanding
    from months m
    left join monthly_expected me on me.month_start = m.month_start
    left join monthly_collections mc on mc.month_start = m.month_start
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month', mr.month,
        'revenue', mr.revenue,
        'collections', mr.collections,
        'outstanding', mr.outstanding
      ) order by mr.month_start desc
    ),
    '[]'::jsonb
  ) into v_result
  from monthly_revenue mr;

  return v_result;
end;
$$;

comment on function public.get_revenue_trends_optimized(uuid, integer) is
  'Returns monthly revenue trends with actual collections and outstanding amounts. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 3: calculate_financial_metrics (FIX)
-- Remove property_owners lookup, use owner_user_id on leases
-- ============================================================================

create or replace function public.calculate_financial_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_total_revenue numeric;
  v_total_expenses numeric;
  v_net_income numeric;
  v_cash_flow numeric;
  v_prev_month_revenue numeric;
  v_prev_month_expenses numeric;
begin
  -- Calculate current month revenue from active leases
  -- FIXED: Use owner_user_id directly instead of property_owner_id
  select coalesce(sum(rent_amount), 0) into v_total_revenue
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active';

  -- Calculate expenses from maintenance requests
  -- Join through units and properties to get owner
  select coalesce(sum(e.amount), 0) into v_total_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  join units u on u.id = mr.unit_id
  join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and e.expense_date >= date_trunc('month', current_date);

  v_net_income := v_total_revenue - v_total_expenses;
  v_cash_flow := v_net_income;

  -- Calculate previous month for trends
  select coalesce(sum(rent_amount), 0) into v_prev_month_revenue
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active'
    and start_date < date_trunc('month', current_date);

  select coalesce(sum(e.amount), 0) into v_prev_month_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  join units u on u.id = mr.unit_id
  join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and e.expense_date >= date_trunc('month', current_date) - interval '1 month'
    and e.expense_date < date_trunc('month', current_date);

  v_result := jsonb_build_object(
    'total_revenue', v_total_revenue,
    'total_expenses', v_total_expenses,
    'net_income', v_net_income,
    'cash_flow', v_cash_flow,
    'revenue_trend', case
      when v_prev_month_revenue > 0
      then round(((v_total_revenue - v_prev_month_revenue) / v_prev_month_revenue * 100)::numeric, 2)
      else null
    end,
    'expense_trend', case
      when v_prev_month_expenses > 0
      then round(((v_total_expenses - v_prev_month_expenses) / v_prev_month_expenses * 100)::numeric, 2)
      else null
    end,
    'profit_margin', case
      when v_total_revenue > 0
      then round((v_net_income / v_total_revenue * 100)::numeric, 2)
      else null
    end
  );

  return v_result;
end;
$$;

comment on function public.calculate_financial_metrics(uuid) is
'Calculates core financial metrics. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 4: calculate_net_operating_income (FIX)
-- Use properties.owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.calculate_net_operating_income(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'property_id', p.id,
      'property_name', p.name,
      'revenue', coalesce(
        (select sum(l.rent_amount)
         from leases l
         join units u on l.unit_id = u.id
         where u.property_id = p.id
           and l.lease_status = 'active'),
        0
      ),
      'expenses', coalesce(
        (select sum(e.amount)
         from expenses e
         join maintenance_requests mr on mr.id = e.maintenance_request_id
         where mr.unit_id in (select id from units where property_id = p.id)
           and e.expense_date >= date_trunc('year', current_date)),
        0
      ),
      'noi', coalesce(
        (select sum(l.rent_amount) * 12
         from leases l
         join units u on l.unit_id = u.id
         where u.property_id = p.id
           and l.lease_status = 'active'),
        0
      ) - coalesce(
        (select sum(e.amount)
         from expenses e
         join maintenance_requests mr on mr.id = e.maintenance_request_id
         where mr.unit_id in (select id from units where property_id = p.id)
           and e.expense_date >= date_trunc('year', current_date)),
        0
      ),
      'margin', case
        when coalesce(
          (select sum(l.rent_amount)
           from leases l
           join units u on l.unit_id = u.id
           where u.property_id = p.id
             and l.lease_status = 'active'),
          0
        ) > 0 then round(
          (
            (coalesce(
              (select sum(l.rent_amount) * 12
               from leases l
               join units u on l.unit_id = u.id
               where u.property_id = p.id
                 and l.lease_status = 'active'),
              0
            ) - coalesce(
              (select sum(e.amount)
               from expenses e
               join maintenance_requests mr on mr.id = e.maintenance_request_id
               where mr.unit_id in (select id from units where property_id = p.id)
                 and e.expense_date >= date_trunc('year', current_date)),
              0
            )) / nullif(
              coalesce(
                (select sum(l.rent_amount) * 12
                 from leases l
                 join units u on l.unit_id = u.id
                 where u.property_id = p.id
                   and l.lease_status = 'active'),
                0
              ), 0
            ) * 100
          )::numeric, 2
        )
        else 0
      end
    )
  ), '[]'::jsonb) into v_result
  from properties p
  where p.owner_user_id = p_user_id;

  return v_result;
end;
$$;

comment on function public.calculate_net_operating_income(uuid) is
'Calculates Net Operating Income (NOI) for each property. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 5: get_financial_overview (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.get_financial_overview(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_total_revenue numeric;
  v_total_expenses numeric;
  v_net_income numeric;
  v_accounts_receivable numeric;
  v_accounts_payable numeric;
begin
  -- Total annual revenue from active leases
  select coalesce(sum(rent_amount) * 12, 0) into v_total_revenue
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active';

  -- Total expenses this year
  select coalesce(sum(e.amount), 0) into v_total_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  join units u on u.id = mr.unit_id
  join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  -- Accounts receivable (outstanding rent payments)
  select coalesce(sum(rp.amount), 0) into v_accounts_receivable
  from rent_payments rp
  join leases l on rp.lease_id = l.id
  where l.owner_user_id = p_user_id
    and rp.status in ('pending', 'processing');

  v_accounts_payable := 0;

  v_result := jsonb_build_object(
    'overview', jsonb_build_object(
      'total_revenue', v_total_revenue,
      'total_expenses', v_total_expenses,
      'net_income', v_net_income,
      'accounts_receivable', v_accounts_receivable,
      'accounts_payable', v_accounts_payable
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object('label', 'Monthly Revenue', 'value', v_total_revenue / 12, 'trend', null),
      jsonb_build_object('label', 'Operating Margin', 'value', case when v_total_revenue > 0 then round((v_net_income / v_total_revenue * 100)::numeric, 1) else 0 end, 'trend', null),
      jsonb_build_object('label', 'Cash Position', 'value', v_net_income, 'trend', null)
    )
  );

  return v_result;
end;
$$;

comment on function public.get_financial_overview(uuid) is
'Returns a financial overview snapshot. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 6: get_expense_summary (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.get_expense_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
begin
  -- Get expense categories
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category', category,
      'amount', total,
      'percentage', round((total / nullif(sum(total) over(), 0) * 100)::numeric, 2)
    )
  ), '[]'::jsonb) into v_categories
  from (
    select
      coalesce(mr.category, 'Other') as category,
      sum(e.amount) as total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    join units u on u.id = mr.unit_id
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
      and e.expense_date >= date_trunc('year', current_date)
    group by mr.category
  ) cat;

  -- Get monthly totals for the last 12 months
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'amount', coalesce(monthly_total, 0)
    )
    order by month_date
  ), '[]'::jsonb) into v_monthly
  from (
    select
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date as month_date
  ) months
  left join (
    select
      date_trunc('month', e.expense_date)::date as expense_month,
      sum(e.amount) as monthly_total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    join units u on u.id = mr.unit_id
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
      and e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    group by date_trunc('month', e.expense_date)
  ) exp on months.month_date = exp.expense_month;

  -- Calculate totals
  select coalesce(sum(e.amount), 0) into v_total_amount
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  join units u on u.id = mr.unit_id
  join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and e.expense_date >= date_trunc('year', current_date);

  v_monthly_avg := v_total_amount / 12;

  v_result := jsonb_build_object(
    'categories', v_categories,
    'monthly_totals', v_monthly,
    'total_amount', v_total_amount,
    'monthly_average', round(v_monthly_avg::numeric, 2),
    'year_over_year_change', null
  );

  return v_result;
end;
$$;

comment on function public.get_expense_summary(uuid) is
'Returns expense summary with category breakdown. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 7: get_invoice_statistics (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.get_invoice_statistics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  -- Use rent_payments as invoice proxy
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'count', status_count,
      'amount', total_amount
    )
  ), '[]'::jsonb) into v_result
  from (
    select
      rp.status,
      count(*) as status_count,
      sum(rp.amount) as total_amount
    from rent_payments rp
    join leases l on rp.lease_id = l.id
    where l.owner_user_id = p_user_id
      and rp.due_date >= date_trunc('year', current_date)
    group by rp.status
  ) stats;

  return v_result;
end;
$$;

comment on function public.get_invoice_statistics(uuid) is
'Returns invoice/payment statistics grouped by status. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 8: calculate_monthly_metrics (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.calculate_monthly_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'revenue', coalesce(revenue, 0),
      'expenses', coalesce(expenses, 0),
      'net_income', coalesce(revenue, 0) - coalesce(expenses, 0),
      'cash_flow', coalesce(revenue, 0) - coalesce(expenses, 0)
    )
    order by month_date
  ), '[]'::jsonb) into v_result
  from (
    select
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date as month_date
  ) months
  left join lateral (
    -- Revenue from rent payments
    select sum(rp.amount) as revenue
    from rent_payments rp
    join leases l on rp.lease_id = l.id
    where l.owner_user_id = p_user_id
      and rp.status = 'succeeded'
      and date_trunc('month', rp.paid_date) = months.month_date
  ) rev on true
  left join lateral (
    -- Expenses via properties
    select sum(e.amount) as expenses
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    join units u on u.id = mr.unit_id
    join properties p on p.id = u.property_id
    where p.owner_user_id = p_user_id
      and date_trunc('month', e.expense_date) = months.month_date
  ) exp on true;

  return v_result;
end;
$$;

comment on function public.calculate_monthly_metrics(uuid) is
'Returns monthly financial metrics for the last 12 months. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 9: get_lease_financial_summary (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.get_lease_financial_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'total_leases', count(*),
    'active_leases', count(*) filter (where lease_status = 'active'),
    'expiring_soon', count(*) filter (
      where lease_status = 'active'
        and end_date <= current_date + interval '30 days'
        and end_date > current_date
    ),
    'total_monthly_rent', coalesce(sum(rent_amount) filter (where lease_status = 'active'), 0),
    'average_lease_value', coalesce(avg(rent_amount) filter (where lease_status = 'active'), 0)
  ) into v_result
  from leases
  where owner_user_id = p_user_id;

  return v_result;
end;
$$;

comment on function public.get_lease_financial_summary(uuid) is
'Returns a summary of lease portfolio with financial metrics. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- FUNCTION 10: get_leases_with_financial_analytics (FIX)
-- Use owner_user_id instead of property_owner_id
-- ============================================================================

create or replace function public.get_leases_with_financial_analytics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'lease_id', l.id,
      'property_name', p.name,
      'tenant_name', coalesce(t.first_name || ' ' || t.last_name, 'Unknown'),
      'monthly_rent', l.rent_amount,
      'outstanding_balance', coalesce(
        (select sum(rp.amount)
         from rent_payments rp
         where rp.lease_id = l.id
           and rp.status in ('pending', 'processing', 'failed')),
        0
      ),
      'profitability_score', case
        when l.rent_amount > 0 then
          round((
            (l.rent_amount - coalesce(
              (select sum(e.amount) / 12
               from expenses e
               join maintenance_requests mr on mr.id = e.maintenance_request_id
               where mr.unit_id = l.unit_id),
              0
            )) / l.rent_amount * 100
          )::numeric, 0)
        else null
      end
    )
  ), '[]'::jsonb) into v_result
  from leases l
  join units u on l.unit_id = u.id
  join properties p on u.property_id = p.id
  left join tenants t on l.primary_tenant_id = t.id
  where l.owner_user_id = p_user_id
    and l.lease_status = 'active';

  return v_result;
end;
$$;

comment on function public.get_leases_with_financial_analytics(uuid) is
'Returns detailed financial analytics for each active lease. FIXED: Uses owner_user_id directly.';

-- ============================================================================
-- Re-grant execute permissions (in case they were lost)
-- ============================================================================

grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to authenticated;
grant execute on function public.get_occupancy_trends_optimized(uuid, integer) to service_role;
grant execute on function public.get_revenue_trends_optimized(uuid, integer) to authenticated;
grant execute on function public.get_revenue_trends_optimized(uuid, integer) to service_role;
grant execute on function public.calculate_financial_metrics(uuid) to authenticated;
grant execute on function public.calculate_net_operating_income(uuid) to authenticated;
grant execute on function public.get_financial_overview(uuid) to authenticated;
grant execute on function public.get_expense_summary(uuid) to authenticated;
grant execute on function public.get_invoice_statistics(uuid) to authenticated;
grant execute on function public.calculate_monthly_metrics(uuid) to authenticated;
grant execute on function public.get_lease_financial_summary(uuid) to authenticated;
grant execute on function public.get_leases_with_financial_analytics(uuid) to authenticated;
