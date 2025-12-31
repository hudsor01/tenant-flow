-- Migration: Update is_admin() to use JWT claims
-- Created: 2025-12-30 21:00:00 UTC
-- Purpose: Use custom_access_token_hook JWT claims instead of DB lookup for admin checks
-- Performance: Eliminates DB query - reads directly from JWT app_metadata

-- ============================================================================
-- UPDATE is_admin() TO USE JWT CLAIMS
-- ============================================================================
-- The custom_access_token_hook already sets app_metadata.user_type in the JWT.
-- Reading from JWT is faster than a DB lookup and equally secure since
-- app_metadata is server-only (users cannot modify it).

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker  -- No need for DEFINER, just reading JWT
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'user_type') = 'ADMIN',
    false
  )
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user has ADMIN user_type. Reads from JWT app_metadata (set by custom_access_token_hook) - no DB lookup required.';

-- Grant remains the same
grant execute on function public.is_admin() to authenticated;
