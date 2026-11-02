-- =============================================================================
-- get_billing_insights: compute the Payment Summary figures from the rent ledger
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE. Until that PR, production's `main`
-- formats lateFeeTotal and unpaidTotal with `formatCents`, which divides by 100,
-- so applying this first would show real owners $1,250.00 of late fees as
-- $12.50. After the merge the main session applies this file with MCP
-- `apply_migration`, reads `list_migrations`, and renames the file to the
-- version production assigned, in a follow-up PR.
--
-- THE DEFECT. Since 20260528231201_repair_analytics_rpcs.sql dropped the
-- demolished rent_payments reads (latest repo copy: 20260709044800), the body
-- has returned the literals
--     'unpaidTotal', 0, 'unpaidCount', 0, 'lateFeeTotal', 0
-- so every owner's Payment Summary cards on /analytics/overview and
-- /analytics/financial, and the matching rows of the financial-analytics export
-- (supabase/functions/_shared/financial-analytics-report.ts), read 0. The rent
-- ledger (rent_charges / rent_receipts, 20260725020925 onward) has held the real
-- figures since.
--
-- STARTED FROM THE LIVE PRODUCTION BODY (pg_get_functiondef, 2026-11-02), not a
-- repo copy. Unchanged: the signature and defaults, LANGUAGE plpgsql, SECURITY
-- DEFINER, the pinned search_path, the volatility (VOLATILE, the default), the
-- owner_id_param != auth.uid() guard as written, every other key and how it is
-- computed (totalRevenue, mrr, churnRate, tenantCount), and the ACL (EXECUTE for
-- authenticated and service_role only). Under the service role auth.uid() is
-- NULL, so the guard's comparison is NULL and passes: export-report and
-- generate-pdf call this with the admin client and the owner id they validated
-- from the Bearer token, so for them the function is the authorization boundary.
--
-- WHAT EACH FIGURE MEANS. Each matches its card in
-- src/components/analytics/owner-payment-summary.tsx and uses the ledger's own
-- definitions, from get_lease_ledger_summary (20260726020701) and the ledger
-- table (src/components/ledger/ledger-tab.tsx):
--
--   unpaidTotal, "Unpaid invoice total": the money still owed on the owner's
--     leases. Per lease it is the ledger balance, sum(charges) - sum(receipts),
--     exactly as get_lease_ledger_summary computes it: a reversal row is the
--     exact negation of what it reverses, so a reversed charge and the paired
--     reversals of its receipts net to zero, and credits and opening balances
--     count at their signed amount. Each lease's balance is floored at 0 before
--     the sum, because a prepaid lease owes nothing: adding its negative balance
--     would hide another tenant's debt.
--
--   unpaidCount, "Outstanding invoices": the charges not yet paid in full, which
--     are the rows the ledger table badges unpaid, partial or late. An invoice is
--     a charge of type rent, late_fee or manual_charge (opening and credit lines
--     have their own badge and no paid state, in the table and in the ledger
--     summary's late derivation) that is not a reversal, has not been reversed,
--     and has less allocated to it in receipts than its amount. There is no grace
--     period: an outstanding invoice need not be late yet. The count is per
--     charge, as the ledger's late_count is, so a charge stays outstanding when a
--     credit elsewhere on its lease covers it; the owner sees the same charge
--     badged on that lease's ledger.
--
--   lateFeeTotal, "Late fees cumulative": the late fees charged, net of
--     reversals: the amount of every late_fee charge that is not a reversal and
--     has not been reversed. Charged, not outstanding: a late fee the tenant paid
--     still counts.
--
-- Every figure reads only the owner's own rows, scoped by owner_user_id on the
-- lease, the charge and the receipt as get_lease_ledger_summary scopes its CTEs,
-- and skips soft-deleted leases (lease_status = 'inactive').
--
-- THE DATE WINDOW. start_date_param and end_date_param are optional, and the two
-- live callers, analyticsQueries.ownerPaymentSummary() and the export leaf, pass
-- neither, so the cards and the file cover the whole ledger. When given, they
-- select the charges whose ledger entry date, coalesce(period_start,
-- created_at::date) as get_lease_ledger shows it, falls between them, compared on
-- the calendar day and inclusive at both ends; either bound may be given alone.
-- A windowed unpaidTotal is what is still owed on the window's charges: per
-- lease, each charge in the window that is not a reversal and has not been
-- reversed, less the receipts allocated to it whenever they were received,
-- floored at 0. It counts no reversed charge
-- instead of relying on a reversal pair to net to zero, because the two halves
-- of a pair can fall on different sides of a bound: reverse_charge copies
-- period_start, so a charge without one is dated by created_at, and its reversal
-- is dated the day it was posted. For the same reason the "has been reversed"
-- lookup reads the whole ledger, not the window. unpaidCount is then the
-- window's outstanding invoices and lateFeeTotal the late fees charged in it.
--
-- MONEY. Dollars throughout: every ledger amount is numeric(10,2), and a sum of
-- numeric(10,2) values is numeric with scale 2. No cents, no scaling (D-00).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds a ledger (scripts/migration-replay-billing-insights.sql)
-- and asserts the exact figures, the date window, the owner scoping and the
-- guard (assertBillingInsightsFromLedger in scripts/migration-replay-assertions.ts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone, end_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb; v_mrr numeric; v_total_revenue numeric;
  v_active_leases integer; v_expired_leases integer; v_tenant_count integer;
  v_unpaid_total numeric; v_unpaid_count integer; v_late_fee_total numeric;
  v_start date := start_date_param::date;
  v_end date := end_date_param::date;
BEGIN
  IF owner_id_param != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  SELECT coalesce(sum(rent_amount), 0) INTO v_mrr FROM leases WHERE owner_user_id = owner_id_param AND lease_status = 'active';
  v_total_revenue := v_mrr * 12;
  SELECT count(*) FILTER (WHERE lease_status = 'active'), count(*) FILTER (WHERE lease_status IN ('ended', 'terminated', 'expired'))
  INTO v_active_leases, v_expired_leases FROM leases WHERE owner_user_id = owner_id_param;
  SELECT count(DISTINCT l.primary_tenant_id) INTO v_tenant_count FROM leases l
  WHERE l.owner_user_id = owner_id_param AND l.lease_status = 'active';

  -- The Payment Summary, from the rent ledger (see the header for each definition).
  WITH owned_leases AS (
    SELECT l.id FROM leases l
    WHERE l.owner_user_id = owner_id_param AND l.lease_status <> 'inactive'
  ),
  -- The charges in the window (every charge when no bound is given).
  c AS (
    SELECT rc.id, rc.lease_id, rc.type, rc.amount, rc.reverses_id
    FROM rent_charges rc
    JOIN owned_leases ol ON ol.id = rc.lease_id
    WHERE rc.owner_user_id = owner_id_param
      AND (v_start IS NULL OR coalesce(rc.period_start, rc.created_at::date) >= v_start)
      AND (v_end IS NULL OR coalesce(rc.period_start, rc.created_at::date) <= v_end)
  ),
  -- The charges that stand: not a reversal, and not reversed (looked up in the
  -- whole ledger, not the window), each with the receipts allocated to it.
  standing AS (
    SELECT c.lease_id, c.type, c.amount,
      coalesce((SELECT sum(rr.amount) FROM rent_receipts rr
                WHERE rr.charge_id = c.id AND rr.lease_id = c.lease_id
                  AND rr.owner_user_id = owner_id_param), 0) AS receipts_sum
    FROM c
    WHERE c.reverses_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM rent_charges v
                      WHERE v.reverses_id = c.id AND v.lease_id = c.lease_id
                        AND v.owner_user_id = owner_id_param)
  ),
  -- With no window, the ledger's own balance (get_lease_ledger_summary): every
  -- charge less every receipt on the lease. With one, what is still owed on the
  -- window's standing charges.
  balances AS (
    SELECT CASE WHEN v_start IS NULL AND v_end IS NULL THEN
        coalesce((SELECT sum(c.amount) FROM c WHERE c.lease_id = ol.id), 0)
        - coalesce((SELECT sum(rr.amount) FROM rent_receipts rr
                    WHERE rr.lease_id = ol.id AND rr.owner_user_id = owner_id_param), 0)
      ELSE
        coalesce((SELECT sum(s.amount - s.receipts_sum) FROM standing s
                  WHERE s.lease_id = ol.id), 0)
      END AS balance
    FROM owned_leases ol
  )
  SELECT
    (SELECT coalesce(sum(greatest(b.balance, 0)), 0) FROM balances b),
    (SELECT count(*)::integer FROM standing s
      WHERE s.type IN ('rent', 'late_fee', 'manual_charge') AND s.amount > s.receipts_sum),
    (SELECT coalesce(sum(s.amount), 0) FROM standing s WHERE s.type = 'late_fee')
  INTO v_unpaid_total, v_unpaid_count, v_late_fee_total;

  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue, 'mrr', v_mrr,
    'churnRate', CASE WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0 END,
    'unpaidTotal', v_unpaid_total, 'unpaidCount', v_unpaid_count,
    'lateFeeTotal', v_late_fee_total, 'tenantCount', v_tenant_count
  );
  RETURN v_result;
END;
$function$;

comment on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) is
  'Owner billing insights for the analytics Payment Summary and its export. totalRevenue/mrr (scheduled rent of active leases), churnRate and tenantCount are point-in-time. unpaidTotal (sum of per-lease ledger balances floored at 0), unpaidCount (rent/late_fee/manual_charge charges not reversed and not paid in full) and lateFeeTotal (late_fee charges not reversed) come from the rent ledger, in dollars, skipping inactive leases; the optional dates bound the charges by ledger entry date, inclusive. Guards owner_id_param against auth.uid(); service_role (auth.uid() NULL) passes the guard.';

revoke all on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) from public, anon, authenticated;
grant execute on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) to authenticated, service_role;
