-- Fixture for the migration-replay gate's get_billing_insights assertion.
--
-- Run by .github/workflows/migration-replay.yml after the test cast is seeded,
-- against the replayed EMPTY database only:
--
--   docker exec -i supabase_db_tenant-flow psql -U postgres -X -q -t -A \
--     -v ON_ERROR_STOP=1 < scripts/migration-replay-billing-insights.sql
--
-- It seeds a rent ledger for e2e-owner-a and e2e-owner-b, calls the function
-- the way the app does (as the authenticated owner), prints ONE line of JSON,
-- and rolls everything back. scripts/migration-replay-assertions.ts
-- (assertBillingInsightsFromLedger) holds the expected figures and the
-- arithmetic behind each one; keep the two in step.
--
-- Every amount is dollars. Every date is fixed except the reversals that
-- reverse_receipt, and reverse_charge for a receipt or for a charge with no
-- period_start, date the day the gate runs. That day is after every fixed date
-- here (the last is 2026-03-31), so no figure drifts with the calendar.
--
-- THE LEDGER (owner A unless noted):
--   lease A1, active   opening 300.00 (Jan 1), rent Jan 1000 paid in full,
--                      manual charge 60.00 (Jan 20) unpaid,
--                      rent Feb 1000 with 400 received, late fee 75.00 (Feb 6)
--                      unpaid, manual charge 250.50 (Feb 28) unpaid,
--                      rent Mar 1000 paid 1000 then REVERSED (with its receipt),
--                      late fee 50.00 (Mar 6) then REVERSED, credit -100.00
--                      (Mar 15), and a 35.00 late fee posted with no
--                      period_start on Feb 15 (so dated by created_at) then
--                      REVERSED: its reversal is dated the day the gate runs,
--                      after both dates the gate asks as of (Feb 28, Mar 31).
--                      Also a 75.00 receipt against the February 6 late fee,
--                      received Mar 31, then REVERSED with reverse_receipt
--                      (the reversal is dated the day the gate runs).
--   lease A2, active   rent Jan 1500 paid 2000 (prepaid by 500), late fee 40.00
--                      (Jan 6) paid in full, opening 200.00 (Jan 1) then
--                      REVERSED (its reversal dated Jan 1 too), and a manual
--                      charge 80.00 (Jan 25) reversed whose REVERSAL WAS
--                      REVERSED by a direct insert: reverse_charge refuses a
--                      reversal as its target (20260726020701, F4), but the
--                      insert policy still admits the row, and the ledger
--                      balance counts the 80 as owed again.
--   lease A3, INACTIVE rent Jan 900 unpaid, late fee 30.00 unpaid.
--   lease B1 (owner B) rent Jan 700 unpaid, late fee 20.00 unpaid.
--   On lease A1, two rows stamped with owner B's id: a 999.00 manual charge and
--   a 600.00 receipt against February's rent. They are the rows the pre-F2
--   insert policy let another owner append (20260726020701); the function must
--   count them for neither owner.
-- The reversals go through public.reverse_charge and public.reverse_receipt as
-- owner A, the app's own path; reverse_charge also reverses the receipt
-- allocated to the March rent.

\set ON_ERROR_STOP on
\set QUIET on

begin;

select id as owner_a from auth.users where email = 'e2e-owner-a@tenantflow.app' \gset
select id as owner_b from auth.users where email = 'e2e-owner-b@tenantflow.app' \gset

create temp table replay_billing (label text primary key, payload jsonb not null)
  on commit drop;
grant insert, select on replay_billing to authenticated;

insert into public.properties (id, owner_user_id, name, address_line1, city, state, postal_code, property_type)
values
  ('b1000000-0000-4000-8000-00000000a001', :'owner_a', 'Replay A', '1 Ledger St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY'),
  ('b1000000-0000-4000-8000-00000000b001', :'owner_b', 'Replay B', '2 Ledger St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY');

insert into public.units (id, owner_user_id, property_id, unit_number, rent_amount)
values
  ('b2000000-0000-4000-8000-00000000a001', :'owner_a', 'b1000000-0000-4000-8000-00000000a001', 'A1', 1000),
  ('b2000000-0000-4000-8000-00000000a002', :'owner_a', 'b1000000-0000-4000-8000-00000000a001', 'A2', 1500),
  ('b2000000-0000-4000-8000-00000000a003', :'owner_a', 'b1000000-0000-4000-8000-00000000a001', 'A3', 900),
  ('b2000000-0000-4000-8000-00000000b001', :'owner_b', 'b1000000-0000-4000-8000-00000000b001', 'B1', 700);

