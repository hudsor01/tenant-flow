-- =============================================================================
-- get_financial_overview: drop the keys it returns as literals and no caller
-- reads, end a period with no end date today, and report each lease's rent
-- received less its expenses over the period
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102055449_billing_insights_from_rent_ledger.sql, which creates
-- rent_ledger_leases and rent_ledger_receipts, the leases and receipts the
-- lease profitability below reads (PL/pgSQL resolves them when the body runs,
-- so applied before it the function raises on its first call), and after
-- 20261102184503_maintenance_analytics_costs_and_trends.sql (the order only
-- keeps the ledger sequential). After the merge the
-- main session applies this file with MCP `apply_migration`, reads
-- `list_migrations`, and renames the file to the version production assigned,
-- in a follow-up PR. No caller reads a key this drops, so the order against
-- the app deploy does not matter.
--
-- THE DEFECT. The body returns
--     'accounts_receivable', 0, 'accounts_payable', 0
-- and a `highlights` array whose three `trend`s are the literal NULL
-- (latest repo copy: 20260708132045). Nothing reads any of them: the analytics
-- pages, the financial-analytics export and the tax reports read `overview`'s
-- total_revenue, total_expenses and net_income only (swept 2026-11-02 over
-- src/, supabase/functions/ and tests/e2e/). The highlights' labels were wrong
-- as well: "Cash Position" was scheduled rent less expenses, not cash, and
-- "Monthly Revenue" scheduled rent. There is no source for accounts payable
-- (the data model records no bill owed), and the ledger's receivables are
-- get_billing_insights' unpaidTotal, which the balance sheet reads. So they
-- go, rather than being filled in for no reader. And with no p_end_date the
-- expense side had no end, so an expense dated in the future counted in the
-- year to date, as get_expense_summary's did before 20261102184502. Nor did
-- anything report a lease's profitability: the financial analytics page's and
-- the leases page's Lease Profitability tables were always empty (their
-- mapper returned []), with columns (an outstanding balance, a
-- "profitability score") nothing computes.
--
-- STARTED FROM THE LIVE PRODUCTION BODY (md5 of pg_get_functiondef equal to
-- production's, read 2026-11-02, on a replay of the chain without this PR's
-- migrations), not a repo copy. Unchanged: the signature and defaults,
-- RETURNS jsonb, LANGUAGE plpgsql, SECURITY DEFINER, the pinned search_path,
-- the volatility (VOLATILE, the default), the auth.uid() guard as written, the
-- three `overview` figures and how they are computed (total_revenue is the
-- active leases' scheduled rent times twelve, not income or cash; CLAUDE.md,
-- Domain model), and the ACL (EXECUTE for authenticated and service_role
-- only).
--
-- THE PERIOD. Expenses dated p_start_date .. p_end_date, both days included;
-- with no p_end_date the period ends today, as get_expense_summary's now does,
-- so the two count the same days for the same arguments.
--
-- LEASE PROFITABILITY. `lease_profitability` is
--     { "window": 'YYYY-MM-DD/YYYY-MM-DD', "leases": [ ... ] }
-- over the same period (window: the period's first and last day, an ISO 8601
-- interval, both included). THE MARKER: the bodies before this one never
-- return the key, so a caller shows the table only beside it and says it is
-- unavailable otherwise. One element per lease with rent received or an
-- expense in the period, largest net first (then by property, unit, lease):
--   lease_id, property_name, property_deleted (the property is soft-deleted:
--     its lease keeps its ledger, so the row stays and says so), unit_number,
--     tenant_name (first and last name, else name; NULL with neither);
--   rent_received: the receipts rent_ledger_receipts counts (the owner's, on
--     the owner's leases that are not soft-deleted; signed, so a reversal
--     nets) on the lease, received in the period: the definition
--     get_billing_insights and get_property_performance_analytics read;
--   expenses: the expenses (not soft-deleted) on the owner's maintenance
--     requests for the lease's unit, dated in the period AND on a day the
--     lease ran (a status of 'active', 'ended', 'expired' or 'terminated' and
--     the day within start_date .. end_date, an open end running on). An
--     expense on a day two of the unit's leases ran is the later-starting
--     lease's alone, and one on a day none ran is no lease's, so no expense
--     is counted twice;
--   net: rent_received - expenses.
-- Dollars, numeric, as the columns hold them. A soft-deleted lease is listed
-- nowhere (its receipts count for nobody, as in the ledger figures).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database and asserts the payload's keys and figures, the
-- period's end, every lease profitability row (a reversal, a soft-deleted
-- lease and property, two leases running on one day, an expense on no lease),
-- the guard and the grants
-- (scripts/migration-replay-owner-figures.sql, assertOwnerFiguresComputed in
-- scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_financial_overview(p_user_id uuid, p_start_date date DEFAULT (date_trunc('year'::text, (CURRENT_DATE)::timestamp with time zone))::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_total_revenue numeric; v_total_expenses numeric; v_net_income numeric;
  -- The period's last day (see THE PERIOD).
  v_end date := coalesce(p_end_date, CURRENT_DATE);
  v_leases jsonb;
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
    AND e.expense_date <= v_end;
  v_net_income := v_total_revenue - v_total_expenses;
  -- LEASE PROFITABILITY (see the header).
  WITH lease_receipts AS (
    SELECT lr.lease_id, SUM(lr.amount)::numeric AS received
    FROM public.rent_ledger_receipts(p_user_id) lr
    WHERE lr.received_date >= p_start_date AND lr.received_date <= v_end
    GROUP BY lr.lease_id
  ),
  attributed_expenses AS (
    SELECT DISTINCT ON (e.id) e.id, e.amount, l.id AS lease_id
    FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id AND mr.owner_user_id = p_user_id
    JOIN public.rent_ledger_leases(p_user_id) ll ON true
    JOIN leases l ON l.id = ll.lease_id AND l.unit_id = mr.unit_id
    WHERE e.status <> 'inactive'
      AND e.expense_date >= p_start_date AND e.expense_date <= v_end
      AND l.lease_status IN ('active', 'ended', 'expired', 'terminated')
      AND l.start_date <= e.expense_date
      AND (l.end_date IS NULL OR l.end_date >= e.expense_date)
    ORDER BY e.id, l.start_date DESC, l.id
  ),
  lease_expenses AS (
    SELECT ae.lease_id, SUM(ae.amount)::numeric AS spent
    FROM attributed_expenses ae
    GROUP BY ae.lease_id
  ),
  -- The leases with a receipt or an expense in the period: both sides read
  -- the helpers' leases, so a soft-deleted lease is in neither.
  listed_leases AS (
    SELECT lease_id FROM lease_receipts
    UNION
    SELECT lease_id FROM lease_expenses
  ),
  lease_rows AS (
    SELECT l.id AS lease_id, p.name AS property_name,
      coalesce(p.status = 'inactive', false) AS property_deleted, u.unit_number,
      coalesce(nullif(trim(concat_ws(' ', t.first_name, t.last_name)), ''), nullif(trim(t.name), '')) AS tenant_name,
      coalesce(r.received, 0)::numeric AS rent_received,
      coalesce(x.spent, 0)::numeric AS expenses
    FROM listed_leases ls
    JOIN leases l ON l.id = ls.lease_id
    LEFT JOIN units u ON u.id = l.unit_id
    LEFT JOIN properties p ON p.id = u.property_id
    LEFT JOIN tenants t ON t.id = l.primary_tenant_id
    LEFT JOIN lease_receipts r ON r.lease_id = l.id
    LEFT JOIN lease_expenses x ON x.lease_id = l.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'lease_id', lr.lease_id, 'property_name', lr.property_name,
      'property_deleted', lr.property_deleted, 'unit_number', lr.unit_number,
      'tenant_name', lr.tenant_name, 'rent_received', lr.rent_received,
      'expenses', lr.expenses, 'net', lr.rent_received - lr.expenses)
    ORDER BY lr.rent_received - lr.expenses DESC, lr.property_name, lr.unit_number, lr.lease_id), '[]'::jsonb)
  INTO v_leases
  FROM lease_rows lr;
  RETURN jsonb_build_object(
    'overview', jsonb_build_object('total_revenue', v_total_revenue,
      'total_expenses', v_total_expenses, 'net_income', v_net_income),
    'lease_profitability', jsonb_build_object(
      'window', to_char(p_start_date, 'YYYY-MM-DD') || '/' || to_char(v_end, 'YYYY-MM-DD'),
      'leases', v_leases)
  );
END;
$function$;

revoke all on function public.get_financial_overview(uuid, date, date) from public, anon, authenticated;
grant execute on function public.get_financial_overview(uuid, date, date) to authenticated, service_role;
