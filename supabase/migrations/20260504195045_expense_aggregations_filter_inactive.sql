-- Cycle-1 followup for F-2 soft-delete (audit bug_007).
-- Every RPC that sums public.expenses.amount must skip rows where status = 'inactive'
-- so soft-deleted rows do not survive in aggregates the user sees alongside
-- the (correctly-filtered) expense list. Without this fix, deleting an
-- expense makes the row vanish from the table at the bottom of /financials/expenses
-- but ExpenseStats / ExpenseCategoryBreakdown / month-over-month / YoY values at
-- the top stay unchanged, plus the same drift propagates to NOI on the dashboard,
-- year-end CSV/PDF, and useTaxDocuments.
--
-- 4 RPCs touched (verified via pg_proc grep for "expenses" + "e.amount"):
--   calculate_monthly_metrics, get_expense_summary, get_financial_overview,
--   get_property_performance_analytics
-- get_dashboard_stats does NOT aggregate expenses (despite the audit's claim).

CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
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
      and e.status <> 'inactive'
      and date_trunc('month', e.expense_date) = months.month_date
  ) exp on true;

  return v_result;
end;
$function$;


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
      and e.status <> 'inactive'
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
      and e.status <> 'inactive'
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
      and e2.status <> 'inactive'
      and date_trunc('month', e2.expense_date) = date_trunc('month', e.expense_date)
  ) monthly
  where mr.owner_user_id = p_user_id
    and e.status <> 'inactive'
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
$function$;


CREATE OR REPLACE FUNCTION public.get_financial_overview(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_revenue    numeric;
  v_total_expenses   numeric;
  v_net_income       numeric;
  v_accounts_receivable numeric;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount) * 12, 0) INTO v_total_revenue
  FROM leases
  WHERE owner_user_id = p_user_id
    AND lease_status = 'active';

  SELECT coalesce(sum(e.amount), 0) INTO v_total_expenses
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  JOIN units u ON u.id = mr.unit_id
  JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id
    AND e.status <> 'inactive'
    AND e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  SELECT coalesce(sum(rp.amount), 0) INTO v_accounts_receivable
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = p_user_id
    AND rp.status IN ('pending', 'processing');

  RETURN jsonb_build_object(
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
        'value', CASE
          WHEN v_total_revenue > 0
          THEN round((v_net_income / v_total_revenue * 100)::numeric, 1)
          ELSE 0
        END,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Cash Position',
        'value', v_net_income,
        'trend', null
      )
    )
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(
  p_user_id uuid,
  p_property_id uuid DEFAULT NULL::uuid,
  p_timeframe text DEFAULT '30d'::text,
  p_limit integer DEFAULT NULL::integer
)
RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue bigint, total_expenses bigint, net_income bigint, timeframe text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_start_date date;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;

  RETURN QUERY
  WITH property_units AS (
    SELECT
      p.id AS prop_id,
      p.name AS prop_name,
      u.id AS unit_id,
      u.status AS unit_status
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT
      pu.prop_id,
      pu.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM property_units pu
    GROUP BY pu.prop_id, pu.prop_name
  ),
  property_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.owner_user_id = p_user_id
    LEFT JOIN rent_payments rp ON rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  property_expenses AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(e.amount), 0)::bigint AS expenses
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id
      AND e.status <> 'inactive'
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(pr.revenue, 0) AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    (COALESCE(pr.revenue, 0) - COALESCE(pe.expenses, 0))::bigint AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_revenue pr ON pr.prop_id = po.prop_id
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT COALESCE(p_limit, 100);
END;
$function$;
