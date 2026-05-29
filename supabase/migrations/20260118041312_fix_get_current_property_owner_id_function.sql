-- Migration: Fix get_current_property_owner_id function to use renamed table
--
-- Purpose: Update the get_current_property_owner_id() function to query
-- stripe_connected_accounts instead of the old property_owners table.
-- The table was renamed in migration 20251220100000_rename_property_owners_to_stripe_connected_accounts.sql
-- but the function was not updated.
--
-- Affected: get_current_property_owner_id() function
-- Impact: Fixes "relation 'public.property_owners' does not exist" errors
--
-- 2026-05-27 update (Phase 4 cycle-2): wrap in table-existence guard.
-- This function body uses `LANGUAGE sql` which Postgres validates EAGERLY
-- at CREATE FUNCTION time -- the planner resolves table refs immediately.
-- If `public.stripe_connected_accounts` is absent on Supabase Preview
-- chain replay (rename condition didn't fire / table demolished later
-- in the chain but order of operations leaves it missing here), the
-- CREATE FUNCTION fails with SQLSTATE 42P01 (the opaque
-- `failed to send batch` error). Guard with to_regclass + EXECUTE.
-- On prod the table exists, function is created as before. On replay
-- the function is skipped; a later migration drops it entirely so the
-- final state matches.

do $$
begin
  if to_regclass('public.stripe_connected_accounts') is not null then
    execute $sql$
      create or replace function public.get_current_property_owner_id() returns uuid
          language sql stable security definer
          set search_path to 'public', 'pg_temp'
          as $body$
        select id from public.stripe_connected_accounts where user_id = auth.uid();
      $body$
    $sql$;

    execute $sql$
      comment on function public.get_current_property_owner_id() is
      'Returns the stripe_connected_accounts ID for the currently authenticated user. Used by RLS policies to determine property owner access.'
    $sql$;
  end if;
end $$;
