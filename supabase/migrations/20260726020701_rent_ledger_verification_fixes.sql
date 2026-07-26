-- =============================================================================
-- Phase 55 verification fixes: F6 (rent charges were not reversible at all),
-- F1 (late derivation), F2 (cross-owner insert), F4 (reversing a reversal)
-- =============================================================================
-- Found by the goal-backward verification of Phase 55, plus one blocker (F6)
-- found by executing the reversal path rather than only reading it. All are
-- defects in server code shipped earlier in this phase.
--
-- F6 (BLOCKER) - an auto-generated rent charge could not be reversed at all.
--   `uq_rent_charges_lease_period_rent` was `(lease_id, period_start) where
--   type = 'rent'`. `reverse_charge` copies BOTH `type` and `period_start` from
--   the original, so the reversal of a type='rent' charge collided with the
--   original on that very index and the RPC aborted with 23505:
--
--     duplicate key value violates unique constraint
--     "uq_rent_charges_lease_period_rent"
--
--   The index exists to make the pg_cron generator idempotent - at most one
--   GENERATED rent charge per lease per month. A reversal is not a generated
--   charge and has no business participating in that constraint. So LEDGER-06's
--   correction path was broken for the single most common charge type: rent.
--   Reading the SQL could not surface this; only executing a reversal does.
--   Fix: narrow the index predicate to `type = 'rent' and reverses_id is null`
--   and update the generator's ON CONFLICT arbiter to match it exactly - an
--   arbiter that does not match its index raises "no unique or exclusion
--   constraint matching the ON CONFLICT specification", so the two must move
--   together, in this one transaction.
--
-- F1 (major) - a reversed past-due charge still counted as late.
--   The late predicate excluded reversal ROWS (`c.reverses_id is null`) but never
--   excluded the reversed ORIGINAL. `reverse_charge` copies `type` and nets the
--   paired receipts to zero, so after a reversal the original still satisfied
--   every late clause. The balance strip rendered "N late" while the balance was
--   $0 and the table showed no Late badge - exactly the SQL/client divergence this
--   phase set out to make impossible.
--   Fix: both the late_count and late_amount filters now also require that no row
--   reverses the charge.
--
-- F2 (major) - the INSERT WITH CHECK never validated the referenced parent.
--   Both ledger policies checked only `owner_user_id = auth.uid()`, while the read
--   RPCs select `where lease_id = p_lease_id` with no owner predicate. An
--   authenticated owner who knew another owner's lease UUID could therefore append
--   a permanent row into that owner's balance - and append-only means the victim
--   could never remove it. The receipts side had the same hole for `charge_id`:
--   nothing required the referenced charge to share the row's lease or owner, so a
--   foreign charge_id inflated another owner's per-charge receipts_sum.
--   Fixed in depth, at both layers:
--     (a) WITH CHECK now proves the referenced lease - and for receipts, the
--         referenced charge - belongs to the caller.
--     (b) the read RPCs additionally scope their CTEs by owner_user_id, so even a
--         pre-existing bad row cannot fold into another owner's totals.
--   Layer (b) matters because (a) only binds future writes.
--
-- F4 (minor) - reverse_charge / reverse_receipt accepted a reversal as the target.
--   The guards asked "is the target already reversed", never "is the target itself
--   a reversal". Calling the RPC directly on a reversal row posted a positive
--   re-charge, inflating the balance and the collection KPI. The UI blocked it; the
--   server did not.
--   Fix: both RPCs no-op on a reversal target, matching the existing
--   already-reversed guard's silent-return style.
--
-- Not changed here: F3 (a mid-month track-since still generates that month's full
-- rent charge) is deliberate and disclosed in the track-since dialog copy - the
-- owner is told to size the opening balance accordingly - so it is a product
-- decision, not a defect to silently reverse.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- F6 - exempt reversals from the cron-idempotency index, and realign the arbiter
-- -----------------------------------------------------------------------------
drop index if exists public.uq_rent_charges_lease_period_rent;

