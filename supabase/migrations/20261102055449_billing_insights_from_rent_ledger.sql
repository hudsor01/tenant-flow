-- =============================================================================
-- get_billing_insights: compute the Payment Summary figures and the balance
-- sheet's ledger figures from the rent ledger
-- =============================================================================
-- APPLY AFTER PR #1057 MERGES, NEVER BEFORE. Until that PR, production's `main`
-- formats lateFeeTotal and unpaidTotal with `formatCents`, which divides by 100,
-- so applying this first would show real owners $1,250.00 of late fees as
-- $12.50. After the merge the main session applies this file with MCP
-- `apply_migration`, reads `list_migrations`, and renames the file to the
-- version production assigned, in a follow-up PR. Until it is applied, the
-- balance sheet, the income statement, the cash flow, the year-end report and
-- the tax documents find none of the keys this adds and say their ledger
-- figures are unavailable rather than showing them as $0.
--
-- THE DEFECT. Since 20260528231201_repair_analytics_rpcs.sql dropped the
-- demolished rent_payments reads (latest repo copy: 20260709044800), the body
-- has returned the literals
--     'unpaidTotal', 0, 'unpaidCount', 0, 'lateFeeTotal', 0
-- so every owner's Payment Summary cards on /analytics/overview and
-- /analytics/financial, and the matching rows of the financial-analytics export
-- (supabase/functions/_shared/financial-analytics-report.ts), read 0. The rent
-- ledger (rent_charges / rent_receipts, 20260725020925 onward) has held the real
-- figures since. The balance sheet (/reports/balance-sheet) had no ledger
-- source at all: it showed scheduled rent times twelve as Cash and read an
-- `accounts_receivable` key this function never returned, so its receivables
-- were always 0. This adds the figures it needs (collectedTotal,
-- creditBalanceTotal, chargedTotal, openingTotal) and the as-of date it asks
-- for them by. The income statement and the cash flow presented scheduled
-- rent (get_dashboard_stats' active rent times twelve, or once) as revenue
-- and as rent received, whatever period was picked; the year-end report and
-- the tax documents presented it as a past tax year's gross income. This adds
-- what they need too: chargedTotal split by ledger type, the income
-- statement's revenue lines, and they read collectedTotal as of two dates for
-- the rent received between them.
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
-- WHAT EACH FIGURE MEANS. The Payment Summary's match its cards in
-- src/components/analytics/owner-payment-summary.tsx, and the statements' their
-- lines in financialQueries.balanceSheet, .incomeStatement and .cashFlow
-- (src/hooks/api/query-keys/financial-keys.ts). All use the ledger's own definitions, from
-- get_lease_ledger_summary (20260726020701) and the ledger table
-- (src/components/ledger/ledger-tab.tsx). Below, "the ledger" is the ledger as
-- of the end date (THE DATES): with no dates, all of it.
--
--   unpaidTotal, "Unpaid invoice total" and the balance sheet's Accounts
--     Receivable: the money still owed on the owner's leases. Per lease it is
--     the ledger balance, sum(charges) - sum(receipts), exactly as
--     get_lease_ledger_summary computes it: a reversal row is the exact negation
--     of what it reverses, so a reversed charge and the paired reversals of its
--     receipts net to zero, and credits and opening balances count at their
--     signed amount. Each lease's balance is floored at 0 before the sum,
--     because a prepaid lease owes nothing: adding its negative balance would
--     hide another tenant's debt.
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
--   collectedTotal, the balance sheet's Cash: the money received, every receipt
--     at its signed amount, so a reversed receipt and its reversal net to zero.
--     It is money recorded as received, not a bank balance: nothing in the data
--     model draws an expense from it.
--
--   creditBalanceTotal, the balance sheet's Tenant Credit Balances: per lease,
--     sum(receipts) - sum(charges) when that is positive (a lease paid ahead, or
--     overpaid, or whose credits exceed what it was charged), summed. It is the
--     part of collectedTotal no charge has used, which the owner holds for the
--     tenant. It and unpaidTotal are the two sides of the same per-lease
--     difference, so a lease adds to one or the other, never both.
--
--   chargedTotal: every charge at its signed amount, net of reversals and
--     credits (the charges side of each lease balance), summed. The four
--     figures partition the ledger exactly, per lease and so in total:
--         collectedTotal + unpaidTotal - creditBalanceTotal = chargedTotal
--     which is what keeps the balance sheet balanced without a plug.
--
--   openingTotal: the part of chargedTotal that is opening balances (type
--     opening, net of their reversals): money owed before the ledger began,
--     which the balance sheet carries in owner capital, not in income.
--
--   rentChargedTotal, lateFeeChargedTotal, manualChargedTotal and creditTotal:
--     the rest of chargedTotal, split by ledger type (rent, late_fee,
--     manual_charge, credit), each at its signed amount and net of its
--     reversals (reverse_charge copies the type, so a reversal nets inside its
--     own type). With openingTotal they partition chargedTotal exactly:
--         rentChargedTotal + lateFeeChargedTotal + manualChargedTotal
--           + creditTotal + openingTotal = chargedTotal
--     creditTotal is zero or negative: a credit lowers what was charged. These
--     are the income statement's revenue lines. As of two dates, the difference
--     is what was charged between them, by ledger entry date: the same rows the
--     balance sheet's Year-to-Date Income and Retained Earnings difference over
--     the same dates, so the statements tie. lateFeeChargedTotal is not
--     lateFeeTotal: lateFeeTotal counts the late fees that stand, this sums the
--     rows, so the two part when a reversal is itself reversed (the ledger
--     balance, and so chargedTotal, counts the fee as owed again).
--
-- Every figure reads only the owner's own rows, scoped by owner_user_id on the
-- lease, the charge and the receipt as get_lease_ledger_summary scopes its CTEs,
-- and skips soft-deleted leases (lease_status = 'inactive').
--
-- ONE DEFINITION OF THE ROWS THAT COUNT. Which leases a ledger figure reads,
-- and which receipts on them, is defined once, here, by two private helpers
-- that get_billing_insights and get_property_performance_analytics
-- (20261102163709) both read, so the year-end summary's rent received and
-- its By Property table can never count different receipts:
--   rent_ledger_leases(owner): the owner's leases that are not soft-deleted,
--     with the property each one's unit is on (whatever that property's or
--     unit's status: a soft-deleted unit or property keeps its ledger).
--   rent_ledger_receipts(owner): the receipts on those leases that carry the
--     owner's id, each at its signed amount, with its lease's property.
-- Both run as their SECURITY DEFINER callers (postgres) and no client role
-- may execute them.
--
-- THE DATES. start_date_param and end_date_param are optional and compared on
-- the calendar day, inclusive. The two Payment Summary callers,
-- analyticsQueries.ownerPaymentSummary() and the export leaf, pass neither, so
-- the cards and the file cover the whole ledger as it stands. The balance sheet
-- passes end_date_param alone, as of its date and of the end of the year
-- before. The income statement and the cash flow pass it alone too, as of the
-- period's end and of the day before its start, and take the difference: the
-- rows dated in the period. The year-end report and the tax documents (their
-- pages, and supabase/functions/_shared/tax-year-reports.ts) do the same for
-- December 31 of the tax year and of the year before. No caller passes
-- start_date_param.
--
--   end_date_param is an as-of date: every figure reads the ledger as it stood
--   at the end of that day. A charge is on it when its ledger entry date,
--   coalesce(period_start, created_at::date) as get_lease_ledger shows it, is on
--   or before the date; a receipt when its received_date is. A reversal is a
--   row like any other, dated the same way. reverse_charge copies the charge's
--   period_start, so a reversed rent charge nets to zero on its own date, while
--   the reversals of its receipts are dated the day they were posted; as of a
--   date between the two the receipts still stand, as the ledger's running order
--   shows them. A charge has been reversed, for unpaidCount and lateFeeTotal,
--   only when its reversal is on the ledger by then. Omitted, there is no
--   cutoff.
--
--   start_date_param makes the figures a period's: they then count only the
--   charges dated on or after it that stand at the end date (not a reversal, and
--   not reversed by a reversal on the ledger by then), and the receipts
--   allocated to those charges by the end date. Per lease, unpaidTotal is what
--   was still owed on them, floored at 0, and creditBalanceTotal what was
--   overpaid on them; collectedTotal is what was received against them,
--   chargedTotal, openingTotal and the four by-type figures what they amount
--   to, and unpaidCount and
--   lateFeeTotal the outstanding invoices and the late fees among them. No
--   reversal row counts in a period, and no reversed charge, because the two
--   halves of a pair can fall on different sides of the start date: a charge
--   with no period_start is dated by created_at and its reversal by the day it
--   was posted.
--
-- MONEY. Dollars throughout: every ledger amount is numeric(10,2), and a sum of
-- numeric(10,2) values is numeric with scale 2. No cents, no scaling (D-00).
--
-- TESTED WITHOUT PRODUCTION. The migration-replay gate applies the whole chain
-- to an empty database, seeds a ledger (scripts/migration-replay-billing-insights.sql)
-- and asserts the exact figures, the as-of date, the period, both partitions
-- (the balance sheet's, and chargedTotal by type), the owner scoping and the
-- guard (assertBillingInsightsFromLedger in
-- scripts/migration-replay-assertions.ts).
-- =============================================================================

create or replace function public.rent_ledger_leases(p_owner_id uuid)
 returns table(lease_id uuid, property_id uuid)
 language sql
 stable
 set search_path to 'public'
as $function$
  select l.id, u.property_id
  from leases l
  left join units u on u.id = l.unit_id
  where l.owner_user_id = p_owner_id
    and l.lease_status <> 'inactive';
$function$;

comment on function public.rent_ledger_leases(uuid) is
  'Private helper of get_billing_insights and get_property_performance_analytics: the owner''s leases that are not soft-deleted, with the property each one''s unit is on. The one definition of which leases a rent-ledger figure reads. No client role may execute it.';

create or replace function public.rent_ledger_receipts(p_owner_id uuid)
 returns table(lease_id uuid, charge_id uuid, received_date date, amount numeric, property_id uuid)
 language sql
 stable
 set search_path to 'public'
as $function$
  select rr.lease_id, rr.charge_id, rr.received_date, rr.amount, ll.property_id
  from rent_receipts rr
  join public.rent_ledger_leases(p_owner_id) ll on ll.lease_id = rr.lease_id
  where rr.owner_user_id = p_owner_id;
$function$;

comment on function public.rent_ledger_receipts(uuid) is
  'Private helper of get_billing_insights and get_property_performance_analytics: the receipts that carry the owner''s id on the leases rent_ledger_leases counts, signed, with the lease''s property. The one definition of which receipts a rent-ledger figure reads. No client role may execute it.';

revoke all on function public.rent_ledger_leases(uuid) from public, anon, authenticated, service_role;
revoke all on function public.rent_ledger_receipts(uuid) from public, anon, authenticated, service_role;

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
  v_collected_total numeric; v_credit_balance_total numeric;
  v_charged_total numeric; v_opening_total numeric;
  v_rent_charged numeric; v_late_fee_charged numeric;
  v_manual_charged numeric; v_credit_total numeric;
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

  -- The ledger figures (see the header for each definition and for the dates).
  WITH owned_leases AS (
    SELECT ll.lease_id AS id FROM public.rent_ledger_leases(owner_id_param) ll
  ),
  -- The ledger as of v_end (all of it when NULL): every charge dated on or
  -- before it ...
  c AS (
    SELECT rc.id, rc.lease_id, rc.type, rc.amount, rc.reverses_id,
           coalesce(rc.period_start, rc.created_at::date) AS entry_date
    FROM rent_charges rc
    JOIN owned_leases ol ON ol.id = rc.lease_id
    WHERE rc.owner_user_id = owner_id_param
      AND (v_end IS NULL OR coalesce(rc.period_start, rc.created_at::date) <= v_end)
  ),
  -- ... and every receipt on those leases received on or before it.
  r AS (
    SELECT rr.lease_id, rr.charge_id, rr.amount
    FROM public.rent_ledger_receipts(owner_id_param) rr
    WHERE (v_end IS NULL OR rr.received_date <= v_end)
  ),
  -- The charges that stand on that ledger, dated on or after v_start when it is
  -- given: not a reversal, and not reversed by a reversal on it, each with what
  -- had been received against it.
  standing AS (
    SELECT c.lease_id, c.type, c.amount,
      coalesce((SELECT sum(r.amount) FROM r
                WHERE r.charge_id = c.id AND r.lease_id = c.lease_id), 0) AS receipts_sum
    FROM c
    WHERE c.reverses_id IS NULL
      AND (v_start IS NULL OR c.entry_date >= v_start)
      AND NOT EXISTS (SELECT 1 FROM c v
                      WHERE v.reverses_id = c.id AND v.lease_id = c.lease_id)
  ),
  -- What the totals count. With no start: every row of that ledger, the lease
  -- balance's own rows. With one: the period's standing charges and what was
  -- received against them.
  charged_rows AS (
    SELECT c.lease_id, c.type, c.amount FROM c WHERE v_start IS NULL
    UNION ALL
    SELECT s.lease_id, s.type, s.amount FROM standing s WHERE v_start IS NOT NULL
  ),
  received_rows AS (
    SELECT r.lease_id, r.amount FROM r WHERE v_start IS NULL
    UNION ALL
    SELECT s.lease_id, s.receipts_sum AS amount FROM standing s WHERE v_start IS NOT NULL
  ),
  positions AS (
    SELECT
      coalesce((SELECT sum(k.amount) FROM charged_rows k WHERE k.lease_id = ol.id), 0) AS charged,
      coalesce((SELECT sum(x.amount) FROM received_rows x WHERE x.lease_id = ol.id), 0) AS received
    FROM owned_leases ol
  )
  SELECT
    (SELECT coalesce(sum(greatest(p.charged - p.received, 0)), 0) FROM positions p),
    (SELECT count(*)::integer FROM standing s
      WHERE s.type IN ('rent', 'late_fee', 'manual_charge') AND s.amount > s.receipts_sum),
    (SELECT coalesce(sum(s.amount), 0) FROM standing s WHERE s.type = 'late_fee'),
    (SELECT coalesce(sum(p.received), 0) FROM positions p),
    (SELECT coalesce(sum(greatest(p.received - p.charged, 0)), 0) FROM positions p),
    (SELECT coalesce(sum(p.charged), 0) FROM positions p),
    (SELECT coalesce(sum(k.amount), 0) FROM charged_rows k WHERE k.type = 'opening'),
    (SELECT coalesce(sum(k.amount), 0) FROM charged_rows k WHERE k.type = 'rent'),
    (SELECT coalesce(sum(k.amount), 0) FROM charged_rows k WHERE k.type = 'late_fee'),
    (SELECT coalesce(sum(k.amount), 0) FROM charged_rows k WHERE k.type = 'manual_charge'),
    (SELECT coalesce(sum(k.amount), 0) FROM charged_rows k WHERE k.type = 'credit')
  INTO v_unpaid_total, v_unpaid_count, v_late_fee_total,
       v_collected_total, v_credit_balance_total, v_charged_total, v_opening_total,
       v_rent_charged, v_late_fee_charged, v_manual_charged, v_credit_total;

  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue, 'mrr', v_mrr,
    'churnRate', CASE WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0 END,
    'unpaidTotal', v_unpaid_total, 'unpaidCount', v_unpaid_count,
    'lateFeeTotal', v_late_fee_total, 'tenantCount', v_tenant_count,
    'collectedTotal', v_collected_total, 'creditBalanceTotal', v_credit_balance_total,
    'chargedTotal', v_charged_total, 'openingTotal', v_opening_total,
    'rentChargedTotal', v_rent_charged, 'lateFeeChargedTotal', v_late_fee_charged,
    'manualChargedTotal', v_manual_charged, 'creditTotal', v_credit_total
  );
  RETURN v_result;
END;
$function$;

comment on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) is
  'Owner billing insights for the analytics Payment Summary, its export, the balance sheet, the income statement, the cash flow, the year-end report and the tax documents. totalRevenue/mrr (scheduled rent of active leases), churnRate and tenantCount are point-in-time. From the rent ledger, in dollars, skipping inactive leases: unpaidTotal (sum of per-lease balances floored at 0), unpaidCount (rent/late_fee/manual_charge charges not reversed and not paid in full), lateFeeTotal (late_fee charges not reversed), collectedTotal (receipts, net of reversals), creditBalanceTotal (per-lease receipts in excess of charges), chargedTotal (charges net of reversals and credits; collectedTotal + unpaidTotal - creditBalanceTotal = chargedTotal), openingTotal (opening balances) and rentChargedTotal/lateFeeChargedTotal/manualChargedTotal/creditTotal (the rest of chargedTotal by ledger type, signed, net of reversals; with openingTotal they sum to chargedTotal). end_date_param is an as-of date (rows dated on or before it); start_date_param restricts the figures to the standing charges dated from it. Guards owner_id_param against auth.uid(); service_role (auth.uid() NULL) passes the guard.';

revoke all on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) from public, anon, authenticated;
grant execute on function public.get_billing_insights(uuid, timestamp without time zone, timestamp without time zone) to authenticated, service_role;
