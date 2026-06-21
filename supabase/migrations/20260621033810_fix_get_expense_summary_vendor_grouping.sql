-- get_expense_summary grouped its category breakdown on
-- maintenance_requests.category, a column that was dropped, so the function
-- raised 42703 and PostgREST returned 400 for every authenticated caller (the
-- financials / expense-summary widget was broken). Regroup the breakdown on
-- expenses.vendor_name, the meaningful spend dimension that survives on the
-- expenses row. The 'category' jsonb key is kept for frontend compatibility.
--
-- NOTE: superseded immediately by 20260621033856_*_v2 below. This version still
-- nested a window function (sum(...) over()) inside jsonb_agg, which Postgres
-- rejects at runtime (42803). plpgsql bodies are not validated at CREATE time,
-- so this applies cleanly and is replaced by the v2 migration before any call.
-- Retained to match the prod migration history.
CREATE OR REPLACE FUNCTION public.get_expense_summary(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  -- Spend breakdown for the current year, grouped by vendor.
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category', category,
      'amount', total,
      'percentage', round((total / nullif(sum(total) over(), 0) * 100)::numeric, 2)
    )
  ), '[]'::jsonb) into v_categories
  from (
    select
      coalesce(nullif(e.vendor_name, ''), 'Other') as category,
      sum(e.amount) as total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= date_trunc('year', current_date)
    group by coalesce(nullif(e.vendor_name, ''), 'Other')
  ) cat;

  -- Monthly totals for the trailing 12 months (zero-filled).
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
      and e.status <> 'inactive'
      and e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    group by date_trunc('month', e.expense_date)
  ) exp on months.month_date = exp.expense_month;

  -- YTD total.
  select coalesce(sum(e.amount), 0) into v_total_amount
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.owner_user_id = p_user_id
    and e.status <> 'inactive'
    and e.expense_date >= date_trunc('year', current_date);

  -- Month-weighted average over the trailing-12-month series.
  select coalesce(avg((m->>'amount')::numeric), 0) into v_monthly_avg
  from jsonb_array_elements(v_monthly) m;

  v_result := jsonb_build_object(
    'categories', v_categories,
    'monthly_totals', v_monthly,
    'total_amount', v_total_amount,
    'monthly_average', round(v_monthly_avg::numeric, 2),
    'year_over_year_change', null
  );

  return v_result;
end;
$function$;
