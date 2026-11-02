-- =============================================================================
-- get_property_performance_analytics: each property's revenue is the rent it
-- received, from the rent ledger, over a window the caller can name exactly
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE, and after
-- 20261102055449_billing_insights_from_rent_ledger.sql, which creates
-- rent_ledger_receipts, the receipts this body reads. Applied before it, this
-- body raises "function public.rent_ledger_receipts(uuid) does not exist" on
-- its first call (PL/pgSQL resolves the name when it runs, not when it is
-- created). Until
-- this PR, production's `main` labels the figure "Monthly revenue" and
-- "Revenue", and the year-end report asks for no window at all, so it would
-- print the last 30 days' receipts as a tax year's income. After the merge the
-- main session applies this file with MCP `apply_migration`, reads
-- `list_migrations`, and renames the file to the version production assigned,
-- in a follow-up PR. Until it is applied, every screen and export that reads
-- this function sees `timeframe` echo what it asked for (the body before this
-- one returns p_timeframe as given), says rent received is unavailable, and
-- never shows the old body's 0 as money.
--
-- THE DEFECT. Since 20260528231201_repair_analytics_rpcs.sql dropped the
-- demolished rent_payments reads (latest repo copy: 20260708131721), the body
-- has returned
--     0::numeric AS total_revenue, -COALESCE(pe.expenses, 0) AS net_income
-- so every property's revenue read $0 and its net income was its expenses,
-- negated, on /analytics/property-performance (the tile, the Top properties
-- column, the chart), on the property page, in the property portfolio export,
-- on /reports/year-end and its CSV, in the browser tax-preparation export, and
-- in supabase/functions/_shared/tax-year-reports.ts (the year-end PDF, CSV and
-- XLSX, whose By Property table is the export's Schedule E support). The rent
-- ledger (rent_receipts, 20260725020925 onward) has held what each property
-- received since. Its window was a defect too: p_timeframe names only a
-- trailing window ending today, so the year-end and tax callers, which need a
-- calendar tax year, could not ask for one (they passed nothing, and got the
-- last 30 days), and the expense side had no upper bound, so an expense dated
-- in the future counted in every window.
--
-- STARTED FROM THE LIVE PRODUCTION BODY (pg_get_functiondef, 2026-11-02), not a
-- repo copy. Unchanged: the signature and defaults (p_timeframe '30d',
-- p_limit NULL), the RETURNS TABLE columns and their types,
-- LANGUAGE plpgsql, SECURITY DEFINER, the pinned search_path, the volatility
-- (VOLATILE, the default), the p_user_id != auth.uid() guard as written, the
-- property list for a trailing window (the owner's, not inactive,
-- p_property_id when given), occupancy_rate and how it is computed, the
-- expense join, the ordering by name, and the ACL (EXECUTE for authenticated and service_role
-- only). Under the service role auth.uid() is NULL, so the guard's comparison
-- is NULL and passes: export-report and generate-pdf call this with the admin
-- client and the owner id they validated from the Bearer token, so for them
-- the function is the authorization boundary.
--
-- WHAT EACH COLUMN MEANS. One row per property, as before.
--
--   total_revenue, "Rent received": the rent ledger's receipts for the
--     property's leases received in the window, each at its signed amount, so
--     a reversed receipt and its reversal net to zero when both fall in the
--     window. A reversal is dated the day it was posted (reverse_receipt), so a
--     receipt reversed after the window still counts in it, and the reversal
--     counts in the window it was posted in: the money was received then, and
--     handed back later. A receipt reaches a property through its lease's
--     unit (rent_receipts.lease_id -> leases.unit_id -> units.property_id).
--     Which receipts count is rent_ledger_receipts (20261102055449), the
--     definition get_billing_insights reads too: the receipts that carry the
--     owner's id on the owner's leases that are not soft-deleted
--     (lease_status = 'inactive'), as get_lease_ledger_summary
--     (20260726020701) scopes its CTEs. So a tax year's rent received in the
--     year-end summary (collectedTotal, differenced) and the sum of this
--     table over that year count the same receipts, a soft-deleted unit's
--     and a soft-deleted property's included: an explicit range lists a
--     property the owner has since deleted when it received rent or spent in
--     the range (see THE PROPERTY LIST), so the two tie to the cent. It is
--     cash: money recorded as received, never scheduled rent, and never sums
--     the two (CLAUDE.md, Domain model).
--
--   total_expenses: unchanged, except that the window now has an upper bound
--     (see THE WINDOW): the expenses of the property's maintenance requests,
--     not soft-deleted, dated in the window.
--
--   net_income: total_revenue - total_expenses, net income on a rent-received
--     basis.
--
--   timeframe: the window the row covers, as an ISO 8601 date interval,
--     'YYYY-MM-DD/YYYY-MM-DD', both days included. It used to echo
--     p_timeframe. It now states what was computed, and it is how a caller
--     tells this body from the one before it, which echoes its input: no input
--     this body accepts is in that form (a range is asked for with '..'), so
--     an answer whose timeframe is not an interval, or not the interval asked
--     for, is the old body's, and its total_revenue is no figure.
--
-- THE WINDOW. p_timeframe is either
--   - a trailing window ending today: '7d', '30d', '90d', '180d' or '365d', the
--     days from CURRENT_DATE minus that many through CURRENT_DATE (so '30d' is
--     31 calendar days, as its start always was), or
--   - an explicit range, 'YYYY-MM-DD..YYYY-MM-DD', both days included: the
--     year-end and tax callers ask for 'YYYY-01-01..YYYY-12-31', the property
--     portfolio export for its own period. A range that starts after it ends
--     is refused (22023); a date that is not a calendar day fails its cast
--     (22008), never silently a 30-day window.
-- Anything else, NULL included, is a 30-day trailing window, as before.
-- Receipts are compared on received_date and expenses on expense_date, both
-- inclusive at both ends.
--
-- THE PROPERTY LIST. The owner's properties (p_property_id for one), ordered
-- by name: every one, unless p_limit names a smaller number. Which ones
-- depends on the window:
--   - a trailing window ('7d'..'365d', and the 30-day default) is the
--     current portfolio: the properties that are not soft-deleted, as
--     CLAUDE.md's soft-delete rule has every read exclude them;
--   - an explicit range is a period's books (the year-end report, its tax
--     exports, the property portfolio export): every property that is not
--     soft-deleted, AND every soft-deleted one that has a receipt or an
--     expense in the range, so rent received in a tax year is never dropped
--     from a tax report because the property was deleted later. A
--     soft-deleted property with nothing in the range is not listed. The row
--     does not say the property is deleted (the RETURNS TABLE is unchanged);
--     a caller that lists these rows reads properties.status for the ids and
--     labels a deleted one so.
-- The expense side of a listed row is the same join whatever the property's
-- status, so the table's expenses tie to get_expense_summary's over the range
-- too. p_limit NULL used to mean 100, so a tax report, a year-end
-- table or a property export for an owner with more properties dropped the
-- rest and their rent received; NULL now means no limit, and no caller passes
-- one. (A REST caller still reads at most the API's max-rows a request; the
-- callers that need every row page through them.)
--
-- MONEY. Dollars throughout: rent_receipts.amount and expenses.amount are
-- numeric(10,2). No cents, no scaling (D-00).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds properties, leases, receipts and expenses
-- (scripts/migration-replay-property-performance.sql) and asserts every
-- column of every row for a tax year, a trailing window and the default, the
-- window's edges, reversals, the owner scoping, soft-deleted leases and
-- properties (listed for a range when they received rent or spent in it, not
-- otherwise, never for a trailing window), the year-end summary's tie to the
-- table for both owners, p_property_id, p_limit, the refused range, the guard and the
-- grants (assertPropertyPerformanceRentReceived in
-- scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(p_user_id uuid, p_property_id uuid DEFAULT NULL::uuid, p_timeframe text DEFAULT '30d'::text, p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue numeric, total_expenses numeric, net_income numeric, timeframe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_days integer; v_start_date date; v_end_date date;
  -- An explicit range lists the soft-deleted properties with activity in it.
  v_range boolean := false;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  -- The window (see the header): an explicit range, or a trailing one.
  IF p_timeframe ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.\.[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    v_start_date := split_part(p_timeframe, '..', 1)::date;
    v_end_date := split_part(p_timeframe, '..', 2)::date;
    v_range := true;
    IF v_start_date > v_end_date THEN
      RAISE EXCEPTION 'Invalid timeframe %: it starts after it ends', p_timeframe
        USING ERRCODE = '22023';
    END IF;
  ELSE
    v_days := CASE p_timeframe WHEN '7d' THEN 7 WHEN '30d' THEN 30 WHEN '90d' THEN 90
      WHEN '180d' THEN 180 WHEN '365d' THEN 365 ELSE 30 END;
    v_start_date := CURRENT_DATE - v_days;
    v_end_date := CURRENT_DATE;
  END IF;
  RETURN QUERY
  WITH
  -- Rent received (see the header): the receipts rent_ledger_receipts counts,
  -- received in the window, signed, by property.
  property_receipts AS (
    SELECT lr.property_id AS prop_id, SUM(lr.amount)::numeric AS received
    FROM public.rent_ledger_receipts(p_user_id) lr
    WHERE lr.received_date >= v_start_date AND lr.received_date <= v_end_date
    GROUP BY lr.property_id
  ),
  -- Each of the owner's properties' expenses dated in the window, and how
  -- many there are (whatever the property's status: THE PROPERTY LIST picks).
  property_expenses AS (
    SELECT p.id AS prop_id, COALESCE(SUM(e.amount), 0)::numeric AS expenses,
      COUNT(e.id) AS expense_count
    FROM properties p LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id AND e.status <> 'inactive'
      AND e.expense_date >= v_start_date AND e.expense_date <= v_end_date
    WHERE p.owner_user_id = p_user_id AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  -- THE PROPERTY LIST (see the header): not soft-deleted, or, for an
  -- explicit range, soft-deleted with a receipt or an expense in it.
  listed_properties AS (
    SELECT p.id AS prop_id
    FROM properties p
    LEFT JOIN property_expenses pe ON pe.prop_id = p.id
    WHERE p.owner_user_id = p_user_id AND (p_property_id IS NULL OR p.id = p_property_id)
      AND (p.status <> 'inactive'
        OR (v_range AND (EXISTS (SELECT 1 FROM property_receipts pr WHERE pr.prop_id = p.id)
                         OR pe.expense_count > 0)))
  ),
  property_units AS (
    SELECT p.id AS prop_id, p.name AS prop_name, u.id AS unit_id, u.status AS unit_status
    FROM listed_properties lp JOIN properties p ON p.id = lp.prop_id
    LEFT JOIN units u ON u.property_id = p.id
  ),
  property_occupancy AS (
    SELECT pu.prop_id, pu.prop_name,
      COALESCE(ROUND((COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE pu.unit_status IS DISTINCT FROM 'inactive')::numeric, 0)) * 100, 2), 0) AS occ_rate
    FROM property_units pu GROUP BY pu.prop_id, pu.prop_name
  )
  SELECT po.prop_id, po.prop_name, po.occ_rate,
    COALESCE(pr.received, 0)::numeric AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    (COALESCE(pr.received, 0) - COALESCE(pe.expenses, 0))::numeric AS net_income,
    to_char(v_start_date, 'YYYY-MM-DD') || '/' || to_char(v_end_date, 'YYYY-MM-DD') AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  LEFT JOIN property_receipts pr ON pr.prop_id = po.prop_id
  ORDER BY po.prop_name LIMIT p_limit;
END;
$function$;

comment on function public.get_property_performance_analytics(uuid, uuid, text, integer) is
  'Per-property performance (p_property_id for one; ordered by name; p_limit rows, NULL for all): for a trailing window the owner''s properties that are not inactive; for an explicit range those and every inactive (soft-deleted) one with a receipt or an expense in the range (the row does not say which: read properties.status). occupancy_rate: occupied units over units not inactive, in percent. total_revenue: rent received, the receipts rent_ledger_receipts counts (owner-scoped on receipt and lease, inactive leases skipped) on the property''s leases (through the lease''s unit) received in the window, signed so reversals net; dollars. total_expenses: the property''s maintenance expenses dated in the window. net_income: total_revenue - total_expenses. timeframe: the window computed, ''YYYY-MM-DD/YYYY-MM-DD'', both days included. p_timeframe: ''7d''/''30d''/''90d''/''180d''/''365d'' (trailing, ending today) or ''YYYY-MM-DD..YYYY-MM-DD'' (inclusive; refused with 22023 when it starts after it ends); anything else is 30 days. Guards p_user_id against auth.uid(); service_role (auth.uid() NULL) passes the guard.';

revoke all on function public.get_property_performance_analytics(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.get_property_performance_analytics(uuid, uuid, text, integer) to authenticated, service_role;
