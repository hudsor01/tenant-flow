-- =============================================================================
-- Lock search_path on rent_ledger_append_only() (advisor: function_search_path_mutable)
-- =============================================================================
-- The Supabase security advisor flagged:
--
--   [WARN] function_search_path_mutable
--   Function `public.rent_ledger_append_only` has a role mutable search_path
--
-- Every other function shipped in Phase 55 pins `set search_path = public`
-- (generate_rent_charges, get_lease_ledger_summary, get_lease_ledger,
-- reverse_charge, reverse_receipt, start_lease_ledger, get_collection_rate),
-- and so does the project's canonical trigger function `set_updated_at`
-- (also SECURITY INVOKER, also search_path=public). This one was the outlier -
-- it shipped with proconfig = (none).
--
-- A mutable search_path on a trigger function means the identifiers it resolves
-- depend on the caller's search_path. This function currently references no
-- schema-qualified objects, so there is no known exploit path today, but the
-- repo has an established hardening line for exactly this class
-- (20251231065044_fix_function_search_paths,
--  20251230260000_fix_trigger_function_security,
--  20260403183050_fix_set_updated_at_metadata_search_path) and leaving one
-- unpinned function behind would be an inconsistency, not a decision.
--
-- Body is unchanged from 20260725131659_rent_ledger_cascade_delete_guard.sql -
-- this migration only adds the `set search_path = public` clause.
-- =============================================================================

create or replace function public.rent_ledger_append_only()
  returns trigger
  language plpgsql
  set search_path = public
as $$
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
  'Append-only guard for rent_charges / rent_receipts (LEDGER-06, D-06). Refuses every UPDATE and every direct DELETE for all writers including service_role; permits DELETE arriving from a parent FK cascade (pg_trigger_depth() > 1) so deleting a lease or owner is not blocked by ledger history. Corrections are reversal inserts via reverses_id. search_path pinned to public.';
