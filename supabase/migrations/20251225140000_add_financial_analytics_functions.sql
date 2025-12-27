-- Migration: Add missing financial analytics RPC functions
-- Purpose: Create the 8 missing functions that the financial-analytics.service.ts expects
-- Issue: Backend calls these functions but they don't exist, causing silent failures
--
-- Functions created:
--   1. calculate_financial_metrics - Core financial metrics (revenue, expenses, net income)
--   2. calculate_net_operating_income - NOI by property
--   3. get_financial_overview - Financial snapshot with highlights
--   4. get_expense_summary - Expense breakdown by category
--   5. get_invoice_statistics - Invoice status summary
--   6. calculate_monthly_metrics - Monthly financial trends
--   7. get_lease_financial_summary - Lease portfolio summary
--   8. get_leases_with_financial_analytics - Detailed lease analytics

-- ============================================================================
-- 1. calculate_financial_metrics
-- Returns: total_revenue, total_expenses, net_income, cash_flow, trends
-- ============================================================================
create or replace function public.calculate_financial_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
  v_total_revenue numeric;
  v_total_expenses numeric;
  v_net_income numeric;
  v_cash_flow numeric;
  v_prev_month_revenue numeric;
  v_prev_month_expenses numeric;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return jsonb_build_object(
      'total_revenue', 0,
      'total_expenses', 0,
      'net_income', 0,
      'cash_flow', 0,
      'revenue_trend', null,
      'expense_trend', null,
      'profit_margin', null
    );
  end if;

  -- Calculate current month revenue from active leases
  select coalesce(sum(rent_amount), 0) into v_total_revenue
  from leases
  where property_owner_id = v_property_owner_id
    and lease_status = 'active';

  -- Calculate expenses from maintenance requests with expenses
  select coalesce(sum(e.amount), 0) into v_total_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.property_owner_id = v_property_owner_id
    and e.expense_date >= date_trunc('month', current_date);

  v_net_income := v_total_revenue - v_total_expenses;
  v_cash_flow := v_net_income; -- Simplified cash flow

  -- Calculate previous month for trends
  select coalesce(sum(rent_amount), 0) into v_prev_month_revenue
  from leases
  where property_owner_id = v_property_owner_id
    and lease_status = 'active'
    and start_date < date_trunc('month', current_date);

  select coalesce(sum(e.amount), 0) into v_prev_month_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.property_owner_id = v_property_owner_id
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
'Calculates core financial metrics including revenue, expenses, net income, and trends for a property owner.';


-- ============================================================================
-- 2. calculate_net_operating_income
-- Returns: Array of {property_id, property_name, noi, revenue, expenses, margin}
-- ============================================================================
create or replace function public.calculate_net_operating_income(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return '[]'::jsonb;
  end if;

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
         join units u on mr.unit_id = u.id
         where u.property_id = p.id
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
         join units u on mr.unit_id = u.id
         where u.property_id = p.id
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
               join units u on mr.unit_id = u.id
               where u.property_id = p.id
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
  where p.property_owner_id = v_property_owner_id;

  return v_result;
end;
$$;

comment on function public.calculate_net_operating_income(uuid) is
'Calculates Net Operating Income (NOI) for each property owned by the user.';


-- ============================================================================
-- 3. get_financial_overview
-- Returns: overview snapshot with highlights
-- ============================================================================
create or replace function public.get_financial_overview(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
  v_total_revenue numeric;
  v_total_expenses numeric;
  v_net_income numeric;
  v_accounts_receivable numeric;
  v_accounts_payable numeric;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return jsonb_build_object(
      'overview', jsonb_build_object(
        'total_revenue', 0,
        'total_expenses', 0,
        'net_income', 0,
        'accounts_receivable', 0,
        'accounts_payable', 0
      ),
      'highlights', '[]'::jsonb
    );
  end if;

  -- Total annual revenue from active leases
  select coalesce(sum(rent_amount) * 12, 0) into v_total_revenue
  from leases
  where property_owner_id = v_property_owner_id
    and lease_status = 'active';

  -- Total expenses this year
  select coalesce(sum(e.amount), 0) into v_total_expenses
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.property_owner_id = v_property_owner_id
    and e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  -- Accounts receivable (outstanding rent payments)
  select coalesce(sum(rp.amount), 0) into v_accounts_receivable
  from rent_payments rp
  join leases l on rp.lease_id = l.id
  where l.property_owner_id = v_property_owner_id
    and rp.status in ('pending', 'processing');

  -- Accounts payable (simplified - could be expanded with vendor invoices)
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
'Returns a financial overview snapshot with key highlights for dashboard display.';


-- ============================================================================
-- 4. get_expense_summary
-- Returns: categories, monthly totals, and aggregated totals
-- ============================================================================
create or replace function public.get_expense_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return jsonb_build_object(
      'categories', '[]'::jsonb,
      'monthly_totals', '[]'::jsonb,
      'total_amount', 0,
      'monthly_average', 0,
      'year_over_year_change', null
    );
  end if;

  -- Get expense categories (using maintenance request category as proxy)
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
    where mr.property_owner_id = v_property_owner_id
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
    where mr.property_owner_id = v_property_owner_id
      and e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    group by date_trunc('month', e.expense_date)
  ) exp on months.month_date = exp.expense_month;

  -- Calculate totals
  select
    coalesce(sum(e.amount), 0),
    coalesce(avg(monthly_total), 0)
  into v_total_amount, v_monthly_avg
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  cross join lateral (
    select sum(e2.amount) as monthly_total
    from expenses e2
    join maintenance_requests mr2 on mr2.id = e2.maintenance_request_id
    where mr2.property_owner_id = v_property_owner_id
      and date_trunc('month', e2.expense_date) = date_trunc('month', e.expense_date)
  ) monthly
  where mr.property_owner_id = v_property_owner_id
    and e.expense_date >= date_trunc('year', current_date);

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
'Returns expense summary with category breakdown and monthly trends.';


-- ============================================================================
-- 5. get_invoice_statistics
-- Returns: Array of {status, count, amount}
-- ============================================================================
create or replace function public.get_invoice_statistics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return '[]'::jsonb;
  end if;

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
    where l.property_owner_id = v_property_owner_id
      and rp.due_date >= date_trunc('year', current_date)
    group by rp.status
  ) stats;

  return v_result;
