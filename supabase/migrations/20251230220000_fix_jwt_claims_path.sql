-- Migration: Fix JWT Claims Path
-- Created: 2025-12-30 22:00:00 UTC
-- Problem: jsonb_set doesn't create intermediate keys, so {app_metadata,user_type} fails
--          when app_metadata doesn't exist in claims
-- Solution: Set user_type at root level (matches Supabase RBAC docs pattern)

-- ============================================================================
-- FIX 1: UPDATE custom_access_token_hook TO SET CLAIMS AT ROOT LEVEL
-- ============================================================================
-- This matches the official Supabase RBAC example:
-- claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  auth_user_type text;
  auth_stripe_customer_id text;
  public_user_type text;
  public_stripe_customer_id text;
  final_user_type text;
  final_stripe_customer_id text;
begin
  claims := event -> 'claims';

  -- Get from auth.users.raw_app_meta_data (authoritative, server-only)
  select raw_app_meta_data ->> 'user_type',
         raw_app_meta_data ->> 'stripe_customer_id'
  into auth_user_type, auth_stripe_customer_id
  from auth.users
  where id = (event ->> 'user_id')::uuid;

  -- Fallback to public.users
  select u.user_type, u.stripe_customer_id
  into public_user_type, public_stripe_customer_id
  from public.users u
  where u.id = (event ->> 'user_id')::uuid;

  -- Priority: auth.users > public.users > user_metadata > default 'OWNER'
  final_user_type := upper(coalesce(
    auth_user_type,
    public_user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  final_stripe_customer_id := coalesce(
    auth_stripe_customer_id,
    public_stripe_customer_id,
    event -> 'user' -> 'user_metadata' ->> 'stripe_customer_id'
  );

  -- Set claims at ROOT level (not nested under app_metadata)
  -- This is the official Supabase RBAC pattern and avoids jsonb_set intermediate key issues
  claims := jsonb_set(claims, '{user_type}', to_jsonb(final_user_type));

  if final_stripe_customer_id is not null then
    claims := jsonb_set(claims, '{stripe_customer_id}', to_jsonb(final_stripe_customer_id));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

comment on function public.custom_access_token_hook(event jsonb) is
  'Custom access token hook that adds user_type and stripe_customer_id to JWT claims at root level. Follows official Supabase RBAC pattern.';

-- ============================================================================
-- FIX 2: UPDATE is_admin() TO READ FROM ROOT LEVEL
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() ->> 'user_type') = 'ADMIN',
    false
  )
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user has ADMIN user_type. Reads from JWT claims at root level (set by custom_access_token_hook).';
