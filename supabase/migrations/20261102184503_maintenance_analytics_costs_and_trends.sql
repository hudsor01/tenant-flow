-- =============================================================================
-- get_maintenance_analytics: compute the maintenance spend and the request
-- trends it returns as literals
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102184502_expense_summary_year_over_year.sql (independent functions;
-- the order only keeps the ledger sequential). After the merge the main
-- session applies this file with MCP `apply_migration`, reads
-- `list_migrations`, and renames the file to the version production assigned,
-- in a follow-up PR. Until it is applied, the maintenance insights and the
-- maintenance report find no `costed_requests` in the payload and say the
-- costs and trends are unavailable, never $0 or an empty chart.
--
-- THE DEFECT. The body returns the literals
--     'total_cost', 0, 'average_cost', 0, 'monthly_cost', '[]',
--     'vendor_performance', '[]', 'trendsOverTime', '[]'
-- (latest repo copy: 20260304120000), so the maintenance report printed $0.00
-- and empty cost tables and the insights' cost and trend charts were always
-- empty, for every owner.
--
-- THE SPEND IS THE EXPENSES. Every write of maintenance spend in the app is an
-- `expenses` row on the request (the Add Expense dialog,
-- src/components/maintenance/detail/add-expense-dialog.tsx;
-- expenses.maintenance_request_id is NOT NULL). maintenance_requests.actual_cost
-- has no writer in src/ or supabase/functions/ (the request form writes
-- estimated_cost only), so it is not read here, and reading it as well would
-- count the same spend twice. The expenses counted are the ones the expenses
-- page and the statements count (get_expense_summary): the owner's
-- maintenance requests' expenses, not soft-deleted, in dollars, dated on or
-- before today (spend to date: an expense dated in the future has not been
-- spent yet, as the expenses page's "year to date" no longer counts it either,
-- 20261102184502).
--
-- STARTED FROM THE LIVE PRODUCTION BODY (md5 of pg_get_functiondef equal to
-- production's, read 2026-11-02, on a replay of the chain without this PR's
-- migrations), not a repo copy. Unchanged: the signature (user_id uuid),
-- RETURNS jsonb, LANGUAGE plpgsql, SECURITY DEFINER, the pinned search_path,
-- the volatility (VOLATILE, the default), the auth.uid() guard as written,
-- every other key and how it is computed, and the ACL (EXECUTE for
-- authenticated and service_role only). Like the request counts, the costs
-- cover all time to date: the function takes no period.
--
-- WHAT EACH KEY MEANS.
--   total_cost: the sum of those expenses.
--   costed_requests: the requests with at least one of them. THE MARKER: the
--     body before this one never returns it, so a caller shows the costs and
--     the trends only when it is a number, and says they are unavailable
--     otherwise (the old 0 and [] are no figures).
--   average_cost: total_cost / costed_requests, rounded to cents: the average
--     per request with costs (a request with none is not in the
--     denominator); NULL when no request has a cost.
--   monthly_cost: the trailing 12 calendar months, oldest first, zero-filled,
--     [{ month 'YYYY-MM', cost }], the expenses dated in each month.
--   vendor_performance: [{ vendor_name, total_spend, jobs }], the expenses by
--     vendor as get_expense_summary names it (an expense with no vendor, NULL,
--     empty or only whitespace, is under vendor_name NULL, never merged with a
--     vendor named "Other"; the client names it "No vendor recorded"),
--     jobs the requests the vendor's expenses are on, largest spend first,
--     then by name.
--   trendsOverTime: the same 12 months, oldest first,
--     [{ month, completed, pending, avg_resolution_hours }]:
--       completed: requests with status 'completed' whose completed_at is in
--         the month;
--       pending: requests open at the month's end: created before it, and not
--         completed before it, where a request is completed when its status
--         is 'completed' (as for `completed`) and its completed_at is earlier.
--         A cancelled request is left out (nothing records when it was
--         cancelled); a completed one with no completed_at counts as
--         completed throughout (nothing records when); a request reopened
--         after a completion counts as open throughout (its status is no
--         longer completed, and nothing records when it was reopened). The
--         current month's end is in the future, so its figure is the requests
--         open now.
--       avg_resolution_hours: the mean of completed_at - created_at over the
--         month's completed requests, in hours, rounded to 2 decimals; NULL
--         with none.
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds requests and expenses
-- (scripts/migration-replay-owner-figures.sql) and asserts every key, the
-- soft-deleted expense, another owner's spend, the guard and the grants
-- (assertOwnerFiguresComputed in scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_result jsonb;
  v_total_requests integer;
  v_completed_requests integer;
  v_open_requests integer;
  v_avg_resolution_hours numeric;
  v_by_status jsonb;
  v_by_priority jsonb;
  v_total_cost numeric;
  v_costed_requests integer;
  v_monthly_cost jsonb;
  v_vendor_performance jsonb;
  v_trends jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_user_id := user_id;

  SELECT count(*) INTO v_total_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT count(*) INTO v_completed_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'completed';

  SELECT count(*) INTO v_open_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'open';

  SELECT coalesce(
    extract(epoch FROM avg(completed_at - created_at) FILTER (WHERE completed_at IS NOT NULL)) / 3600,
    0
  ) INTO v_avg_resolution_hours
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('status', s, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_status
  FROM (
    SELECT status AS s, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY status
  ) sub;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('priority', pr, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_priority
  FROM (
    SELECT priority AS pr, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY priority
  ) sub;

  -- Spend: the owner's expenses on their maintenance requests, not
  -- soft-deleted, dated on or before today, as the expenses page and the
  -- statements read them (see the migration header). costed_requests: the
  -- requests with at least one.
  SELECT coalesce(sum(e.amount), 0), count(DISTINCT e.maintenance_request_id)::integer
  INTO v_total_cost, v_costed_requests
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  WHERE mr.owner_user_id = v_user_id
    AND e.status <> 'inactive'
    AND e.expense_date <= current_date;

  -- The trailing 12 calendar months, oldest first, zero-filled.
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', current_date) - interval '11 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date AS month_start
  ),
  spend AS (
    SELECT date_trunc('month', e.expense_date)::date AS month_start, sum(e.amount) AS cost
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.owner_user_id = v_user_id
      AND e.status <> 'inactive'
      AND e.expense_date >= date_trunc('month', current_date) - interval '11 months'
      AND e.expense_date <= current_date
    GROUP BY date_trunc('month', e.expense_date)
  )
  SELECT jsonb_agg(jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'cost', coalesce(s.cost, 0)
    ) ORDER BY m.month_start)
  INTO v_monthly_cost
  FROM months m LEFT JOIN spend s ON s.month_start = m.month_start;

  -- Spend by vendor, as get_expense_summary names it (no vendor is NULL),
  -- largest first: jobs are the requests it was spent on.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'vendor_name', v.vendor_name,
      'total_spend', v.total_spend,
      'jobs', v.jobs
    ) ORDER BY v.total_spend DESC, v.vendor_name), '[]'::jsonb)
  INTO v_vendor_performance
  FROM (
    SELECT CASE WHEN nullif(btrim(e.vendor_name), '') IS NULL THEN NULL ELSE e.vendor_name END AS vendor_name,
      sum(e.amount) AS total_spend,
      count(DISTINCT e.maintenance_request_id)::integer AS jobs
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.owner_user_id = v_user_id
      AND e.status <> 'inactive'
      AND e.expense_date <= current_date
    GROUP BY 1
  ) v;

  -- Requests over the same 12 months: completed in each month, and open at
  -- its end (see the migration header for what cannot be placed in time).
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', current_date) - interval '11 months',
      date_trunc('month', current_date),
      interval '1 month'
    ) AS month_start
  )
  SELECT jsonb_agg(jsonb_build_object(
      'month', to_char(m.month_start, 'YYYY-MM'),
      'completed', (
        SELECT count(*)::integer FROM maintenance_requests mr
        WHERE mr.owner_user_id = v_user_id
          AND mr.status = 'completed'
          AND mr.completed_at >= m.month_start
          AND mr.completed_at < m.month_start + interval '1 month'),
      'pending', (
        SELECT count(*)::integer FROM maintenance_requests mr
        WHERE mr.owner_user_id = v_user_id
          AND mr.status <> 'cancelled'
          AND mr.created_at < m.month_start + interval '1 month'
          AND NOT (mr.status = 'completed'
                   AND coalesce(mr.completed_at < m.month_start + interval '1 month', true))),
      'avg_resolution_hours', (
        SELECT round((extract(epoch FROM avg(mr.completed_at - mr.created_at)) / 3600)::numeric, 2)
        FROM maintenance_requests mr
        WHERE mr.owner_user_id = v_user_id
          AND mr.status = 'completed'
          AND mr.completed_at >= m.month_start
          AND mr.completed_at < m.month_start + interval '1 month')
    ) ORDER BY m.month_start)
  INTO v_trends
  FROM months m;

  v_result := jsonb_build_object(
    'total_requests', v_total_requests,
    'open_requests', v_open_requests,
    'avg_resolution_hours', v_avg_resolution_hours,
    'total_cost', v_total_cost,
    'average_cost', CASE WHEN v_costed_requests > 0
      THEN round(v_total_cost / v_costed_requests, 2)
      ELSE NULL END,
    'costed_requests', v_costed_requests,
    'avgResolutionTime', v_avg_resolution_hours / 24,
    'completionRate', CASE
      WHEN v_total_requests > 0
      THEN round((v_completed_requests::decimal / v_total_requests::decimal) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', (
      SELECT jsonb_build_object(
        'low',    coalesce(sum(CASE WHEN priority = 'low'    THEN 1 ELSE 0 END), 0),
        'normal', coalesce(sum(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END), 0),
        'high',   coalesce(sum(CASE WHEN priority = 'high'   THEN 1 ELSE 0 END), 0),
        'urgent', coalesce(sum(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END), 0)
      )
      FROM maintenance_requests WHERE owner_user_id = v_user_id
    ),
    'by_status', v_by_status,
    'by_priority', v_by_priority,
    'monthly_cost', v_monthly_cost,
    'vendor_performance', v_vendor_performance,
    'trendsOverTime', v_trends
  );

  RETURN v_result;
END;
$function$;

revoke all on function public.get_maintenance_analytics(uuid) from public, anon, authenticated;
grant execute on function public.get_maintenance_analytics(uuid) to authenticated, service_role;
