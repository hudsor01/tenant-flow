-- migration: 20260306150000_leases_drop_property_owner_id.sql
-- purpose: DESTRUCTIVE -- rewrite RPCs that still reference property_owner_id (DB-03)
-- affected functions: calculate_monthly_metrics, get_expense_summary, get_invoice_statistics
-- user decision: owner_user_id is canonical; all RLS policies and RPCs already use it
--
-- NOTE: leases.property_owner_id column was already dropped in a prior migration.
-- The column, FK constraint, and index are already gone from the schema.
-- This migration rewrites 3 RPCs that still reference the non-existent column
-- and the non-existent property_owners table (renamed to stripe_connected_accounts).
-- These functions are currently BROKEN in production (referencing dropped column/table).
--
-- Changes per function:
--   - Remove property_owners table lookup (use p_user_id directly as owner identity)
--   - Replace l.property_owner_id with l.owner_user_id (leases table)
--   - Replace mr.property_owner_id with mr.owner_user_id (maintenance_requests table)

-- ============================================================================
-- 1. verify leases.property_owner_id is already gone (safety check)
-- ============================================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'leases'
      and column_name = 'property_owner_id'
  ) then
    raise exception 'UNEXPECTED: leases.property_owner_id still exists -- expected it to be already dropped';
  end if;
end;
$$;

-- ============================================================================
-- 2. rewrite calculate_monthly_metrics
--    was: looked up v_property_owner_id from property_owners, joined through
--         l.property_owner_id and mr.property_owner_id
--    now: uses p_user_id directly with l.owner_user_id and mr.owner_user_id
-- ============================================================================
create or replace function public.calculate_monthly_metrics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- SECURITY: Verify caller owns the requested data
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
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
    select sum(rp.amount) as revenue
    from rent_payments rp
    join leases l on rp.lease_id = l.id
    where l.owner_user_id = p_user_id
      and rp.status = 'succeeded'
      and date_trunc('month', rp.paid_date) = months.month_date
  ) rev on true
  left join lateral (
    select sum(e.amount) as expenses
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and date_trunc('month', e.expense_date) = months.month_date
  ) exp on true;

  return v_result;
end;
$$;

-- ============================================================================
-- 3. rewrite get_expense_summary
--    was: looked up v_property_owner_id from property_owners, joined through
--         mr.property_owner_id
--    now: uses p_user_id directly with mr.owner_user_id
-- ============================================================================
create or replace function public.get_expense_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
begin
  -- SECURITY: Verify caller owns the requested data
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  -- category breakdown for current year
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
    where mr.owner_user_id = p_user_id
      and e.expense_date >= date_trunc('year', current_date)
    group by mr.category
  ) cat;

  -- monthly totals for last 12 months
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
    where mr.owner_user_id = p_user_id
      and e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    group by date_trunc('month', e.expense_date)
  ) exp on months.month_date = exp.expense_month;

  -- totals and averages
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
    where mr2.owner_user_id = p_user_id
      and date_trunc('month', e2.expense_date) = date_trunc('month', e.expense_date)
  ) monthly
  where mr.owner_user_id = p_user_id
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

-- ============================================================================
-- 4. rewrite get_invoice_statistics
--    was: looked up v_property_owner_id from property_owners, joined through
--         l.property_owner_id
--    now: uses p_user_id directly with l.owner_user_id
-- ============================================================================
create or replace function public.get_invoice_statistics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  -- SECURITY: Verify caller owns the requested data
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

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

-- ============================================================================
-- 5. verify no functions in public schema still reference property_owner_id
--    (for leases table -- property_owners table references are acceptable
--     as that was renamed to stripe_connected_accounts)
-- ============================================================================
do $$
declare
  v_func record;
  v_found boolean := false;
begin
  for v_func in
    select proname, prosrc
    from pg_proc
    where prosrc like '%property_owner_id%'
      and pronamespace = 'public'::regnamespace
  loop
    -- only flag if it references leases.property_owner_id specifically
    -- (not just the variable name or property_owners table)
    if v_func.prosrc like '%l.property_owner_id%'
       or v_func.prosrc like '%leases.property_owner_id%'
    then
      raise warning 'function % still references leases.property_owner_id', v_func.proname;
      v_found := true;
    end if;
  end loop;

  if v_found then
    raise exception 'ABORT: functions still reference leases.property_owner_id -- see warnings above';
  end if;
end;
$$;

-- ============================================================================
-- verification: no function in pg_proc references leases.property_owner_id
-- calculate_monthly_metrics, get_expense_summary, get_invoice_statistics all
-- rewritten to use owner_user_id directly
-- ============================================================================
