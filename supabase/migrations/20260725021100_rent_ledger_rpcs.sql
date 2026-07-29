-- =============================================================================
-- Rent ledger read / reverse / onboarding / collection-rate RPCs
-- (LEDGER-03/04/06/08) - the derived-state read layer over the append-only
-- rent_charges / rent_receipts tables created in 55-01.
-- =============================================================================
-- Purpose: one SQL source of truth for balance, late detection, the
-- chronological entry stream, atomic reversals, "track since" onboarding, and
-- the collection-rate KPI numerator/denominator. All derivation (balance,
-- late, paid-state) lives in SQL so the client never re-derives money math
-- (D-02/D-03).
--
-- Money boundary (D-00, load-bearing): every ledger amount is numeric(10,2)
-- DOLLARS. These RPCs read the numeric dollars stored by 55-01 and return them
-- directly - no cents, no hundredfold scaling, no formatCents. The only
-- integer->numeric conversion in the whole subsystem happened once at charge
-- generation (55-01 cron); the collection-rate denominator converts
-- leases.rent_amount (integer dollars) with a single `::numeric(10,2)` cast.
--
-- Late detection (D-03): a charge is late when it still has an unpaid remaining
-- balance AND its due date is more than the fixed 5-day grace in the past
-- (`due_date + interval '5 days' < current_date`). Grace is a single fixed
-- constant in v10 - the RPCs deliberately do NOT read any per-lease grace or
-- late-fee configuration columns (DIS-2); late is a DERIVED flag, never stored.
--
-- Reversals (D-06): corrections are append-only negation inserts, never edits.
-- reverse_charge posts the paired atomic negation (the charge AND its receipts)
-- so the lease balance nets to zero (Pitfall 4 / A6). reverse_receipt posts the
-- exact negation of a standalone receipt (reverses_id set, amount = -original)
-- so the standalone receipt-reversal path (55-05) carries the same server
-- guarantee instead of a client-side raw negative insert. Both are
-- double-reversal guarded (a row already referencing the target => no-op).
--
-- Security: every function is `security definer set search_path = public` and
-- guards ownership BEFORE any read or write (`raise ... using errcode = '42501'`)
-- because SECURITY DEFINER bypasses RLS. Read/RPC functions are revoked from
-- public/anon and granted to authenticated only. `(select auth.uid())` subselect.
--
-- Analog: get_esign_usage_current_month (20260724031533 - param-less owner read
-- + 42501 guard + revoke/grant discipline) and get_revenue_trends_optimized
-- (20260709060533 - SECURITY DEFINER auth guard on a param-taking RPC).
--
-- Applied to prod in Plan 55-04 (the blocking gate), NOT here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_lease_ledger_summary - per-lease derived totals + late derivation
-- -----------------------------------------------------------------------------
-- Returns the balance-strip figures for one lease: signed balance
-- (Sum(charges) - Sum(receipts)), split charge/credit/receipt totals, and the
-- DERIVED late count + late amount under the fixed 5-day grace. A charge counts
-- as late only when it is a real (non-reversal) owed line whose remaining
-- (amount - Sum receipts for that charge) is still positive past the grace.
create or replace function public.get_lease_ledger_summary(p_lease_id uuid)
returns table(
  charges_total  numeric,
  credits_total  numeric,
  receipts_total numeric,
  balance        numeric,
  late_count     integer,
  late_amount    numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.leases
    where id = p_lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  with c as (
    select * from public.rent_charges where lease_id = p_lease_id
  ),
  r as (
    select * from public.rent_receipts where lease_id = p_lease_id
  )
  select
    coalesce(sum(c.amount) filter (where c.amount > 0), 0),
    coalesce(sum(c.amount) filter (where c.amount < 0), 0),
    coalesce((select sum(amount) from r), 0),
    coalesce(sum(c.amount), 0) - coalesce((select sum(amount) from r), 0),
    coalesce(count(*) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    )::int, 0),
    coalesce(sum(
      c.amount - coalesce(
        (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ), 0)
  from c;
end;
$$;

comment on function public.get_lease_ledger_summary(uuid) is
  'Owner-scoped derived summary for one lease (LEDGER-03): signed balance = Sum(charges) - Sum(receipts), split totals, and DERIVED late_count/late_amount under a fixed 5-day grace (due_date + interval ''5 days'' < current_date). Guards lease ownership (42501) before returning. authenticated-executable.';

revoke all on function public.get_lease_ledger_summary(uuid) from public, anon;
grant execute on function public.get_lease_ledger_summary(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. get_lease_ledger - ordered chronological entry stream for the ledger UI
-- -----------------------------------------------------------------------------
-- Returns an ordered jsonb array of charge + receipt entries. The client
-- computes running balance and per-charge paid/partial/unpaid badges via
-- ledger-math (55-03), so this RPC does NOT return running totals - only the
-- raw ordered stream plus each charge's receipts_sum for the badge derivation.
create or replace function public.get_lease_ledger(p_lease_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner  uuid := (select auth.uid());
  v_result jsonb;
begin
  if not exists (
    select 1 from public.leases
    where id = p_lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  with entries as (
    select
      c.id                                       as id,
      'charge'::text                             as kind,
      c.type                                     as type,
      c.amount                                   as amount,
      coalesce(c.period_start, c.created_at::date) as entry_date,
      c.due_date                                 as due_date,
      c.description                              as description,
      null::text                                 as method,
      c.reverses_id                              as reverses_id,
      null::uuid                                 as charge_id,
      coalesce(
        (select sum(rr.amount) from public.rent_receipts rr where rr.charge_id = c.id),
        0)                                       as receipts_sum,
      c.created_at                               as created_at
    from public.rent_charges c
    where c.lease_id = p_lease_id
    union all
    select
      r.id                                       as id,
      'receipt'::text                            as kind,
      null::text                                 as type,
      r.amount                                   as amount,
      r.received_date                            as entry_date,
      null::date                                 as due_date,
      r.description                              as description,
      r.method                                   as method,
      r.reverses_id                              as reverses_id,
      r.charge_id                                as charge_id,
      null::numeric                              as receipts_sum,
      r.created_at                               as created_at
    from public.rent_receipts r
    where r.lease_id = p_lease_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           e.id,
        'kind',         e.kind,
        'type',         e.type,
        'amount',       e.amount,
        'entry_date',   e.entry_date,
        'due_date',     e.due_date,
        'description',  e.description,
        'method',       e.method,
        'reverses_id',  e.reverses_id,
        'charge_id',    e.charge_id,
        'receipts_sum', e.receipts_sum
      )
      order by e.entry_date asc, e.created_at asc
    ),
    '[]'::jsonb
  ) into v_result
  from entries e;

  return v_result;
end;
$$;

comment on function public.get_lease_ledger(uuid) is
  'Owner-scoped ordered jsonb entry stream (charges + receipts) for the chronological ledger UI (LEDGER-03). Each charge carries receipts_sum so the client derives paid/partial/unpaid; no running totals here (client-side ledger-math). Guards lease ownership (42501). authenticated-executable.';

revoke all on function public.get_lease_ledger(uuid) from public, anon;
grant execute on function public.get_lease_ledger(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. reverse_charge - atomic paired negation (charge + its receipts)
-- -----------------------------------------------------------------------------
-- Posts a charge negation (reverses_id set, amount = -original) AND a negation
-- for every non-reversal receipt allocated to that charge, in one function body
-- (one transaction). This nets both streams to zero so the lease balance is
-- unchanged by an unpaid reversal and correctly credited by a paid one - no
-- orphan receipts leaving a phantom credit (Pitfall 4 / A6). Double-reversal
-- guarded: if the charge is already reversed the call is a no-op.
create or replace function public.reverse_charge(p_charge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid := (select auth.uid());
  v_charge public.rent_charges;
begin
  select * into v_charge from public.rent_charges where id = p_charge_id;
  if v_charge.id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.leases
    where id = v_charge.lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  -- Double-reversal guard on the charge itself.
  if exists (select 1 from public.rent_charges where reverses_id = p_charge_id) then
    return;
  end if;

  -- Charge negation (exact negation of the referenced row; reverses_id set so it
  -- is exempt from the sign-discipline CHECK).
  insert into public.rent_charges (
    lease_id, owner_user_id, type, amount, period_start, due_date, description, reverses_id
  )
  values (
    v_charge.lease_id, v_charge.owner_user_id, v_charge.type, -v_charge.amount,
    v_charge.period_start, v_charge.due_date,
    'Reversal of ' || coalesce(v_charge.description, 'entry'), p_charge_id
  );

  -- Paired receipt negations: one exact negation per non-reversal, not-yet-reversed
  -- receipt allocated to this charge.
  insert into public.rent_receipts (
    charge_id, lease_id, owner_user_id, amount, method, received_date, description, reverses_id
  )
  select
    rr.charge_id, rr.lease_id, rr.owner_user_id, -rr.amount, rr.method,
    current_date, 'Reversal of receipt', rr.id
  from public.rent_receipts rr
  where rr.charge_id = p_charge_id
    and rr.reverses_id is null
    and not exists (
      select 1 from public.rent_receipts x where x.reverses_id = rr.id
    );
end;
$$;

comment on function public.reverse_charge(uuid) is
  'Owner-scoped atomic reversal of a charge (LEDGER-06, D-06): inserts an exact charge negation (reverses_id set) plus a paired negation for every receipt allocated to it, so the balance nets to zero with no orphan receipts (Pitfall 4). Guards the charge''s lease ownership (42501); double-reversal is a no-op. authenticated-executable.';

revoke all on function public.reverse_charge(uuid) from public, anon;
grant execute on function public.reverse_charge(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3a. reverse_receipt - exact negation of a standalone receipt
-- -----------------------------------------------------------------------------
-- Posts exactly one rent_receipts negation (reverses_id set, amount = -original)
-- so the standalone receipt-reversal path (55-05) carries the same server-side
-- exact-negation guarantee as reverse_charge instead of a client forging a
-- mismatched negative insert (D-06). Double-reversal guarded.
create or replace function public.reverse_receipt(p_receipt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner   uuid := (select auth.uid());
  v_receipt public.rent_receipts;
begin
  select * into v_receipt from public.rent_receipts where id = p_receipt_id;
  if v_receipt.id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.leases
    where id = v_receipt.lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  -- Double-reversal guard.
  if exists (select 1 from public.rent_receipts where reverses_id = p_receipt_id) then
    return;
  end if;

  insert into public.rent_receipts (
    charge_id, lease_id, owner_user_id, amount, method, received_date, description, reverses_id
  )
  values (
    v_receipt.charge_id, v_receipt.lease_id, v_receipt.owner_user_id, -v_receipt.amount,
    v_receipt.method, current_date, 'Reversal of receipt', p_receipt_id
  );
end;
$$;

comment on function public.reverse_receipt(uuid) is
  'Owner-scoped atomic reversal of a standalone receipt (LEDGER-06, D-06): inserts exactly one exact negation (reverses_id set, amount = -original) so the receipt-reversal path has a server guarantee the negation matches the original. Guards the receipt''s lease ownership (42501); double-reversal is a no-op. authenticated-executable.';

revoke all on function public.reverse_receipt(uuid) from public, anon;
grant execute on function public.reverse_receipt(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. start_lease_ledger - "track since" onboarding (date + opening balance)
-- -----------------------------------------------------------------------------
-- Sets leases.ledger_start_date and inserts one type='opening' charge dated at
-- track-since, atomically (D-04). No history backfill - the opening balance
-- captures pre-track state as a single line; charge generation floors periods
-- at ledger_start_date. The leases UPDATE rides the existing leases update
-- policy (not the ledger append-only trigger).
create or replace function public.start_lease_ledger(
  p_lease_id       uuid,
  p_start_date     date,
  p_opening_balance numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.leases
    where id = p_lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  update public.leases
  set ledger_start_date = p_start_date
  where id = p_lease_id and owner_user_id = v_owner;

  -- Opening balance line (signed; positive = owed). type='opening' is exempt
  -- from the sign-discipline CHECK so a negative opening (credit) is allowed.
  insert into public.rent_charges (
    lease_id, owner_user_id, type, amount, period_start, due_date, description
  )
  values (
    p_lease_id, v_owner, 'opening', p_opening_balance, p_start_date, p_start_date,
    'Opening balance'
  );
end;
$$;

comment on function public.start_lease_ledger(uuid, date, numeric) is
  'Owner-scoped "track since" onboarding (LEDGER-04, D-04): sets leases.ledger_start_date and inserts one type=''opening'' charge (signed dollars, positive = owed) dated at track-since, atomically. No history backfill. Guards lease ownership (42501). authenticated-executable.';

revoke all on function public.start_lease_ledger(uuid, date, numeric) from public, anon;
grant execute on function public.start_lease_ledger(uuid, date, numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. get_collection_rate - collection-rate KPI source (LEDGER-08)
-- -----------------------------------------------------------------------------
-- Returns scheduled (Sum leases.rent_amount for leases active in p_month),
-- collected (Sum receipts received in p_month), and rate = collected / scheduled
-- as a percentage (0-100). Honest zero: rate is 0 when scheduled = 0 (never a
-- fabricated number, D-08). scheduled converts the integer rent_amount with a
-- single ::numeric(10,2) cast (the collection-rate money boundary).
-- v_pct is the percentage multiplier expressed as a named constant so the honest
-- ratio->percentage conversion is not mistaken for money hundredfold scaling.
create or replace function public.get_collection_rate(
  p_user_id uuid,
  p_month   date default date_trunc('month', current_date)::date
)
returns table(scheduled numeric, collected numeric, rate numeric)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pct constant numeric := 100;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  with sched as (
    select coalesce(sum(l.rent_amount), 0)::numeric(10,2) as s
    from public.leases l
    where l.owner_user_id = p_user_id
      and l.lease_status in ('active', 'ended', 'expired', 'terminated')
      and l.start_date <= (p_month + interval '1 month' - interval '1 day')::date
      and (l.end_date is null or l.end_date >= p_month)
  ),
  coll as (
    select coalesce(sum(rr.amount), 0)::numeric(10,2) as c
    from public.rent_receipts rr
    where rr.owner_user_id = p_user_id
      and rr.received_date >= p_month
      and rr.received_date < (p_month + interval '1 month')::date
  )
  select
    sched.s,
    coll.c,
    case when sched.s > 0 then round(coll.c / sched.s * v_pct, 1) else 0 end
  from sched, coll;
end;
$$;

comment on function public.get_collection_rate(uuid, date) is
  'Owner-scoped collection-rate KPI source (LEDGER-08, D-08): scheduled (Sum rent_amount of leases active in p_month), collected (Sum receipts in p_month), rate = collected / scheduled as a percentage (0-100), honest 0 when scheduled = 0. Single integer->numeric cast on rent_amount; no cents. Guards p_user_id = auth.uid() (42501). authenticated-executable.';

revoke all on function public.get_collection_rate(uuid, date) from public, anon;
grant execute on function public.get_collection_rate(uuid, date) to authenticated;
