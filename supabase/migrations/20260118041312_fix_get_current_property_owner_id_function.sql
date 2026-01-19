-- Migration: Fix get_current_property_owner_id function to use renamed table
--
-- Purpose: Update the get_current_property_owner_id() function to query
-- stripe_connected_accounts instead of the old property_owners table.
-- The table was renamed in migration 20251220100000_rename_property_owners_to_stripe_connected_accounts.sql
-- but the function was not updated.
--
-- Affected: get_current_property_owner_id() function
-- Impact: Fixes "relation 'public.property_owners' does not exist" errors

-- Drop and recreate the function with the correct table name
create or replace function public.get_current_property_owner_id() returns uuid
    language sql stable security definer
    set search_path to 'public', 'pg_temp'
    as $$
  select id from public.stripe_connected_accounts where user_id = auth.uid();
$$;

comment on function public.get_current_property_owner_id() is
'Returns the stripe_connected_accounts ID for the currently authenticated user. Used by RLS policies to determine property owner access.';
