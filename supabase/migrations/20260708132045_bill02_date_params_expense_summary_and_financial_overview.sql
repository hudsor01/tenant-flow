-- BILL-02: make get_expense_summary + get_financial_overview period-scopable.
-- Add p_start_date/p_end_date; defaults reproduce today's one-sided YTD EXACTLY
-- (p_start_date = start of current year, p_end_date = NULL = no upper bound, so
-- future-dated expenses stay included as they are today). DROP the old (uuid)
-- signatures first to avoid overload ambiguity with the new defaulted args.
-- get_billing_insights is intentionally NOT touched — its live body has no
-- date-scopable aggregate (unpaid/late-fee hardcoded 0 after rent_payments was
-- demolished; MRR/churn/tenant-count are point-in-time).
DROP FUNCTION IF EXISTS public.get_expense_summary(uuid);
DROP FUNCTION IF EXISTS public.get_financial_overview(uuid);

CREATE FUNCTION public.get_expense_summary(
  p_user_id uuid,
  p_start_date date DEFAULT date_trunc('year', current_date)::date,
  p_end_date date DEFAULT NULL
)
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

  -- Spend breakdown for the selected period, grouped by vendor.
  with cat as (
    select
      coalesce(nullif(e.vendor_name, ''), 'Other') as category,
      sum(e.amount) as total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= p_start_date
      and (p_end_date is null or e.expense_date <= p_end_date)
    group by coalesce(nullif(e.vendor_name, ''), 'Other')
  ),
  totals as (select coalesce(sum(total), 0) as grand from cat)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category', c.category,
      'amount', c.total,
      'percentage', round((c.total / nullif(t.grand, 0) * 100)::numeric, 2)
    )
  ), '[]'::jsonb) into v_categories
  from cat c cross join totals t;

  -- Monthly totals for the trailing 12 months (zero-filled) — a fixed rolling
  -- series, NOT the selected period.
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

  -- Period total.
  select coalesce(sum(e.amount), 0) into v_total_amount
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.owner_user_id = p_user_id
    and e.status <> 'inactive'
    and e.expense_date >= p_start_date
    and (p_end_date is null or e.expense_date <= p_end_date);

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

CREATE FUNCTION public.get_financial_overview(
  p_user_id uuid,
  p_start_date date DEFAULT date_trunc('year', current_date)::date,
  p_end_date date DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_total_revenue numeric; v_total_expenses numeric; v_net_income numeric;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  -- Revenue stays active-lease MRR (point-in-time; period-historical revenue is
  -- not in the data model — documented BILL-02 limitation).
  SELECT coalesce(sum(rent_amount) * 12, 0) INTO v_total_revenue FROM leases
  WHERE owner_user_id = p_user_id AND lease_status = 'active';
  SELECT coalesce(sum(e.amount), 0) INTO v_total_expenses FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  JOIN units u ON u.id = mr.unit_id JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id AND e.status <> 'inactive'
    AND e.expense_date >= p_start_date
    AND (p_end_date IS NULL OR e.expense_date <= p_end_date);
  v_net_income := v_total_revenue - v_total_expenses;
  RETURN jsonb_build_object(
    'overview', jsonb_build_object('total_revenue', v_total_revenue,
      'total_expenses', v_total_expenses, 'net_income', v_net_income,
      'accounts_receivable', 0, 'accounts_payable', 0),
    'highlights', jsonb_build_array(
      jsonb_build_object('label', 'Monthly Revenue', 'value', v_total_revenue / 12, 'trend', null),
      jsonb_build_object('label', 'Operating Margin',
        'value', CASE WHEN v_total_revenue > 0 THEN round((v_net_income / v_total_revenue * 100)::numeric, 1) ELSE 0 END,
        'trend', null),
      jsonb_build_object('label', 'Cash Position', 'value', v_net_income, 'trend', null)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_expense_summary(uuid, date, date) FROM public;
REVOKE ALL ON FUNCTION public.get_financial_overview(uuid, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_expense_summary(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_overview(uuid, date, date) TO authenticated, service_role;
