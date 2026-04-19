-- Fix: is_admin() was reading root-level JWT `user_type`, but the custom_access_token_hook
-- writes `user_type` inside `app_metadata` (per 20260227160724_google_oauth_pending_user_type).
-- Mismatch caused is_admin() to return false for all callers, including the ADMIN user —
-- breaking get_deliverability_stats and get_funnel_stats.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'user_type') = 'ADMIN',
    false
  )
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user has ADMIN user_type. Reads from app_metadata.user_type in JWT claims (set by custom_access_token_hook).';