create unique index uq_rent_charges_lease_period_rent
  on public.rent_charges (lease_id, period_start)
  where type = 'rent' and reverses_id is null;

comment on index public.uq_rent_charges_lease_period_rent is
  'Cron idempotency for generate_rent_charges (D-01): at most one GENERATED rent charge per lease per month. Reversal rows (reverses_id not null) are excluded so a rent charge can actually be reversed (F6). The generator ON CONFLICT arbiter must match this predicate exactly.';

-- Generator body unchanged except the arbiter, which must mirror the new index.
create or replace function public.generate_rent_charges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  with active_periods as (
    select
      l.id            as lease_id,
      l.owner_user_id as owner_user_id,
      l.rent_amount   as rent_amount,
      gs::date        as period_start
    from public.leases l
    join lateral generate_series(
           greatest(date_trunc('month', l.ledger_start_date),
                    date_trunc('month', l.start_date)),
           date_trunc('month', current_date),
           interval '1 month') gs on true
    where l.ledger_start_date is not null
      and l.lease_status in ('active','ended','expired','terminated')
      and l.start_date <= (gs + interval '1 month' - interval '1 day')::date
      and (l.end_date is null or l.end_date >= gs::date)
  ),
  ins as (
    insert into public.rent_charges (lease_id, owner_user_id, type, amount, period_start, due_date, description)
    select
      lease_id,
      owner_user_id,
      'rent',
      rent_amount::numeric(10,2),          -- THE ONE CONVERSION: integer dollars -> numeric(10,2) dollars (D-00)
      period_start,
      period_start,                        -- due_date = the 1st (D-01)
      'Monthly rent'
    from active_periods
    -- arbiter mirrors uq_rent_charges_lease_period_rent exactly (F6)
    on conflict (lease_id, period_start) where type = 'rent' and reverses_id is null do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  return v_inserted;
end;
$$;

comment on function public.generate_rent_charges() is
  'pg_cron job (05:00 UTC daily): inserts one type=''rent'' charge per covered lease per tracked calendar month (LEDGER-01), converting the integer leases.rent_amount to numeric(10,2) dollars EXACTLY ONCE (D-00). Idempotent via uq_rent_charges_lease_period_rent + on conflict do nothing; the arbiter mirrors the index predicate including the reversals exemption (F6). service_role-only. Returns the count inserted.';

revoke all on function public.generate_rent_charges() from public, anon, authenticated;
grant execute on function public.generate_rent_charges() to service_role;

-- -----------------------------------------------------------------------------
-- F2 (a) - prove the referenced parent belongs to the caller on INSERT
-- -----------------------------------------------------------------------------
alter policy rent_charges_insert on public.rent_charges
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.leases l
      where l.id = lease_id
        and l.owner_user_id = (select auth.uid())
    )
  );

alter policy rent_receipts_insert on public.rent_receipts
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.leases l
      where l.id = lease_id
        and l.owner_user_id = (select auth.uid())
    )
    -- the allocated charge must belong to the same lease AND the same owner,
    -- so a foreign charge_id can never inflate another owner's receipts_sum
    and exists (
      select 1 from public.rent_charges c
      where c.id = charge_id
        and c.lease_id = lease_id
        and c.owner_user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- F1 + F2 (b) - late derivation excludes reversed originals; CTEs owner-scoped
-- -----------------------------------------------------------------------------
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
    select * from public.rent_charges
    where lease_id = p_lease_id and owner_user_id = v_owner   -- F2(b)
  ),
  r as (
    select * from public.rent_receipts
    where lease_id = p_lease_id and owner_user_id = v_owner   -- F2(b)
  )
  select
    coalesce(sum(c.amount) filter (where c.amount > 0), 0),
    coalesce(sum(c.amount) filter (where c.amount < 0), 0),
    coalesce((select sum(amount) from r), 0),
    coalesce(sum(c.amount), 0) - coalesce((select sum(amount) from r), 0),
    coalesce(count(*) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        -- F1: a charge that HAS BEEN reversed is void, not late
        and not exists (select 1 from c v where v.reverses_id = c.id)
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
        and not exists (select 1 from c v where v.reverses_id = c.id)   -- F1
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ), 0)
  from c;
