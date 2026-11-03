-- =============================================================================
-- get_expense_summary: compute the year-over-year change, and end a period
-- with no end date today
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102184501_dashboard_trends_from_leases.sql (independent functions; the
-- order only keeps the ledger sequential). After the merge the main session
-- applies this file with MCP `apply_migration`, reads `list_migrations`, and
-- renames the file to the version production assigned, in a follow-up PR.
-- Until it is applied, the expenses page finds no
-- `year_over_year_prior_period` in the payload and says the change is
-- unavailable.
--
-- THE DEFECT. The body returns the literal
--     'year_over_year_change', null
-- (latest repo copy: 20260621033856), so the expenses page's YoY tile could
-- only ever read "--", and a caller cannot tell "no prior-year expenses" from
-- "never computed". And with no p_end_date the period had no end at all, so
-- the expenses page's "Total Expenses, year to date" counted an expense dated
-- in the future (as the property performance expenses did before
-- 20261102163709); a period with no end also has no "same dates a year
-- earlier" to compare with.
--
-- STARTED FROM THE LIVE PRODUCTION BODY (md5 of pg_get_functiondef equal to
-- production's, read 2026-11-02, on a replay of the chain without this PR's
-- migrations), not a repo copy. Unchanged: the signature and defaults
-- (p_start_date January 1 of this year, p_end_date NULL), RETURNS jsonb,
-- LANGUAGE plpgsql, SECURITY DEFINER, the pinned search_path, the volatility
-- (VOLATILE, the default), the auth.uid() guard as written, the expense scope
-- (the owner's maintenance requests' expenses, not soft-deleted), the
-- categories (by vendor), the trailing 12-month series and its average, and
-- the ACL (EXECUTE for authenticated and service_role only).
--
-- THE PERIOD. p_start_date .. p_end_date, both days included; with no
-- p_end_date it ends today (it had no end). The callers that pass no end are
-- "to date" figures (the expenses page's "year to date", the financial
-- analytics page and its export); every caller that names a period passes
-- both dates and is unaffected. categories and total_amount cover the period.
--
-- WHAT THE NEW KEYS MEAN.
--   year_over_year_prior_period: 'YYYY-MM-DD/YYYY-MM-DD', the same dates one
--     year earlier (each end moved back a year; February 29 becomes
--     February 28), an ISO 8601 interval. NULL when an end is not a calendar
--     day ('-infinity', which the balance sheet passes, has no year before
--     it). THE MARKER: the body before this one never returns the key, so a
--     caller shows the change only when it is a string, and says it is
--     unavailable otherwise (the old NULL is no figure).
--   year_over_year_change: the percent change of total_amount against the
--     same expenses over the prior period, rounded to 2 decimals; NULL when
--     the prior period's total is 0 (no prior-year figure to compare: never
--     0, never a division by zero) or when there is no prior period.
--
-- A BLANK VENDOR IS NO VENDOR. categories are by vendor_name, and the body
-- folded every expense with no vendor (NULL or '') into a category named
-- 'Other', so its amount merged with a vendor the owner named "Other". An
-- expense whose vendor_name is NULL, empty or only whitespace is now under
-- category NULL, a key no vendor name can take; the client names it ("No
-- vendor recorded"). A vendor name is otherwise grouped as entered.
--
-- MONEY. Dollars: expenses.amount is numeric(10,2).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds expenses across two years
-- (scripts/migration-replay-owner-figures.sql) and asserts the change, the
-- prior period, the period's end, a year with no prior expenses, the guard and
-- the grants (assertOwnerFiguresComputed in
-- scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_expense_summary(p_user_id uuid, p_start_date date DEFAULT (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_end_date date DEFAULT NULL::date)
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
  -- The period ends today when no end is given (see the migration header).
  v_end date := coalesce(p_end_date, current_date);
  v_prior_start date;
  v_prior_end date;
  v_prior_total numeric;
  v_yoy_change numeric;
  v_prior_period text;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  -- Spend breakdown for the selected period, grouped by vendor; NULL for no
  -- vendor (see the migration header).
  with cat as (
    select
      case when nullif(btrim(e.vendor_name), '') is null then null else e.vendor_name end as category,
      sum(e.amount) as total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= p_start_date
      and e.expense_date <= v_end
    group by 1
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
    and e.expense_date <= v_end;

  -- Year over year: the same dates one year earlier. Only for a period with a
  -- calendar day at each end ('-infinity' has no year before it).
  if isfinite(p_start_date) and isfinite(v_end) then
    v_prior_start := (p_start_date - interval '1 year')::date;
    v_prior_end := (v_end - interval '1 year')::date;
    select coalesce(sum(e.amount), 0) into v_prior_total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= v_prior_start
      and e.expense_date <= v_prior_end;
    v_prior_period := to_char(v_prior_start, 'YYYY-MM-DD') || '/' || to_char(v_prior_end, 'YYYY-MM-DD');
    v_yoy_change := case when v_prior_total > 0
      then round(((v_total_amount - v_prior_total) / v_prior_total * 100)::numeric, 2)
      else null end;
  end if;

  -- Month-weighted average over the trailing-12-month series.
  select coalesce(avg((m->>'amount')::numeric), 0) into v_monthly_avg
  from jsonb_array_elements(v_monthly) m;

  v_result := jsonb_build_object(
    'categories', v_categories,
    'monthly_totals', v_monthly,
    'total_amount', v_total_amount,
    'monthly_average', round(v_monthly_avg::numeric, 2),
    'year_over_year_change', v_yoy_change,
    'year_over_year_prior_period', v_prior_period
  );

  return v_result;
end;
$function$;

revoke all on function public.get_expense_summary(uuid, date, date) from public, anon, authenticated;
grant execute on function public.get_expense_summary(uuid, date, date) to authenticated, service_role;
