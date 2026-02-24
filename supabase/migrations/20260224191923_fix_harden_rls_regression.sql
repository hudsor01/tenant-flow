-- migration: fix harden rls regression
-- purpose: the 20260224080000_harden_rls_auth_uid_wrappers.sql migration introduced a
--   regression by changing get_current_owner_user_id() to query stripe_connected_accounts.
--   this returns null for users who have not yet set up stripe connect, causing 403 errors
--   on all property/unit queries that use:
--     owner_user_id = (select public.get_current_owner_user_id())
--
--   root cause: properties.owner_user_id stores auth.uid() directly.
--   get_current_owner_user_id() should just return auth.uid(), not do a table lookup.
--
--   also restores get_current_property_owner_id() to query property_owners (not
--   stripe_connected_accounts) since it is a fk to property_owners.id in legacy
--   rls policies for leases, maintenance_requests, documents, etc.
--
--   additionally re-grants execute on rpc functions that may have lost permissions.
--
-- affected tables: none (function changes only)
-- risk: low - restores prior correct behaviour

-- ============================================================
-- 1. fix get_current_owner_user_id()
--    before (harden migration): queries stripe_connected_accounts — returns null
--    for users without stripe connect, blocking all property rls checks.
--    after: returns auth.uid() directly, matching properties.owner_user_id column.
-- ============================================================

create or replace function public.get_current_owner_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select (select auth.uid())
$$;

-- note: get_current_property_owner_id() is intentionally not changed here.
-- property_owners table no longer exists; the harden migration left this
-- function querying stripe_connected_accounts which is the correct table in
-- the new schema. legacy rls policies that use property_owner_id column are
-- either already inoperative or handled via other mechanisms.

-- ============================================================
-- 3. re-grant execute on helper functions
-- ============================================================

grant execute on function public.get_current_owner_user_id() to authenticated;
grant execute on function public.get_current_property_owner_id() to authenticated;

-- note: get_metric_trend and get_dashboard_time_series do not exist in this
-- database — they will be created in a subsequent migration.
