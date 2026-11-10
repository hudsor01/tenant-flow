-- Fixture for the migration-replay gate's owner-figures assertion: the
-- figures get_dashboard_stats, get_dashboard_data_v2, get_expense_summary,
-- get_maintenance_analytics and get_financial_overview returned as literals
-- before 20261110123118..20261110123124, and the occupancy series
-- get_occupancy_trends_optimized counts by the helper's rule
-- (20261110123126).
--
-- Run by .github/workflows/migration-replay.yml after the test cast is seeded,
-- against the replayed EMPTY database only:
--
--   docker exec -i supabase_db_tenant-flow psql -U postgres -X -q -t -A \
--     -v ON_ERROR_STOP=1 < scripts/migration-replay-owner-figures.sql
--
-- It seeds properties, units, leases, maintenance requests and expenses for
-- e2e-owner-a, e2e-owner-b and e2e-admin (here a third owner, C), calls each
-- function the way the app does (as the authenticated owner), prints ONE line
-- of JSON, and rolls everything back. scripts/migration-replay-assertions.ts
-- (assertOwnerFiguresComputed) holds the expected figures and the arithmetic
-- behind each; keep the two in step.
--
-- Every amount is dollars. T below is the day the gate runs (current_date),
-- M0 the first day of T's month. T is never earlier than 2026-11-02 (the day
-- this was written). Every function is owner-scoped, so only owner B's own
-- rows reach owner B's figures, and of the dates this sets for owner B only
-- LB1's (from T-3) and its requests RB1's (created on T) and RB2's (on T-40)
-- are relative to T: all after 2025, and none an expense's, so owner B's
-- calls over fixed dates (2024, 2025, and its expenses from 2025-03-01 on)
-- see only its fixed dates. Other owners' rows dated relative to T can fall
-- in 2025 (L11 from T-500, owner C's expense on January 1 of the year before
-- T's) and reach only their own owner's figures. The fixture prints T as
-- `today`, from which the assertion computes every window and month it
-- expects.
--
-- OWNER A, North Court (units N1..N4, and N5 inactive) and South House
-- (INACTIVE property, unit S1):
--   leases  L1 N1 active             T-400 .. T+300  1000
--           L2 N2 ended              T-400 .. T-10    800
--           L3 N3 active             T-5   .. T+360  1200
--           L4 N4 pending_signature  T-60  .. T+300   999  (never running)
--           L5 N3 terminated         T-100 .. T-1     555  (ended early on
--                                                          T-1 by Terminate:
--                                                          it counts on the
--                                                          days it ran)
--           L6 N4 expired            T-200 .. T-20    600
--           L8 S1 active             T-400 .. T+300  5000  (inactive property)
--           L9 N2 inactive           T-400 .. T+300  4444  (soft-deleted)
--          L10 N3 ended              T-30  .. T-29    300  (starts on T-30; Ann's)
--          L11 N2 ended              T-500 .. T-30     50  (ends on T-30)
--          L12 N1 ended              T-2   .. T       250  (ends on T; Bea's)
--          L13 N2 expired            T     .. T        20  (starts on T; Di's)
--          L14 N5 expired            T-400 .. T         7  (on N5, soft-deleted
--                                                          after it: never
--                                                          counted)
--          L15 N4 ended              T-300 .. T-250   450  (months ago: in the
--                                                          occupancy series
--                                                          only)
--   so on T the running leases are L1, L3, L12 and L13 (units N1, N2 and N3,
--   3 of 4; 2470 of rent; tenants Ann, Bea, Cy and Di: two on N1) and on
--   T-30 L1, L2, L5, L6, L10 and L11 (all 4 units; 3305; Ann, Bea and Di: Ann
--   on two units, Di on two). L13 is its unit's only lease on T, so the
--   occupancy moves a day either side of it; L10, L11 and L12 share a unit
--   with another lease on their day (L5, L2 and L1), so they move only the
--   rent.
--   maintenance requests on N1:
--           R1 completed    created M0-2mo+1d, completed M0-2mo+3d (48 h)
--           R2 completed    created M0-1mo 10:00, completed M0 00:00 (the
--                           first instant of T's month)
--           R3 open         created M0-3mo
--           R4 cancelled    created M0-5mo
--           R5 in_progress  created M0-13mo
--           R6 completed    created M0-4mo, no completed_at
--           R7 completed    created M0-3mo+2d 10:00, completed M0-1mo 00:00
--                           (the first instant of that month)
--           R8 open         created M0-4mo, completed_at M0-2mo+10d (reopened)
--   (R1's completion is at 10:20, 48 h 20 min after its creation.)
--   expenses: R1 200.00 (Plumber) on M0-2mo, 50.50 (Plumber) on M0-2mo+5d,
--             15.00 (Plumber) on M0-2mo SOFT-DELETED; R2 100.00 (Heat Co) and
--             10.00 (Plumber) on M0-1mo; R3 30.00 (no vendor) on M0 and 77.00
--             (Plumber) on T+40 and 5.00 (Plumber) on T+1 when that is still in
--             T's month (both dated in the future); R5 400.00 (Roof Co) on
--             M0-12mo (before the 12-month series).
--   and a request RX on N1 that owner C's id is on (a row the app never
--   writes), with an expense of 9.00 on T+200, a day L1 and L3 run: no
--   lease's of owner A's. And LXC, a lease of OWNER C's on N1 (likewise),
--   ended, M0-2mo-5d .. M0-1mo, rent 0, Ann's: it runs on the days of R1's
--   and R2's expenses and starts after L1, and no expense of owner A's is
--   its (it changes no occupancy, rent or tenant count: N1 and Ann are
--   counted then anyway).
--   rent receipts: L1 1000.00 on M0-2mo+2d, 1000.00 on M0-1mo+2d and
--             1000.00 on M0; L2 800.00 on M0-2mo+3d; L8 (South House,
--             soft-deleted property) 5000.00 on M0-2mo+4d; L9 (soft-deleted
--             lease) 4444.00 on M0-2mo+3d.
-- OWNER B, West Place (unit W1): lease LB1 active T-3 .. T+360, 700 (nothing
--   ran 30 days ago), and two leases of 2025, both ended: LB2 2025-01-01 ..
--   2025-06-30 (Flo) and LB3 2025-06-01 .. 2025-06-30 (Hal; both ran in
--   June, and neither on 2025-07-01), and LB9 2025-06-15 .. 2025-06-30,
--   soft-deleted: no expense is its. Receipts: LB2 700.00 on 2025-02-01;
--   LB3 640.00 on 2025-07-05, 100.00 on 2025-08-01 and its reversal,
--   -100.00, on 2025-08-02. Request
--   RB2 on hold, created T-40 (not completed or cancelled: open now and 30
--   days ago), and request
--   RB1 with expenses 7.00 on 2024-02-29, 80.00 on
--   2024-03-01, 30.00 on 2024-04-10 SOFT-DELETED, 40.00 on 2024-06-30, 9.00
--   on 2024-07-01, 100.00 on 2025-03-01, 25.00 on 2025-04-10 SOFT-DELETED,
--   50.00 on 2025-06-30 and 999.00 on 2025-07-01.
-- OWNER C (e2e-admin), East Lot (units E1, E2, E3): lease LC1 on E1 active
--   T-7 .. T+300, 500 (1 of 3 units today, none 30 days ago); request RC1
--   with expenses 300.00 on January 1 of T's year, 20.00 on T, 66.00 on T+5
--   (in the future), 200.00 on January 1 of the year before and 40.00 on T a
--   year earlier, and four more on January 1 of T's year: 12.00 with an empty
--   vendor, 3.00 with none (NULL), 2.50 with a vendor of spaces, and 20.00
--   from a vendor the owner named "Other" (the three with no vendor are one
--   category, never the vendor "Other"'s).
-- NOBODY: an owner id with no rows at all, as the helper and the service role
--   see it.

\set ON_ERROR_STOP on
\set QUIET on

begin;

select id as owner_a from auth.users where email = 'e2e-owner-a@tenantflow.app' \gset
select id as owner_b from auth.users where email = 'e2e-owner-b@tenantflow.app' \gset
select id as owner_c from auth.users where email = 'e2e-admin@tenantflow.app' \gset

create temp table replay_figures (label text primary key, payload jsonb not null)
  on commit drop;
grant insert, select on replay_figures to authenticated;

-- The seeded owners have no plan, which allows one property
-- (get_user_plan_limits); owner A needs two. Rolled back with the rest.
update public.users set subscription_plan = 'max' where id in (:'owner_a', :'owner_b', :'owner_c');

insert into public.properties (id, owner_user_id, name, address_line1, city, state, postal_code, property_type, status)
values
  ('d1000000-0000-4000-8000-00000000a001', :'owner_a', 'North Court', '1 Trend St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('d1000000-0000-4000-8000-00000000a002', :'owner_a', 'South House', '2 Trend St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('d1000000-0000-4000-8000-00000000b001', :'owner_b', 'West Place',  '3 Trend St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active'),
  ('d1000000-0000-4000-8000-00000000c001', :'owner_c', 'East Lot',    '4 Trend St', 'Austin', 'TX', '78701', 'SINGLE_FAMILY', 'active');

insert into public.units (id, owner_user_id, property_id, unit_number, rent_amount)
values
  ('d2000000-0000-4000-8000-0000000000a1', :'owner_a', 'd1000000-0000-4000-8000-00000000a001', 'N1', 1000),
  ('d2000000-0000-4000-8000-0000000000a2', :'owner_a', 'd1000000-0000-4000-8000-00000000a001', 'N2', 800),
  ('d2000000-0000-4000-8000-0000000000a3', :'owner_a', 'd1000000-0000-4000-8000-00000000a001', 'N3', 1200),
  ('d2000000-0000-4000-8000-0000000000a4', :'owner_a', 'd1000000-0000-4000-8000-00000000a001', 'N4', 600),
  ('d2000000-0000-4000-8000-0000000000a5', :'owner_a', 'd1000000-0000-4000-8000-00000000a001', 'N5', 900),
  ('d2000000-0000-4000-8000-0000000000a6', :'owner_a', 'd1000000-0000-4000-8000-00000000a002', 'S1', 5000),
  ('d2000000-0000-4000-8000-0000000000b1', :'owner_b', 'd1000000-0000-4000-8000-00000000b001', 'W1', 700),
  ('d2000000-0000-4000-8000-0000000000c1', :'owner_c', 'd1000000-0000-4000-8000-00000000c001', 'E1', 500),
  ('d2000000-0000-4000-8000-0000000000c2', :'owner_c', 'd1000000-0000-4000-8000-00000000c001', 'E2', 500),
  ('d2000000-0000-4000-8000-0000000000c3', :'owner_c', 'd1000000-0000-4000-8000-00000000c001', 'E3', 500);

insert into public.tenants (id, owner_user_id, first_name, last_name)
values
  ('d3000000-0000-4000-8000-00000000a001', :'owner_a', 'Ann', 'North'),
  ('d3000000-0000-4000-8000-00000000a002', :'owner_a', 'Bea', 'North'),
  ('d3000000-0000-4000-8000-00000000a003', :'owner_a', 'Cy',  'North'),
  ('d3000000-0000-4000-8000-00000000a004', :'owner_a', 'Di',  'North'),
  ('d3000000-0000-4000-8000-00000000a005', :'owner_a', 'Ed',  'South'),
  ('d3000000-0000-4000-8000-00000000b001', :'owner_b', 'Flo', 'West'),
  ('d3000000-0000-4000-8000-00000000b002', :'owner_b', 'Hal', 'West'),
  ('d3000000-0000-4000-8000-00000000c001', :'owner_c', 'Gus', 'East');

insert into public.leases (id, owner_user_id, unit_id, primary_tenant_id, start_date, end_date,
                           rent_amount, security_deposit, lease_status)
values
  ('d4000000-0000-4000-8000-0000000000a1', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1',
   'd3000000-0000-4000-8000-00000000a001', current_date - 400, current_date + 300, 1000, 1000, 'active'),
  ('d4000000-0000-4000-8000-0000000000a2', :'owner_a', 'd2000000-0000-4000-8000-0000000000a2',
   'd3000000-0000-4000-8000-00000000a002', current_date - 400, current_date - 10, 800, 800, 'ended'),
  ('d4000000-0000-4000-8000-0000000000a3', :'owner_a', 'd2000000-0000-4000-8000-0000000000a3',
   'd3000000-0000-4000-8000-00000000a003', current_date - 5, current_date + 360, 1200, 1200, 'active'),
  ('d4000000-0000-4000-8000-0000000000a4', :'owner_a', 'd2000000-0000-4000-8000-0000000000a4',
   'd3000000-0000-4000-8000-00000000a004', current_date - 60, current_date + 300, 999, 999, 'pending_signature'),
  ('d4000000-0000-4000-8000-0000000000a5', :'owner_a', 'd2000000-0000-4000-8000-0000000000a3',
   'd3000000-0000-4000-8000-00000000a004', current_date - 100, current_date - 1, 555, 555, 'terminated'),
  ('d4000000-0000-4000-8000-0000000000a6', :'owner_a', 'd2000000-0000-4000-8000-0000000000a4',
   'd3000000-0000-4000-8000-00000000a004', current_date - 200, current_date - 20, 600, 600, 'expired'),
  ('d4000000-0000-4000-8000-0000000000a8', :'owner_a', 'd2000000-0000-4000-8000-0000000000a6',
   'd3000000-0000-4000-8000-00000000a005', current_date - 400, current_date + 300, 5000, 5000, 'active'),
  ('d4000000-0000-4000-8000-0000000000a9', :'owner_a', 'd2000000-0000-4000-8000-0000000000a2',
   'd3000000-0000-4000-8000-00000000a002', current_date - 400, current_date + 300, 4444, 4444, 'inactive'),
  ('d4000000-0000-4000-8000-00000000a010', :'owner_a', 'd2000000-0000-4000-8000-0000000000a3',
   'd3000000-0000-4000-8000-00000000a001', current_date - 30, current_date - 29, 300, 300, 'ended'),
  ('d4000000-0000-4000-8000-00000000a011', :'owner_a', 'd2000000-0000-4000-8000-0000000000a2',
   'd3000000-0000-4000-8000-00000000a002', current_date - 500, current_date - 30, 50, 50, 'ended'),
  ('d4000000-0000-4000-8000-00000000a012', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1',
   'd3000000-0000-4000-8000-00000000a002', current_date - 2, current_date, 250, 250, 'ended'),
  ('d4000000-0000-4000-8000-00000000a013', :'owner_a', 'd2000000-0000-4000-8000-0000000000a2',
   'd3000000-0000-4000-8000-00000000a004', current_date, current_date, 20, 20, 'expired'),
  ('d4000000-0000-4000-8000-00000000a014', :'owner_a', 'd2000000-0000-4000-8000-0000000000a5',
   'd3000000-0000-4000-8000-00000000a004', current_date - 400, current_date, 7, 7, 'expired'),
  ('d4000000-0000-4000-8000-00000000a015', :'owner_a', 'd2000000-0000-4000-8000-0000000000a4',
   'd3000000-0000-4000-8000-00000000a004', current_date - 300, current_date - 250, 450, 450, 'ended'),
  ('d4000000-0000-4000-8000-0000000000c9', :'owner_c', 'd2000000-0000-4000-8000-0000000000a1',
   'd3000000-0000-4000-8000-00000000a001', (date_trunc('month', current_date) - interval '2 months' - interval '5 days')::date,
   (date_trunc('month', current_date) - interval '1 month')::date, 0, 0, 'ended'),
  ('d4000000-0000-4000-8000-0000000000b1', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1',
   'd3000000-0000-4000-8000-00000000b001', current_date - 3, current_date + 360, 700, 700, 'active'),
  ('d4000000-0000-4000-8000-0000000000b2', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1',
   'd3000000-0000-4000-8000-00000000b001', '2025-01-01', '2025-06-30', 700, 700, 'ended'),
  ('d4000000-0000-4000-8000-0000000000b3', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1',
   'd3000000-0000-4000-8000-00000000b002', '2025-06-01', '2025-06-30', 650, 650, 'ended'),
  ('d4000000-0000-4000-8000-0000000000b9', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1',
   'd3000000-0000-4000-8000-00000000b001', '2025-06-15', '2025-06-30', 650, 650, 'inactive'),
  ('d4000000-0000-4000-8000-0000000000c1', :'owner_c', 'd2000000-0000-4000-8000-0000000000c1',
   'd3000000-0000-4000-8000-00000000c001', current_date - 7, current_date + 300, 500, 500, 'active');

-- The stored occupancy, set after the leases so no lease trigger decides it;
-- South House and N5 are soft-deleted only now, after their leases.
update public.units set status = 'occupied'  where id in ('d2000000-0000-4000-8000-0000000000a1', 'd2000000-0000-4000-8000-0000000000a3', 'd2000000-0000-4000-8000-0000000000a6', 'd2000000-0000-4000-8000-0000000000b1', 'd2000000-0000-4000-8000-0000000000c1');
update public.units set status = 'available' where id in ('d2000000-0000-4000-8000-0000000000a2', 'd2000000-0000-4000-8000-0000000000a4', 'd2000000-0000-4000-8000-0000000000c2', 'd2000000-0000-4000-8000-0000000000c3');
update public.units set status = 'inactive'  where id = 'd2000000-0000-4000-8000-0000000000a5';
update public.properties set status = 'inactive' where id = 'd1000000-0000-4000-8000-00000000a002';

insert into public.maintenance_requests (id, owner_user_id, unit_id, tenant_id, title, description, status, created_at, completed_at)
values
  ('d7000000-0000-4000-8000-0000000000a1', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Leak', 'Kitchen leak', 'completed',
   date_trunc('month', current_date) - interval '2 months' + interval '1 day 10 hours',
   date_trunc('month', current_date) - interval '2 months' + interval '3 days 10 hours 20 minutes'),
  ('d7000000-0000-4000-8000-0000000000a2', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Heater', 'Water heater', 'completed',
   date_trunc('month', current_date) - interval '1 month' + interval '10 hours',
   date_trunc('month', current_date)),
  ('d7000000-0000-4000-8000-0000000000a3', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Lock', 'Front door lock', 'open',
   date_trunc('month', current_date) - interval '3 months' + interval '10 hours', null),
  ('d7000000-0000-4000-8000-0000000000a4', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Paint', 'Hallway paint', 'cancelled',
   date_trunc('month', current_date) - interval '5 months' + interval '10 hours', null),
  ('d7000000-0000-4000-8000-0000000000a5', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Roof', 'Roof repair', 'in_progress',
   date_trunc('month', current_date) - interval '13 months' + interval '10 hours', null),
  ('d7000000-0000-4000-8000-0000000000a6', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Fence', 'Fence post', 'completed',
   date_trunc('month', current_date) - interval '4 months' + interval '10 hours', null),
  ('d7000000-0000-4000-8000-0000000000a7', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Window', 'Window seal', 'completed',
   date_trunc('month', current_date) - interval '3 months' + interval '2 days 10 hours',
   date_trunc('month', current_date) - interval '1 month'),
  ('d7000000-0000-4000-8000-0000000000a8', :'owner_a', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000a001', 'Step', 'Porch step', 'open',
   date_trunc('month', current_date) - interval '4 months' + interval '10 hours',
   date_trunc('month', current_date) - interval '2 months' + interval '10 days 10 hours'),
  ('d7000000-0000-4000-8000-0000000000b1', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1', 'd3000000-0000-4000-8000-00000000b001', 'Gate', 'Gate hinge', 'open', now(), null),
  ('d7000000-0000-4000-8000-0000000000b2', :'owner_b', 'd2000000-0000-4000-8000-0000000000b1', 'd3000000-0000-4000-8000-00000000b001', 'Fence', 'Fence panel', 'on_hold', now() - interval '40 days', null),
  ('d7000000-0000-4000-8000-0000000000c1', :'owner_c', 'd2000000-0000-4000-8000-0000000000c1', 'd3000000-0000-4000-8000-00000000c001', 'Porch', 'Porch step', 'open', now(), null),
  ('d7000000-0000-4000-8000-0000000000c9', :'owner_c', 'd2000000-0000-4000-8000-0000000000a1', 'd3000000-0000-4000-8000-00000000c001', 'Cross', 'Another owner''s request', 'open', now(), null);

insert into public.expenses (maintenance_request_id, amount, expense_date, vendor_name, status)
values
  ('d7000000-0000-4000-8000-0000000000a1', 200.00, (date_trunc('month', current_date) - interval '2 months')::date, 'Plumber', 'active'),
  ('d7000000-0000-4000-8000-0000000000a1',  50.50, (date_trunc('month', current_date) - interval '2 months' + interval '5 days')::date, 'Plumber', 'active'),
  ('d7000000-0000-4000-8000-0000000000a1',  15.00, (date_trunc('month', current_date) - interval '2 months')::date, 'Plumber', 'inactive'),
  ('d7000000-0000-4000-8000-0000000000a2', 100.00, (date_trunc('month', current_date) - interval '1 month')::date, 'Heat Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000a2',  10.00, (date_trunc('month', current_date) - interval '1 month')::date, 'Plumber', 'active'),
  ('d7000000-0000-4000-8000-0000000000a3',  30.00, date_trunc('month', current_date)::date, '', 'active'),
  ('d7000000-0000-4000-8000-0000000000a3',  77.00, current_date + 40, 'Plumber', 'active'),
  ('d7000000-0000-4000-8000-0000000000a5', 400.00, (date_trunc('month', current_date) - interval '12 months')::date, 'Roof Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1',   7.00, '2024-02-29', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1',  80.00, '2024-03-01', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1',  30.00, '2024-04-10', 'Gate Co', 'inactive'),
  ('d7000000-0000-4000-8000-0000000000b1',  40.00, '2024-06-30', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1',   9.00, '2024-07-01', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1', 100.00, '2025-03-01', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1',  25.00, '2025-04-10', 'Gate Co', 'inactive'),
  ('d7000000-0000-4000-8000-0000000000b1',  50.00, '2025-06-30', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000b1', 999.00, '2025-07-01', 'Gate Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1', 300.00, date_trunc('year', current_date)::date, 'Porch Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',  20.00, current_date, 'Porch Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',  66.00, current_date + 5, 'Porch Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1', 200.00, (date_trunc('year', current_date) - interval '1 year')::date, 'Porch Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',  40.00, (current_date - interval '1 year')::date, 'Porch Co', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',  12.00, date_trunc('year', current_date)::date, '', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',   3.00, date_trunc('year', current_date)::date, null, 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',   2.50, date_trunc('year', current_date)::date, '   ', 'active'),
  ('d7000000-0000-4000-8000-0000000000c1',  20.00, date_trunc('year', current_date)::date, 'Other', 'active'),
  ('d7000000-0000-4000-8000-0000000000c9',   9.00, current_date + 200, 'Cross Co', 'active');

-- The rent ledger the lease profitability reads: one charge per lease, and
-- the receipts the header lists.
insert into public.rent_charges (id, lease_id, owner_user_id, type, amount, period_start, due_date, description)
values
  ('d5000000-0000-4000-8000-0000000000a1', 'd4000000-0000-4000-8000-0000000000a1', :'owner_a', 'rent', 1000.00, current_date - 400, current_date - 400, 'Monthly rent'),
  ('d5000000-0000-4000-8000-0000000000a2', 'd4000000-0000-4000-8000-0000000000a2', :'owner_a', 'rent',  800.00, current_date - 400, current_date - 400, 'Monthly rent'),
  ('d5000000-0000-4000-8000-0000000000a8', 'd4000000-0000-4000-8000-0000000000a8', :'owner_a', 'rent', 5000.00, current_date - 400, current_date - 400, 'Monthly rent'),
  ('d5000000-0000-4000-8000-0000000000a9', 'd4000000-0000-4000-8000-0000000000a9', :'owner_a', 'rent', 4444.00, current_date - 400, current_date - 400, 'Monthly rent'),
  ('d5000000-0000-4000-8000-0000000000b2', 'd4000000-0000-4000-8000-0000000000b2', :'owner_b', 'rent',  700.00, '2025-01-01', '2025-01-01', 'Monthly rent'),
  ('d5000000-0000-4000-8000-0000000000b3', 'd4000000-0000-4000-8000-0000000000b3', :'owner_b', 'rent',  650.00, '2025-06-01', '2025-06-01', 'Monthly rent');
insert into public.rent_receipts (id, charge_id, lease_id, owner_user_id, amount, method, received_date)
values
  ('d6000000-0000-4000-8000-0000000000a1', 'd5000000-0000-4000-8000-0000000000a1', 'd4000000-0000-4000-8000-0000000000a1', :'owner_a', 1000.00, 'check', (date_trunc('month', current_date) - interval '2 months' + interval '2 days')::date),
  ('d6000000-0000-4000-8000-0000000000a2', 'd5000000-0000-4000-8000-0000000000a1', 'd4000000-0000-4000-8000-0000000000a1', :'owner_a', 1000.00, 'check', (date_trunc('month', current_date) - interval '1 month' + interval '2 days')::date),
  ('d6000000-0000-4000-8000-0000000000a3', 'd5000000-0000-4000-8000-0000000000a1', 'd4000000-0000-4000-8000-0000000000a1', :'owner_a', 1000.00, 'check', date_trunc('month', current_date)::date),
  ('d6000000-0000-4000-8000-0000000000a4', 'd5000000-0000-4000-8000-0000000000a2', 'd4000000-0000-4000-8000-0000000000a2', :'owner_a',  800.00, 'check', (date_trunc('month', current_date) - interval '2 months' + interval '3 days')::date),
  ('d6000000-0000-4000-8000-0000000000a8', 'd5000000-0000-4000-8000-0000000000a8', 'd4000000-0000-4000-8000-0000000000a8', :'owner_a', 5000.00, 'check', (date_trunc('month', current_date) - interval '2 months' + interval '4 days')::date),
  ('d6000000-0000-4000-8000-0000000000a9', 'd5000000-0000-4000-8000-0000000000a9', 'd4000000-0000-4000-8000-0000000000a9', :'owner_a', 4444.00, 'check', (date_trunc('month', current_date) - interval '2 months' + interval '3 days')::date),
  ('d6000000-0000-4000-8000-0000000000b2', 'd5000000-0000-4000-8000-0000000000b2', 'd4000000-0000-4000-8000-0000000000b2', :'owner_b',  700.00, 'check', '2025-02-01'),
  ('d6000000-0000-4000-8000-0000000000b3', 'd5000000-0000-4000-8000-0000000000b3', 'd4000000-0000-4000-8000-0000000000b3', :'owner_b',  640.00, 'check', '2025-07-05'),
  ('d6000000-0000-4000-8000-0000000000b4', 'd5000000-0000-4000-8000-0000000000b3', 'd4000000-0000-4000-8000-0000000000b3', :'owner_b',  100.00, 'check', '2025-08-01');
insert into public.rent_receipts (id, charge_id, lease_id, owner_user_id, amount, method, received_date, reverses_id)
values
  ('d6000000-0000-4000-8000-0000000000b5', 'd5000000-0000-4000-8000-0000000000b3', 'd4000000-0000-4000-8000-0000000000b3', :'owner_b', -100.00, 'check', '2025-08-02',
   'd6000000-0000-4000-8000-0000000000b4');

-- Spend dated tomorrow, while tomorrow is still in this month (on a month's
-- last day there is no such day): spent in no month yet.
insert into public.expenses (maintenance_request_id, amount, expense_date, vendor_name, status)
select 'd7000000-0000-4000-8000-0000000000a3', 5.00, current_date + 1, 'Plumber', 'active'
where current_date + 1 < date_trunc('month', current_date) + interval '1 month';

-- The helper, as its SECURITY DEFINER callers run it (as postgres).
insert into replay_figures values
  ('today', to_jsonb(to_char(current_date, 'YYYY-MM-DD'))),
  ('position_a_today', (select to_jsonb(r) from public.dashboard_lease_position(:'owner_a', current_date) r)),
  ('position_a_then', (select to_jsonb(r) from public.dashboard_lease_position(:'owner_a', current_date - 30) r)),
  ('position_nobody', (select to_jsonb(r) from public.dashboard_lease_position('d0000000-0000-4000-8000-000000000999', current_date) r)),
  -- On the first day of each of the occupancy series' past months (n months
  -- before T), for the series and the tile to be compared.
  ('position_a_months', (select jsonb_agg(jsonb_build_object('months_ago', n, 'occupancy_rate', r.occupancy_rate) order by n)
     from generate_series(1, 11) n,
     lateral public.dashboard_lease_position(:'owner_a', (current_date - (n || ' months')::interval)::date) r));

-- From here on, act as each owner, exactly as PostgREST would for the app.
select set_config('replay.owner_a', :'owner_a', true) as ignored \gset
select set_config('replay.owner_b', :'owner_b', true) as ignored \gset
select set_config('replay.owner_c', :'owner_c', true) as ignored \gset
select set_config('request.jwt.claims', json_build_object('sub', :'owner_a', 'role', 'authenticated')::text, true) as ignored \gset
set local role authenticated;

-- The dashboard payloads, cut to the keys the assertion reads (owner A's with
-- its 30-day and 6-month series, the sparklines' and the charts').
insert into replay_figures
select 'dashboard_stats_a', jsonb_build_object('units', s->'units', 'revenue', s->'revenue',
  'maintenance_open', s->'maintenance'->'open')
from (select public.get_dashboard_stats(current_setting('replay.owner_a')::uuid)::jsonb as s) x;
insert into replay_figures
select 'dashboard_v2_a', jsonb_build_object('units', d->'stats'->'units', 'revenue', d->'stats'->'revenue',
  'trend_occupancy', d->'trends'->'occupancy_rate', 'trend_revenue', d->'trends'->'monthly_revenue',
  'trend_tenants', d->'trends'->'active_tenants', 'trend_maintenance', d->'trends'->'open_maintenance',
  'maintenance_open', d->'stats'->'maintenance'->'open',
  'property_open_maintenance', (select jsonb_object_agg(pp->>'property_name', pp->'open_maintenance')
                                from jsonb_array_elements(d->'property_performance') pp),
  'time_series', d->'time_series')
from (select public.get_dashboard_data_v2(current_setting('replay.owner_a')::uuid) as d) x;
-- The occupancy chart's series, as the app asks for it.
insert into replay_figures values
  ('occupancy_series_a', public.get_occupancy_trends_optimized(current_setting('replay.owner_a')::uuid, 12));
-- The function payloads less the keys this gate does not assert, removed by
-- name so a key the body does not return stays absent (the markers are keys).
insert into replay_figures values
  ('maintenance_a', public.get_maintenance_analytics(current_setting('replay.owner_a')::uuid)
     - array['by_status', 'by_priority', 'priorityBreakdown', 'avgResolutionTime', 'completionRate',
             'avg_resolution_hours', 'open_requests', 'total_requests']),
  ('overview_a_window', public.get_financial_overview(current_setting('replay.owner_a')::uuid,
     (date_trunc('month', current_date) - interval '2 months')::date,
     (date_trunc('month', current_date) - interval '1 month' + interval '5 days')::date)),
  ('overview_a_open_end', public.get_financial_overview(current_setting('replay.owner_a')::uuid,
     date_trunc('month', current_date)::date)),
  ('overview_a_future', public.get_financial_overview(current_setting('replay.owner_a')::uuid,
     current_date + 199, current_date + 201) - 'overview');

-- The guard, kept as written in every function: owner A asking for owner B's
-- figures is refused.
do $$
declare
  v_owner_b uuid := current_setting('replay.owner_b')::uuid;
  v_refused jsonb := '{}'::jsonb;
  v_name text;
begin
  foreach v_name in array array['get_dashboard_stats', 'get_dashboard_data_v2', 'get_expense_summary',
                                'get_maintenance_analytics', 'get_financial_overview',
                                'get_occupancy_trends_optimized'] loop
    begin
      execute format('select public.%I($1)', v_name) using v_owner_b;
      v_refused := v_refused || jsonb_build_object(v_name, false);
    exception when others then
      v_refused := v_refused || jsonb_build_object(v_name, sqlerrm like 'Access denied%');
    end;
  end loop;
  insert into replay_figures values ('guard_refuses_another_owner', v_refused);
end
$$;

select set_config('request.jwt.claims', json_build_object('sub', :'owner_b', 'role', 'authenticated')::text, true) as ignored \gset
insert into replay_figures
select 'dashboard_stats_b', jsonb_build_object('units', s->'units', 'revenue', s->'revenue',
  'maintenance_open', s->'maintenance'->'open')
from (select public.get_dashboard_stats(current_setting('replay.owner_b')::uuid)::jsonb as s) x;
insert into replay_figures
select 'dashboard_v2_b', jsonb_build_object('units', d->'stats'->'units', 'revenue', d->'stats'->'revenue',
  'trend_occupancy', d->'trends'->'occupancy_rate', 'trend_revenue', d->'trends'->'monthly_revenue',
  'trend_tenants', d->'trends'->'active_tenants', 'trend_maintenance', d->'trends'->'open_maintenance',
  'maintenance_open', d->'stats'->'maintenance'->'open',
  'property_open_maintenance', (select jsonb_object_agg(pp->>'property_name', pp->'open_maintenance')
                                from jsonb_array_elements(d->'property_performance') pp))
from (select public.get_dashboard_data_v2(current_setting('replay.owner_b')::uuid) as d) x;
insert into replay_figures values
  ('expenses_b_spring_2025', public.get_expense_summary(current_setting('replay.owner_b')::uuid, '2025-03-01', '2025-06-30')
     - array['monthly_totals', 'monthly_average']),
  ('expenses_b_leap_day', public.get_expense_summary(current_setting('replay.owner_b')::uuid, '2024-02-29', '2024-02-29')
     - array['monthly_totals', 'monthly_average']),
  -- As the balance sheet asks: every expense before a date.
  ('expenses_b_unbounded', public.get_expense_summary(current_setting('replay.owner_b')::uuid, '-infinity', '2025-06-30')
     - array['monthly_totals', 'monthly_average']),
  ('expenses_b_open_ended', public.get_expense_summary(current_setting('replay.owner_b')::uuid, '2025-03-01', 'infinity')
     - array['monthly_totals', 'monthly_average']),
  -- The lease profitability over a year and over a spring (two leases ran in
  -- June; the March expense is on one alone).
  ('overview_b_2025', public.get_financial_overview(current_setting('replay.owner_b')::uuid, '2025-01-01', '2025-12-31')),
  ('overview_b_spring_2025', public.get_financial_overview(current_setting('replay.owner_b')::uuid, '2025-03-01', '2025-06-30'));

select set_config('request.jwt.claims', json_build_object('sub', :'owner_c', 'role', 'authenticated')::text, true) as ignored \gset
-- As the expenses page asks: no dates, the year to date.
insert into replay_figures values
  -- Its categories largest first (the function aggregates them in no order).
  ('expenses_c_year_to_date', (
     select (e - array['monthly_totals', 'monthly_average'])
       || jsonb_build_object('categories', (
            select jsonb_agg(c order by (c->>'amount')::numeric desc)
            from jsonb_array_elements(e->'categories') c))
     from (select public.get_expense_summary(current_setting('replay.owner_c')::uuid) as e) x));
insert into replay_figures
select 'dashboard_stats_c', jsonb_build_object('units', s->'units', 'revenue', s->'revenue')
from (select public.get_dashboard_stats(current_setting('replay.owner_c')::uuid)::jsonb as s) x;
insert into replay_figures
select 'dashboard_v2_c', jsonb_build_object('units', d->'stats'->'units', 'revenue', d->'stats'->'revenue',
  'trend_occupancy', d->'trends'->'occupancy_rate', 'trend_revenue', d->'trends'->'monthly_revenue')
from (select public.get_dashboard_data_v2(current_setting('replay.owner_c')::uuid) as d) x;

reset role;

-- As the service role reads it (no JWT subject, so auth.uid() is NULL and the
-- guard passes): an owner with no requests and no expenses.
select set_config('request.jwt.claims', '', true) as ignored \gset
insert into replay_figures values
  ('maintenance_nobody', public.get_maintenance_analytics('d0000000-0000-4000-8000-000000000999')
     - array['by_status', 'by_priority', 'priorityBreakdown', 'avgResolutionTime', 'completionRate',
             'avg_resolution_hours', 'open_requests', 'total_requests']);

insert into replay_figures
select 'execute', jsonb_object_agg(f.sig, jsonb_build_object(
    'anon', has_function_privilege('anon', f.sig, 'execute'),
    'authenticated', has_function_privilege('authenticated', f.sig, 'execute'),
    'service_role', has_function_privilege('service_role', f.sig, 'execute')))
from unnest(array[
  'public.dashboard_lease_position(uuid,date)',
  'public.get_dashboard_stats(uuid)',
  'public.get_dashboard_data_v2(uuid)',
  'public.get_expense_summary(uuid,date,date)',
  'public.get_maintenance_analytics(uuid)',
  'public.get_financial_overview(uuid,date,date)',
  'public.get_occupancy_trends_optimized(uuid,integer)']) as f(sig);

select jsonb_object_agg(label, payload)::text from replay_figures;

rollback;
