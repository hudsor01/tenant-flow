-- Rent is due on the lease's payment day, and late after the lease's grace
-- period (help-trace bug 8, 2026-11-25).
--
-- Before: generate_rent_charges dated every rent charge on the 1st of its
-- month, and get_lease_ledger_summary counted a charge late at
-- `due_date + interval '5 days'`, so the Payment Day and Grace Period an owner
-- set on the lease were ignored. Prod held no rent ledger data when this was
-- written (0 leases with ledger_start_date, 0 rent_charges), so no charge
-- already posted carries the old date.
--
-- After:
--   * generate_rent_charges: a month's rent is due on the lease's payment_day,
--     on the month's last day when it is shorter (payment_day 31 in February
--     is the 28th or 29th), and never before the lease starts. period_start
--     stays the 1st: it is the one-charge-per-month key.
--   * get_lease_ledger_summary: a charge is late once
--     `due_date + grace_period_days < current_date` (a NULL grace is 0).
--   * get_lease_ledger: each charge carries `late_after`, the same
--     `due_date + grace_period_days`, so the ledger table's Late badge reads
--     the database's date instead of a client constant.
--
-- Bodies start from production's (pg_get_functiondef, 2026-11-27); grants and
-- ownership are unchanged by CREATE OR REPLACE.

create or replace function public.generate_rent_charges()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_inserted integer;
begin
  with active_periods as (
    select
      l.id            as lease_id,
      l.owner_user_id as owner_user_id,
      l.rent_amount   as rent_amount,
      gs::date        as period_start,
      greatest(
        gs::date + (
          least(
            l.payment_day,
            extract(day from (gs + interval '1 month' - interval '1 day'))::int
          ) - 1
        ),
        l.start_date
      )               as due_date
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
      rent_amount::numeric(10,2),
      period_start,
      due_date,
      'Monthly rent'
    from active_periods
    on conflict (lease_id, period_start) where type = 'rent' and reverses_id is null do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  return v_inserted;
end;
$function$;

create or replace function public.get_lease_ledger_summary(p_lease_id uuid)
 returns table(charges_total numeric, credits_total numeric, receipts_total numeric, balance numeric, late_count integer, late_amount numeric)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_owner uuid := (select auth.uid());
  v_grace integer;
begin
  select greatest(coalesce(l.grace_period_days, 0), 0)
    into v_grace
    from public.leases l
   where l.id = p_lease_id and l.owner_user_id = v_owner;

  if not found then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  with c as (
    select * from public.rent_charges
    where lease_id = p_lease_id and owner_user_id = v_owner
  ),
  r as (
    select * from public.rent_receipts
    where lease_id = p_lease_id and owner_user_id = v_owner
  )
  select
    coalesce(sum(c.amount) filter (where c.amount > 0), 0),
    coalesce(sum(c.amount) filter (where c.amount < 0), 0),
    coalesce((select sum(amount) from r), 0),
    coalesce(sum(c.amount), 0) - coalesce((select sum(amount) from r), 0),
    coalesce(count(*) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and not exists (select 1 from c v where v.reverses_id = c.id)
        and c.due_date + v_grace < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    )::int, 0),
    coalesce(sum(
      c.amount - coalesce(
        (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and not exists (select 1 from c v where v.reverses_id = c.id)
        and c.due_date + v_grace < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ), 0)
  from c;
end;
$function$;

create or replace function public.get_lease_ledger(p_lease_id uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_owner  uuid := (select auth.uid());
  v_grace  integer;
  v_result jsonb;
begin
  select greatest(coalesce(l.grace_period_days, 0), 0)
    into v_grace
    from public.leases l
   where l.id = p_lease_id and l.owner_user_id = v_owner;

  if not found then
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
      c.due_date + v_grace                       as late_after,
      c.description                              as description,
      null::text                                 as method,
      c.reverses_id                              as reverses_id,
      null::uuid                                 as charge_id,
      coalesce(
        (select sum(rr.amount) from public.rent_receipts rr
          where rr.charge_id = c.id
            and rr.owner_user_id = v_owner),
        0)                                       as receipts_sum,
      c.created_at                               as created_at
    from public.rent_charges c
    where c.lease_id = p_lease_id
      and c.owner_user_id = v_owner
    union all
    select
      r.id                                       as id,
      'receipt'::text                            as kind,
      null::text                                 as type,
      r.amount                                   as amount,
      r.received_date                            as entry_date,
      null::date                                 as due_date,
      null::date                                 as late_after,
      r.description                              as description,
      r.method                                   as method,
      r.reverses_id                              as reverses_id,
      r.charge_id                                as charge_id,
      null::numeric                              as receipts_sum,
      r.created_at                               as created_at
    from public.rent_receipts r
    where r.lease_id = p_lease_id
      and r.owner_user_id = v_owner
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
        'late_after',   e.late_after,
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
$function$;