insert into public.tenants (id, owner_user_id, first_name, last_name)
values
  ('b3000000-0000-4000-8000-00000000a001', :'owner_a', 'Ada', 'One'),
  ('b3000000-0000-4000-8000-00000000a002', :'owner_a', 'Bea', 'Two'),
  ('b3000000-0000-4000-8000-00000000a003', :'owner_a', 'Cy', 'Three'),
  ('b3000000-0000-4000-8000-00000000b001', :'owner_b', 'Dee', 'Four');

insert into public.leases (id, owner_user_id, unit_id, primary_tenant_id, start_date, end_date,
                           rent_amount, security_deposit, lease_status, ledger_start_date)
values
  ('b4000000-0000-4000-8000-00000000a001', :'owner_a', 'b2000000-0000-4000-8000-00000000a001',
   'b3000000-0000-4000-8000-00000000a001', '2026-01-01', '2026-12-31', 1000, 1000, 'active', '2026-01-01'),
  ('b4000000-0000-4000-8000-00000000a002', :'owner_a', 'b2000000-0000-4000-8000-00000000a002',
   'b3000000-0000-4000-8000-00000000a002', '2026-01-01', '2026-12-31', 1500, 1500, 'active', '2026-01-01'),
  ('b4000000-0000-4000-8000-00000000a003', :'owner_a', 'b2000000-0000-4000-8000-00000000a003',
   'b3000000-0000-4000-8000-00000000a003', '2026-01-01', '2026-12-31', 900, 900, 'inactive', '2026-01-01'),
  ('b4000000-0000-4000-8000-00000000b001', :'owner_b', 'b2000000-0000-4000-8000-00000000b001',
   'b3000000-0000-4000-8000-00000000b001', '2026-01-01', '2026-12-31', 700, 700, 'active', '2026-01-01');

-- period_start = due_date = the line's date, as the app's add-line and the
-- generator write them.
insert into public.rent_charges (id, lease_id, owner_user_id, type, amount, period_start, due_date, description)
values
  ('b5000000-0000-4000-8000-0000000a1000', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'opening',        300.00, '2026-01-01', '2026-01-01', 'Opening balance'),
  ('b5000000-0000-4000-8000-0000000a1001', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'rent',          1000.00, '2026-01-01', '2026-01-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000a1002', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'manual_charge',   60.00, '2026-01-20', '2026-01-20', 'Key replacement'),
  ('b5000000-0000-4000-8000-0000000a1003', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'rent',          1000.00, '2026-02-01', '2026-02-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000a1004', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'late_fee',        75.00, '2026-02-06', '2026-02-06', 'Late fee'),
  ('b5000000-0000-4000-8000-0000000a1005', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'manual_charge',  250.50, '2026-02-28', '2026-02-28', 'Lawn service'),
  ('b5000000-0000-4000-8000-0000000a1006', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'rent',          1000.00, '2026-03-01', '2026-03-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000a1007', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'late_fee',        50.00, '2026-03-06', '2026-03-06', 'Late fee'),
  ('b5000000-0000-4000-8000-0000000a1008', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'credit',        -100.00, '2026-03-15', '2026-03-15', 'Repair credit'),
  ('b5000000-0000-4000-8000-0000000a2000', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'opening',        200.00, '2026-01-01', '2026-01-01', 'Opening balance'),
  ('b5000000-0000-4000-8000-0000000a2001', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'rent',          1500.00, '2026-01-01', '2026-01-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000a2002', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'late_fee',        40.00, '2026-01-06', '2026-01-06', 'Late fee'),
  ('b5000000-0000-4000-8000-0000000a2003', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'manual_charge',   80.00, '2026-01-25', '2026-01-25', 'Gutter cleaning'),
  ('b5000000-0000-4000-8000-0000000a3001', 'b4000000-0000-4000-8000-00000000a003', :'owner_a', 'rent',           900.00, '2026-01-01', '2026-01-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000a3002', 'b4000000-0000-4000-8000-00000000a003', :'owner_a', 'late_fee',        30.00, '2026-01-06', '2026-01-06', 'Late fee'),
  ('b5000000-0000-4000-8000-0000000b1001', 'b4000000-0000-4000-8000-00000000b001', :'owner_b', 'rent',           700.00, '2026-01-01', '2026-01-01', 'Monthly rent'),
  ('b5000000-0000-4000-8000-0000000b1002', 'b4000000-0000-4000-8000-00000000b001', :'owner_b', 'late_fee',        20.00, '2026-01-06', '2026-01-06', 'Late fee'),
  ('b5000000-0000-4000-8000-0000000b9001', 'b4000000-0000-4000-8000-00000000a001', :'owner_b', 'manual_charge',  999.00, '2026-02-10', '2026-02-10', 'Foreign row');

