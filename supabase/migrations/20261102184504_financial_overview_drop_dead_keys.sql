-- =============================================================================
-- get_financial_overview: drop the keys it returns as literals and no caller
-- reads, and end a period with no end date today
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102184503_maintenance_analytics_costs_and_trends.sql (independent
-- functions; the order only keeps the ledger sequential). After the merge the
-- main session applies this file with MCP `apply_migration`, reads
-- `list_migrations`, and renames the file to the version production assigned,
-- in a follow-up PR. No caller reads a key this drops, so the order against
-- the app deploy does not matter.
--
-- THE DEFECT. The body returns
--     'accounts_receivable', 0, 'accounts_payable', 0
-- and a `highlights` array whose three `trend`s are the literal NULL
-- (latest repo copy: 20260528231201). Nothing reads any of them: the analytics
-- pages, the financial-analytics export and the tax reports read `overview`'s
-- total_revenue, total_expenses and net_income only (swept 2026-11-02 over
-- src/, supabase/functions/ and tests/e2e/). The highlights' labels were wrong
-- as well: "Cash Position" was scheduled rent less expenses, not cash, and
-- "Monthly Revenue" scheduled rent. There is no source for accounts payable
-- (the data model records no bill owed), and the ledger's receivables are
-- get_billing_insights' unpaidTotal, which the balance sheet reads. So they
-- go, rather than being filled in for no reader. And with no p_end_date the
-- expense side had no end, so an expense dated in the future counted in the
-- year to date, as get_expense_summary's did before 20261102184502.
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
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database and asserts the payload's keys and figures, the
-- period's end, the guard and the grants
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
    AND e.expense_date <= coalesce(p_end_date, CURRENT_DATE);
  v_net_income := v_total_revenue - v_total_expenses;
  RETURN jsonb_build_object(
    'overview', jsonb_build_object('total_revenue', v_total_revenue,
      'total_expenses', v_total_expenses, 'net_income', v_net_income)
  );
END;
$function$;

revoke all on function public.get_financial_overview(uuid, date, date) from public, anon, authenticated;
grant execute on function public.get_financial_overview(uuid, date, date) to authenticated, service_role;