end;
$$;

comment on function public.get_invoice_statistics(uuid) is
'Returns invoice/payment statistics grouped by status.';


-- ============================================================================
-- 6. calculate_monthly_metrics
-- Returns: Array of {month, revenue, expenses, net_income, cash_flow}
-- ============================================================================
create or replace function public.calculate_monthly_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return '[]'::jsonb;
  end if;

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
    where l.property_owner_id = v_property_owner_id
      and rp.status = 'succeeded'
      and date_trunc('month', rp.paid_date) = months.month_date
  ) rev on true
  left join lateral (
    -- Expenses
    select sum(e.amount) as expenses
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.property_owner_id = v_property_owner_id
      and date_trunc('month', e.expense_date) = months.month_date
  ) exp on true;

  return v_result;
end;
$$;

comment on function public.calculate_monthly_metrics(uuid) is
'Returns monthly financial metrics for the last 12 months.';


-- ============================================================================
-- 7. get_lease_financial_summary
-- Returns: {total_leases, active_leases, expiring_soon, total_monthly_rent, average_lease_value}
-- ============================================================================
create or replace function public.get_lease_financial_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return jsonb_build_object(
      'total_leases', 0,
      'active_leases', 0,
      'expiring_soon', 0,
      'total_monthly_rent', 0,
      'average_lease_value', 0
    );
  end if;

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
  where property_owner_id = v_property_owner_id;

  return v_result;
end;
$$;

comment on function public.get_lease_financial_summary(uuid) is
'Returns a summary of lease portfolio with financial metrics.';


-- ============================================================================
-- 8. get_leases_with_financial_analytics
-- Returns: Array of {lease_id, property_name, tenant_name, monthly_rent, outstanding_balance, profitability_score}
-- ============================================================================
create or replace function public.get_leases_with_financial_analytics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_result jsonb;
  v_property_owner_id uuid;
begin
  -- Resolve property_owner_id from user_id
  select id into v_property_owner_id
  from property_owners
  where user_id = p_user_id;

  if v_property_owner_id is null then
    return '[]'::jsonb;
  end if;

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
  where l.property_owner_id = v_property_owner_id
    and l.lease_status = 'active';

  return v_result;
end;
$$;

comment on function public.get_leases_with_financial_analytics(uuid) is
'Returns detailed financial analytics for each active lease.';


-- Grant execute permissions to authenticated users
grant execute on function public.calculate_financial_metrics(uuid) to authenticated;
grant execute on function public.calculate_net_operating_income(uuid) to authenticated;
grant execute on function public.get_financial_overview(uuid) to authenticated;
grant execute on function public.get_expense_summary(uuid) to authenticated;
grant execute on function public.get_invoice_statistics(uuid) to authenticated;
grant execute on function public.calculate_monthly_metrics(uuid) to authenticated;
grant execute on function public.get_lease_financial_summary(uuid) to authenticated;
grant execute on function public.get_leases_with_financial_analytics(uuid) to authenticated;