-- The double reversal on A2, as direct inserts would write it.
insert into public.rent_charges (id, lease_id, owner_user_id, type, amount, period_start, due_date, description, reverses_id)
values
  ('b5000000-0000-4000-8000-0000000a2004', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'manual_charge',  -80.00, '2026-01-25', '2026-01-25', 'Reversal of Gutter cleaning', 'b5000000-0000-4000-8000-0000000a2003'),
  ('b5000000-0000-4000-8000-0000000a2005', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 'manual_charge',   80.00, '2026-01-25', '2026-01-25', 'Reversal of Reversal of Gutter cleaning', 'b5000000-0000-4000-8000-0000000a2004');

-- No period_start, as a direct API insert may leave it: its ledger date is its
-- created_at, set here because the column defaults to now().
insert into public.rent_charges (id, lease_id, owner_user_id, type, amount, period_start, due_date, description, created_at)
values
  ('b5000000-0000-4000-8000-0000000a1009', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 'late_fee',        35.00, null, '2026-02-15', 'Late fee', '2026-02-15 12:00:00+00');

insert into public.rent_receipts (charge_id, lease_id, owner_user_id, amount, method, received_date)
values
  ('b5000000-0000-4000-8000-0000000a1001', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 1000.00, 'check', '2026-01-03'),
  ('b5000000-0000-4000-8000-0000000a1003', 'b4000000-0000-4000-8000-00000000a001', :'owner_a',  400.00, 'check', '2026-02-05'),
  ('b5000000-0000-4000-8000-0000000a1006', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 1000.00, 'check', '2026-03-02'),
  ('b5000000-0000-4000-8000-0000000a2001', 'b4000000-0000-4000-8000-00000000a002', :'owner_a', 2000.00, 'zelle', '2026-01-02'),
  ('b5000000-0000-4000-8000-0000000a2002', 'b4000000-0000-4000-8000-00000000a002', :'owner_a',   40.00, 'zelle', '2026-01-10'),
  ('b5000000-0000-4000-8000-0000000a1003', 'b4000000-0000-4000-8000-00000000a001', :'owner_b',  600.00, 'cash',  '2026-02-07');

insert into public.rent_receipts (id, charge_id, lease_id, owner_user_id, amount, method, received_date)
values
  ('b6000000-0000-4000-8000-0000000a1004', 'b5000000-0000-4000-8000-0000000a1004', 'b4000000-0000-4000-8000-00000000a001', :'owner_a', 75.00, 'check', '2026-03-31');

-- From here on, act as the owner, exactly as PostgREST would for the app.
select set_config('replay.owner_a', :'owner_a', true) as ignored \gset
select set_config('replay.owner_b', :'owner_b', true) as ignored \gset
select set_config('request.jwt.claims', json_build_object('sub', :'owner_a', 'role', 'authenticated')::text, true) as ignored \gset
set local role authenticated;

do $$
begin
  perform public.reverse_charge('b5000000-0000-4000-8000-0000000a1006');
  perform public.reverse_charge('b5000000-0000-4000-8000-0000000a1007');
  perform public.reverse_charge('b5000000-0000-4000-8000-0000000a1009');
  perform public.reverse_charge('b5000000-0000-4000-8000-0000000a2000');
  perform public.reverse_receipt('b6000000-0000-4000-8000-0000000a1004');
end
$$;

insert into replay_billing values
  ('owner_a', public.get_billing_insights(current_setting('replay.owner_a')::uuid)),
  ('owner_a_february', public.get_billing_insights(current_setting('replay.owner_a')::uuid,
                                                   '2026-02-01', '2026-02-28')),
  -- As the balance sheet asks: the end date alone, an as-of date.
  ('owner_a_as_of_march', public.get_billing_insights(current_setting('replay.owner_a')::uuid,
                                                      end_date_param => '2026-03-31'));

-- The guard, kept as written: owner A asking for owner B's figures is refused.
do $$
declare
  v_refused boolean := false;
begin
  begin
    perform public.get_billing_insights(current_setting('replay.owner_b')::uuid);
  exception when others then
    v_refused := sqlerrm like 'Access denied%';
  end;
  insert into replay_billing values ('guard_refuses_another_owner', to_jsonb(v_refused));
end
$$;

select set_config('request.jwt.claims', json_build_object('sub', :'owner_b', 'role', 'authenticated')::text, true) as ignored \gset
insert into replay_billing values
  ('owner_b', public.get_billing_insights(current_setting('replay.owner_b')::uuid));

reset role;

insert into replay_billing values
  ('execute', jsonb_build_object(
    'anon', has_function_privilege('anon', 'public.get_billing_insights(uuid,timestamp,timestamp)', 'execute'),
    'authenticated', has_function_privilege('authenticated', 'public.get_billing_insights(uuid,timestamp,timestamp)', 'execute'),
    'service_role', has_function_privilege('service_role', 'public.get_billing_insights(uuid,timestamp,timestamp)', 'execute')));

select jsonb_object_agg(label, payload)::text from replay_billing;

rollback;
