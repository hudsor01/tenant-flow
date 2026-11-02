-- Fixture for the migration-replay gate's get_property_performance_analytics
-- assertion.
--
-- Run by .github/workflows/migration-replay.yml after the test cast is seeded,
-- against the replayed EMPTY database only:
--
--   docker exec -i supabase_db_tenant-flow psql -U postgres -X -q -t -A \
--     -v ON_ERROR_STOP=1 < scripts/migration-replay-property-performance.sql
--
-- It seeds properties, leases, rent receipts and expenses for e2e-owner-a and
-- e2e-owner-b, calls the function the way the app does (as the authenticated
-- owner), prints ONE line of JSON, and rolls everything back.
-- scripts/migration-replay-assertions.ts (assertPropertyPerformanceRentReceived)
-- holds the expected rows and the arithmetic behind each; keep the two in step.
--
-- Every amount is dollars. Two kinds of date:
--   - fixed, all in 2024, 2025 and 2026-01-01, for the tax-year window
--     2025-01-01..2025-12-31;
--   - relative to the day the gate runs (T below, current_date), for the
--     trailing '30d' window [T-30, T]. reverse_receipt dates its reversal T.
-- T is never earlier than 2026-11-02 (the day this was written), so T-31 is
-- after 2026-01-01 and no relative date falls in 2025, nor any fixed one in
-- the trailing window. The fixture prints T as `today`, from which the
-- assertion computes the trailing window it expects.
--
-- THE PORTFOLIO (owner A unless noted):
--   Alpha Court  units A1 occupied (lease LA1, active), A2 available (lease
--                LA2, INACTIVE: soft-deleted), A3 inactive (not in the
--                occupancy denominator).
--     LA1 receipts: 1000.00 on 2024-12-31 (the day before the tax year),
--                   1000.00 on 2025-01-01 (its first day), 1250.50 on
--                   2025-12-31 (its last), 800.00 on 2026-01-01 (the day
--                   after), 500.00 on 2025-06-15 then REVERSED (the reversal,
--                   -500.00, is dated T), 300.00 on T-30 (the trailing
--                   window's first day), 999.00 on T-31 (the day before it),
--                   120.25 on T (its last), 77.00 on T+1 (the day after);
--                   and 600.00 on 2025-03-01 stamped with owner B's id, a row
--                   the pre-F2 insert policy let another owner append
--                   (20260726020701): it counts for neither owner.
--     LA2 receipts: 444.00 on 2025-05-05 and 55.00 on T-1, on a soft-deleted
--                   lease: they count for nobody.
--     expenses (A1): 200.25 on 2025-03-10, 50.00 on 2026-01-01, 40.00 on T-3,
--                   66.00 on T+10 (dated in the future: the body before this
--                   one counted it in every trailing window), and 15.00 on
--                   2025-12-31 soft-deleted.
--   Beta House   unit B1 occupied (lease LB1, active; and lease LX, OWNER B's,
--                ended in 2023, on the same unit).
--     LB1 receipts: 750.00 on 2025-02-01, 200.00 on T-5.
--     LX receipt:   222.00 on 2025-08-08 stamped with owner A's id on owner
--                   B's lease: it counts for neither owner.
--     expenses (B1): 100.00 on 2025-12-31, 25.00 on T-30.
--   Delta Lot    no units: no occupancy, no receipts, no expenses.
--   Gamma Flats  INACTIVE property, unit G1 occupied (lease LG1, active),
--                receipts 333.00 on 2025-04-04 and 33.00 on T-2: no row.
--   Bravo Place  OWNER B's, unit Z1 occupied (lease LZ, active), receipt
--                700.00 on 2025-07-01, a 111.00 receipt on 2025-07-02
--                stamped with owner A's id (counts for neither), and an
--                expense of 10.00 on 2025-01-15.

\set ON_ERROR_STOP on
\set QUIET on

begin;

select id as owner_a from auth.users where email = 'e2e-owner-a@tenantflow.app' \gset
select id as owner_b from auth.users where email = 'e2e-owner-b@tenantflow.app' \gset

create temp table replay_performance (label text primary key, payload jsonb not null)
  on commit drop;
grant insert, select on replay_performance to authenticated;

-- The seeded owners have no plan, which allows one property
-- (get_user_plan_limits); this portfolio needs five. Rolled back with the rest.
update public.users set subscription_plan = 'max' where id in (:'owner_a', :'owner_b');

insert into public.properties (id, owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
values
  ('c1000000-0000-4000-8000-00000000a001', :'owner_a', 'Alpha Court', '1 Rent St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('c1000000-0000-4000-8000-00000000a002', :'owner_a', 'Beta House',  '2 Rent St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('c1000000-0000-4000-8000-00000000a003', :'owner_a', 'Delta Lot',   '3 Rent St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('c1000000-0000-4000-8000-00000000a004', :'owner_a', 'Gamma Flats', '4 Rent St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('c1000000-0000-4000-8000-00000000b001', :'owner_b', 'Bravo Place', '5 Rent St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active');

insert into public.units (id, owner_user_id, property_id, unit_number, rent_amount)
values
  ('c2000000-0000-4000-8000-0000000000a1', :'owner_a', 'c1000000-0000-4000-8000-00000000a001', 'A1', 1000),
  ('c2000000-0000-4000-8000-0000000000a2', :'owner_a', 'c1000000-0000-4000-8000-00000000a001', 'A2', 1100),
  ('c2000000-0000-4000-8000-0000000000a3', :'owner_a', 'c1000000-0000-4000-8000-00000000a001', 'A3', 1200),
  ('c2000000-0000-4000-8000-0000000000b1', :'owner_a', 'c1000000-0000-4000-8000-00000000a002', 'B1', 900),
  ('c2000000-0000-4000-8000-0000000000c1', :'owner_a', 'c1000000-0000-4000-8000-00000000a004', 'G1', 800),
  ('c2000000-0000-4000-8000-0000000000d1', :'owner_b', 'c1000000-0000-4000-8000-00000000b001', 'Z1', 700);

insert into public.tenants (id, owner_user_id, first_name, last_name)
values
  ('c3000000-0000-4000-8000-00000000a001', :'owner_a', 'Ana', 'Alpha'),
  ('c3000000-0000-4000-8000-00000000a002', :'owner_a', 'Ben', 'Alpha'),
  ('c3000000-0000-4000-8000-00000000a003', :'owner_a', 'Cal', 'Beta'),
  ('c3000000-0000-4000-8000-00000000a004', :'owner_a', 'Dot', 'Gamma'),
  ('c3000000-0000-4000-8000-00000000b001', :'owner_b', 'Eve', 'Bravo'),
  ('c3000000-0000-4000-8000-00000000b002', :'owner_b', 'Fay', 'Bravo');

insert into public.leases (id, owner_user_id, unit_id, primary_tenant_id, start_date, end_date,
                           rent_amount, security_deposit, lease_status, ledger_start_date)
values
  ('c4000000-0000-4000-8000-0000000000a1', :'owner_a', 'c2000000-0000-4000-8000-0000000000a1',
   'c3000000-0000-4000-8000-00000000a001', '2024-01-01', '2027-12-31', 1000, 1000, 'active', '2024-01-01'),
  ('c4000000-0000-4000-8000-0000000000a2', :'owner_a', 'c2000000-0000-4000-8000-0000000000a2',
   'c3000000-0000-4000-8000-00000000a002', '2024-01-01', '2027-12-31', 1100, 1100, 'inactive', '2024-01-01'),
  ('c4000000-0000-4000-8000-0000000000b1', :'owner_a', 'c2000000-0000-4000-8000-0000000000b1',
   'c3000000-0000-4000-8000-00000000a003', '2024-01-01', '2027-12-31', 900, 900, 'active', '2024-01-01'),
  ('c4000000-0000-4000-8000-0000000000c1', :'owner_a', 'c2000000-0000-4000-8000-0000000000c1',
   'c3000000-0000-4000-8000-00000000a004', '2024-01-01', '2027-12-31', 800, 800, 'active', '2024-01-01'),
  ('c4000000-0000-4000-8000-0000000000d1', :'owner_b', 'c2000000-0000-4000-8000-0000000000d1',
   'c3000000-0000-4000-8000-00000000b001', '2024-01-01', '2027-12-31', 700, 700, 'active', '2024-01-01'),
  ('c4000000-0000-4000-8000-0000000000e1', :'owner_b', 'c2000000-0000-4000-8000-0000000000b1',
   'c3000000-0000-4000-8000-00000000b002', '2023-01-01', '2023-12-31', 900, 900, 'ended', '2023-01-01');

-- The occupancy each property is asserted with, set after the leases so no
-- lease trigger decides it. Gamma is soft-deleted only now, after its lease.
update public.units set status = 'occupied'  where id in ('c2000000-0000-4000-8000-0000000000a1', 'c2000000-0000-4000-8000-0000000000b1', 'c2000000-0000-4000-8000-0000000000c1', 'c2000000-0000-4000-8000-0000000000d1');
update public.units set status = 'available' where id = 'c2000000-0000-4000-8000-0000000000a2';
update public.units set status = 'inactive'  where id = 'c2000000-0000-4000-8000-0000000000a3';
update public.properties set status = 'inactive' where id = 'c1000000-0000-4000-8000-00000000a004';

-- One charge per lease for the receipts to be allocated to.
insert into public.rent_charges (id, lease_id, owner_user_id, type, amount, period_start, due_date, description)
values
  ('c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a', 'rent', 1000.00, '2024-12-01', '2024-12-01', 'Monthly rent'),
  ('c5000000-0000-4000-8000-0000000000a2', 'c4000000-0000-4000-8000-0000000000a2', :'owner_a', 'rent', 1100.00, '2024-12-01', '2024-12-01', 'Monthly rent'),
  ('c5000000-0000-4000-8000-0000000000b1', 'c4000000-0000-4000-8000-0000000000b1', :'owner_a', 'rent',  900.00, '2024-12-01', '2024-12-01', 'Monthly rent'),
  ('c5000000-0000-4000-8000-0000000000c1', 'c4000000-0000-4000-8000-0000000000c1', :'owner_a', 'rent',  800.00, '2024-12-01', '2024-12-01', 'Monthly rent'),
  ('c5000000-0000-4000-8000-0000000000d1', 'c4000000-0000-4000-8000-0000000000d1', :'owner_b', 'rent',  700.00, '2024-12-01', '2024-12-01', 'Monthly rent'),
  ('c5000000-0000-4000-8000-0000000000e1', 'c4000000-0000-4000-8000-0000000000e1', :'owner_b', 'rent',  900.00, '2023-01-01', '2023-01-01', 'Monthly rent');

insert into public.rent_receipts (id, charge_id, lease_id, owner_user_id, amount, method, received_date)
values
  ('c6000000-0000-4000-8000-0000000000a1', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a', 1000.00, 'check', '2024-12-31'),
  ('c6000000-0000-4000-8000-0000000000a2', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a', 1000.00, 'check', '2025-01-01'),
  ('c6000000-0000-4000-8000-0000000000a3', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a', 1250.50, 'check', '2025-12-31'),
  ('c6000000-0000-4000-8000-0000000000a4', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',  800.00, 'check', '2026-01-01'),
  ('c6000000-0000-4000-8000-0000000000a5', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',  500.00, 'check', '2025-06-15'),
  ('c6000000-0000-4000-8000-0000000000a6', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',  300.00, 'check', current_date - 30),
  ('c6000000-0000-4000-8000-0000000000a7', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',  999.00, 'check', current_date - 31),
  ('c6000000-0000-4000-8000-0000000000a8', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',  120.25, 'check', current_date),
  ('c6000000-0000-4000-8000-0000000000a9', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_a',   77.00, 'check', current_date + 1),
  ('c6000000-0000-4000-8000-00000000a0b0', 'c5000000-0000-4000-8000-0000000000a1', 'c4000000-0000-4000-8000-0000000000a1', :'owner_b',  600.00, 'cash',  '2025-03-01'),
  ('c6000000-0000-4000-8000-00000000a201', 'c5000000-0000-4000-8000-0000000000a2', 'c4000000-0000-4000-8000-0000000000a2', :'owner_a',  444.00, 'zelle', '2025-05-05'),
  ('c6000000-0000-4000-8000-00000000a202', 'c5000000-0000-4000-8000-0000000000a2', 'c4000000-0000-4000-8000-0000000000a2', :'owner_a',   55.00, 'zelle', current_date - 1),
  ('c6000000-0000-4000-8000-0000000000b1', 'c5000000-0000-4000-8000-0000000000b1', 'c4000000-0000-4000-8000-0000000000b1', :'owner_a',  750.00, 'check', '2025-02-01'),
  ('c6000000-0000-4000-8000-0000000000b2', 'c5000000-0000-4000-8000-0000000000b1', 'c4000000-0000-4000-8000-0000000000b1', :'owner_a',  200.00, 'check', current_date - 5),
  ('c6000000-0000-4000-8000-0000000000e1', 'c5000000-0000-4000-8000-0000000000e1', 'c4000000-0000-4000-8000-0000000000e1', :'owner_a',  222.00, 'cash',  '2025-08-08'),
  ('c6000000-0000-4000-8000-0000000000c1', 'c5000000-0000-4000-8000-0000000000c1', 'c4000000-0000-4000-8000-0000000000c1', :'owner_a',  333.00, 'check', '2025-04-04'),
  ('c6000000-0000-4000-8000-0000000000c2', 'c5000000-0000-4000-8000-0000000000c1', 'c4000000-0000-4000-8000-0000000000c1', :'owner_a',   33.00, 'check', current_date - 2),
  ('c6000000-0000-4000-8000-0000000000d1', 'c5000000-0000-4000-8000-0000000000d1', 'c4000000-0000-4000-8000-0000000000d1', :'owner_b',  700.00, 'check', '2025-07-01'),
  ('c6000000-0000-4000-8000-0000000000d2', 'c5000000-0000-4000-8000-0000000000d1', 'c4000000-0000-4000-8000-0000000000d1', :'owner_a',  111.00, 'check', '2025-07-02');

insert into public.maintenance_requests (id, owner_user_id, unit_id, tenant_id, title, description)
values
  ('c7000000-0000-4000-8000-0000000000a1', :'owner_a', 'c2000000-0000-4000-8000-0000000000a1', 'c3000000-0000-4000-8000-00000000a001', 'Leak', 'Kitchen leak'),
  ('c7000000-0000-4000-8000-0000000000b1', :'owner_a', 'c2000000-0000-4000-8000-0000000000b1', 'c3000000-0000-4000-8000-00000000a003', 'Heater', 'Water heater'),
  ('c7000000-0000-4000-8000-0000000000d1', :'owner_b', 'c2000000-0000-4000-8000-0000000000d1', 'c3000000-0000-4000-8000-00000000b001', 'Lock', 'Front door lock');

insert into public.expenses (maintenance_request_id, amount, expense_date, vendor_name, status)
values
  ('c7000000-0000-4000-8000-0000000000a1', 200.25, '2025-03-10',        'Plumber',  'active'),
  ('c7000000-0000-4000-8000-0000000000a1',  50.00, '2026-01-01',        'Plumber',  'active'),
  ('c7000000-0000-4000-8000-0000000000a1',  40.00, current_date - 3,    'Plumber',  'active'),
  ('c7000000-0000-4000-8000-0000000000a1',  66.00, current_date + 10,   'Plumber',  'active'),
  ('c7000000-0000-4000-8000-0000000000a1',  15.00, '2025-12-31',        'Plumber',  'inactive'),
  ('c7000000-0000-4000-8000-0000000000b1', 100.00, '2025-12-31',        'Heat Co',  'active'),
  ('c7000000-0000-4000-8000-0000000000b1',  25.00, current_date - 30,   'Heat Co',  'active'),
  ('c7000000-0000-4000-8000-0000000000d1',  10.00, '2025-01-15',        'Lock Co',  'active');

-- From here on, act as the owner, exactly as PostgREST would for the app.
select set_config('replay.owner_a', :'owner_a', true) as ignored \gset
select set_config('replay.owner_b', :'owner_b', true) as ignored \gset
select set_config('request.jwt.claims', json_build_object('sub', :'owner_a', 'role', 'authenticated')::text, true) as ignored \gset
set local role authenticated;

do $$
begin
  perform public.reverse_receipt('c6000000-0000-4000-8000-0000000000a5');
end
$$;

-- Each call's rows, in the function's own order (by name), as JSON.
insert into replay_performance values
  ('today', to_jsonb(to_char(current_date, 'YYYY-MM-DD'))),
  ('owner_a_tax_2025', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_a')::uuid, null, '2025-01-01..2025-12-31', null) r)),
  ('owner_a_30d', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_a')::uuid, null, '30d', null) r)),
  ('owner_a_beta_2025', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_a')::uuid, 'c1000000-0000-4000-8000-00000000a002', '2025-01-01..2025-12-31', null) r)),
  ('owner_a_limit_1', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_a')::uuid, null, '2025-01-01..2025-12-31', 1) r)),
  -- As the property performance page called it before this PR: no window.
  ('owner_a_default', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_a')::uuid) r));

-- A range that starts after it ends is refused, never read as 30 days.
do $$
declare
  v_state text := null;
begin
  begin
    perform public.get_property_performance_analytics(current_setting('replay.owner_a')::uuid, null, '2025-12-31..2025-01-01', null);
  exception when others then
    v_state := sqlstate;
  end;
  -- JSON null when nothing was raised (to_jsonb of a NULL is SQL NULL).
  insert into replay_performance values ('backwards_range_sqlstate', coalesce(to_jsonb(v_state), 'null'::jsonb));
end
$$;

-- The guard, kept as written: owner A asking for owner B's figures is refused.
do $$
declare
  v_refused boolean := false;
begin
  begin
    perform public.get_property_performance_analytics(current_setting('replay.owner_b')::uuid);
  exception when others then
    v_refused := sqlerrm like 'Access denied%';
  end;
  insert into replay_performance values ('guard_refuses_another_owner', to_jsonb(v_refused));
end
$$;

select set_config('request.jwt.claims', json_build_object('sub', :'owner_b', 'role', 'authenticated')::text, true) as ignored \gset
insert into replay_performance values
  ('owner_b_tax_2025', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.get_property_performance_analytics(
     current_setting('replay.owner_b')::uuid, null, '2025-01-01..2025-12-31', null) r));

reset role;

insert into replay_performance values
  ('execute', jsonb_build_object(
    'anon', has_function_privilege('anon', 'public.get_property_performance_analytics(uuid,uuid,text,integer)', 'execute'),
    'authenticated', has_function_privilege('authenticated', 'public.get_property_performance_analytics(uuid,uuid,text,integer)', 'execute'),
    'service_role', has_function_privilege('service_role', 'public.get_property_performance_analytics(uuid,uuid,text,integer)', 'execute')));

select jsonb_object_agg(label, payload)::text from replay_performance;

rollback;
