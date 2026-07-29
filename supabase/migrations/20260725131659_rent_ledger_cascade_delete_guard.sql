-- =============================================================================
-- Rent ledger append-only guard: permit parent cascades (fixes deferred item D1)
-- =============================================================================
-- Problem (found in 55-03, confirmed live in 55-04):
-- rent_ledger_append_only() raised unconditionally on every UPDATE and DELETE.
-- Both ledger tables reference their parents with ON DELETE CASCADE:
--
--   rent_charges.lease_id       -> leases(id) on delete cascade
--   rent_charges.owner_user_id  -> users(id)  on delete cascade
--   rent_receipts.charge_id / lease_id / owner_user_id  - same
--
-- A cascade issues a real DELETE against the referencing table, which fires the
-- row trigger. So once a lease had any ledger row, deleting that lease (or its
-- owner) aborted with 0A000 instead of cascading. Verified against prod:
-- deleting a lease with one charge failed with
-- "rent ledger is append-only ... (row ...)" sqlstate 0A000.
--
-- Practical blast radius today is small - leases are soft-deleted
-- (lease_status = 'inactive', see lease-mutation-options.ts) and GDPR
-- anonymizes rather than deleting public.users rows - so this fired only on a
-- direct hard DELETE. It is still a latent landmine for any admin purge, test
-- teardown, or future hard-delete path, so it is fixed here rather than left.
--
-- Fix: keep the immutability guarantee exactly where it matters and relax it
-- only for parent-driven cascades.
--
--   * UPDATE            -> always refused (booked amounts are immutable, D-06)
--   * direct DELETE     -> always refused (corrections are reversal inserts)
--   * cascade DELETE    -> permitted
--
-- A foreign-key cascade runs the child DELETE from inside the parent's RI
-- trigger, so pg_trigger_depth() is > 1 there, while a direct statement-level
-- DELETE runs at depth 1. That is the discriminator used below.
--
-- This does NOT weaken LEDGER-06. The append-only control exists so that a
-- correction can never be an in-place edit or a quiet row removal; it is not a
-- retention lock on whole-entity deletion. When the parent lease or owner is
-- being removed outright, its ledger rows cannot meaningfully outlive it (the
-- FK forbids orphans), so cascading is the correct behaviour.
--
-- Validated against prod inside a rolled-back transaction before shipping:
--   update = blocked 0A000 | direct delete = blocked 0A000 | cascade = allowed
-- =============================================================================

create or replace function public.rent_ledger_append_only()
  returns trigger language plpgsql as $$
begin
  -- Booked amounts are immutable for every writer, always.
  if tg_op = 'UPDATE' then
    raise exception
      'rent ledger is append-only; post a reversal entry instead of editing (row %)',
      coalesce(old.id::text, '?')
      using errcode = '0A000';   -- feature_not_supported
  end if;

  -- DELETE reaching us from a parent cascade (pg_trigger_depth() > 1) is the
  -- parent row being removed; allow it so ON DELETE CASCADE works as declared.
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  -- Any direct DELETE is still refused - corrections are reversal inserts.
  raise exception
    'rent ledger is append-only; post a reversal entry instead of deleting (row %)',
    coalesce(old.id::text, '?')
    using errcode = '0A000';
end;
$$;

comment on function public.rent_ledger_append_only() is
  'Append-only guard for rent_charges / rent_receipts (LEDGER-06, D-06). Refuses every UPDATE and every direct DELETE for all writers including service_role; permits DELETE arriving from a parent FK cascade (pg_trigger_depth() > 1) so deleting a lease or owner is not blocked by ledger history. Corrections are reversal inserts via reverses_id.';