end;
$$;

comment on function public.get_lease_ledger_summary(uuid) is
  'Owner-scoped derived summary for one lease (LEDGER-03): signed balance = Sum(charges) - Sum(receipts), split totals, and DERIVED late_count/late_amount under a fixed 5-day grace. A charge that has been reversed is void and never counts as late (F1). CTEs are owner-scoped as well as lease-scoped (F2). Guards lease ownership (42501). authenticated-executable.';

revoke all on function public.get_lease_ledger_summary(uuid) from public, anon;
grant execute on function public.get_lease_ledger_summary(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- F2 (b) - entry stream and per-charge receipts_sum owner-scoped
-- -----------------------------------------------------------------------------
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
        (select sum(rr.amount) from public.rent_receipts rr
          where rr.charge_id = c.id
            and rr.owner_user_id = v_owner),      -- F2(b)
        0)                                       as receipts_sum,
      c.created_at                               as created_at
    from public.rent_charges c
    where c.lease_id = p_lease_id
      and c.owner_user_id = v_owner              -- F2(b)
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
      and r.owner_user_id = v_owner              -- F2(b)
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
  'Owner-scoped ordered jsonb entry stream (charges + receipts) for the chronological ledger UI (LEDGER-03). Each charge carries receipts_sum so the client derives paid/partial/unpaid. Every read is owner-scoped as well as lease-scoped, including the per-charge receipts_sum subquery (F2). Guards lease ownership (42501). authenticated-executable.';

revoke all on function public.get_lease_ledger(uuid) from public, anon;
grant execute on function public.get_lease_ledger(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- F4 - refuse a reversal row as the reversal target
-- -----------------------------------------------------------------------------
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

  -- F4: a reversal is not itself reversible - re-charging it would inflate the
  -- balance and the collection KPI. No-op, matching the guard below.
  if v_charge.reverses_id is not null then
    return;
  end if;

  -- Double-reversal guard on the charge itself.
  if exists (select 1 from public.rent_charges where reverses_id = p_charge_id) then
    return;
  end if;

  insert into public.rent_charges (
    lease_id, owner_user_id, type, amount, period_start, due_date, description, reverses_id
  )
  values (
    v_charge.lease_id, v_charge.owner_user_id, v_charge.type, -v_charge.amount,
    v_charge.period_start, v_charge.due_date,
    'Reversal of ' || coalesce(v_charge.description, 'entry'), p_charge_id
  );

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
  'Owner-scoped atomic reversal of a charge (LEDGER-06, D-06): inserts an exact charge negation plus a paired negation for every receipt allocated to it, so the balance nets to zero with no orphan receipts. Guards the charge''s lease ownership (42501). Reversing an already-reversed charge, or reversing a reversal itself (F4), is a no-op. authenticated-executable.';

revoke all on function public.reverse_charge(uuid) from public, anon;
grant execute on function public.reverse_charge(uuid) to authenticated;

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

  -- F4: a reversal is not itself reversible.
  if v_receipt.reverses_id is not null then
    return;
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
  'Owner-scoped atomic reversal of a standalone receipt (LEDGER-06, D-06): inserts exactly one exact negation so the receipt-reversal path has a server guarantee the negation matches the original. Guards the receipt''s lease ownership (42501). Reversing an already-reversed receipt, or reversing a reversal itself (F4), is a no-op. authenticated-executable.';

revoke all on function public.reverse_receipt(uuid) from public, anon;
grant execute on function public.reverse_receipt(uuid) to authenticated;
