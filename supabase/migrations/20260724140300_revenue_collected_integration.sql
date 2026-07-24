-- =============================================================================
-- Revenue "collected" integration (LEDGER-07) — fill the collections placeholder
-- from ledger receipts; scheduled vs collected, no double-count.
-- =============================================================================
-- Purpose: since v2.0, get_revenue_trends_optimized has emitted a hardcoded
-- `'collections', 0` because there was no honest source of collected rent. The
-- rent ledger (55-01) now provides it. This migration fills collections from
-- rent_receipts while keeping scheduled (lease-derived expected rent) and
-- collected (ledger receipts) as SEPARATE labeled figures — they are never
-- summed (D-07 / Pitfall 5).
--
--   revenue     = coalesce(me.expected_revenue, 0)          -- SCHEDULED (unchanged calc)
--   collections = coalesce(mc.collected, 0)                 -- COLLECTED (from ledger, NEW)
--   outstanding = scheduled - collected                     -- what is still owed
--
-- The `revenue` (scheduled) calculation is UNCHANGED — the UI relabels it
-- "Scheduled"; the math does not change. Nothing sums scheduled + collected.
--
-- Deliberately does NOT touch the revenue-stats composite type or
-- get_dashboard_stats: those feed a composite whose signature would break under
-- an added field, so collected/collection-rate are surfaced via the ledger's
-- own RPCs (55-02
-- get_collection_rate) instead of re-basing the dashboard composite (RESEARCH
-- Pitfall 5). NOI / margin continue to derive from scheduled, not collected.
--
-- Money boundary (D-00): collected sums numeric(10,2) ledger dollars directly —
-- no cents, no hundredfold scaling. The per-month object keys stay
-- {month, revenue, collections, outstanding} so the frontend RevenueTrendRow
-- contract (use-owner-dashboard-financial.ts) is unchanged.
--
-- CREATE OR REPLACE with the identical RETURNS jsonb signature — no return-type
-- change, so existing grants (authenticated execute) are preserved. Body is the
-- current 20260709060533 body reproduced in lowercase (repo SQL convention),
-- with only the monthly_collected CTE + collections/outstanding fill added.
--
-- Applied to prod in Plan 55-04 (the blocking gate), NOT here.
-- =============================================================================

create or replace function public.get_revenue_trends_optimized(p_user_id uuid, p_months integer default 12)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;
  with months as (
    select (current_date - (gs || ' months')::interval)::date as month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date as month_end
    from generate_series(0, p_months - 1) gs
  ),
  monthly_expected as (
    select m.month_start, coalesce(sum(l.rent_amount), 0)::bigint as expected_revenue
    from months m left join leases l on l.owner_user_id = p_user_id
      and l.lease_status in ('active', 'ended', 'expired') and l.start_date <= m.month_end
      and (l.end_date is null or l.end_date >= m.month_start)
      and l.unit_id in (
        select u.id from units u join properties p on p.id = u.property_id
        where p.owner_user_id = p_user_id and p.status <> 'inactive'
      )
    group by m.month_start
  ),
  monthly_collected as (
    -- COLLECTED (NEW): Sum ledger receipts by calendar month for this owner.
    -- Keyed to the same 'YYYY-MM' string the month series emits so a receipt in
    -- month M lands on the same row as month M's scheduled figure. Dollars only.
    select to_char(date_trunc('month', rr.received_date), 'YYYY-MM') as month_key,
      coalesce(sum(rr.amount), 0)::numeric(10,2) as collected
    from rent_receipts rr
    where rr.owner_user_id = p_user_id
    group by to_char(date_trunc('month', rr.received_date), 'YYYY-MM')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(m.month_start, 'YYYY-MM'),
    'revenue', coalesce(me.expected_revenue, 0),
    'collections', coalesce(mc.collected, 0),
    'outstanding', coalesce(me.expected_revenue, 0) - coalesce(mc.collected, 0)
  ) order by m.month_start desc), '[]'::jsonb) into v_result
  from months m
    left join monthly_expected me on me.month_start = m.month_start
    left join monthly_collected mc on mc.month_key = to_char(m.month_start, 'YYYY-MM');
  return v_result;
end;
$function$;

comment on function public.get_revenue_trends_optimized(uuid, integer) is
  'Per-month revenue trend (LEDGER-07). revenue = SCHEDULED (Sum leases.rent_amount, calc unchanged); collections = COLLECTED (Sum rent_receipts.amount by month, filled from the ledger — no longer hardcoded 0); outstanding = scheduled - collected. Scheduled and collected are never summed. SECURITY DEFINER, owner-guarded. Keys stay {month, revenue, collections, outstanding} (RevenueTrendRow contract).';
