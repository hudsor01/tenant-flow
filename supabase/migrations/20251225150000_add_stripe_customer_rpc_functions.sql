-- Migration: Add Stripe Customer RPC Functions
-- Created: 2025-12-25 15:00:00 UTC
-- Purpose: Provide safe access to Stripe customer data via RPC functions
-- Impact: Allows backend to link users to Stripe customers and retrieve mappings

-- ============================================================================
-- FUNCTION 1: get_stripe_customer_by_user_id
-- ============================================================================
-- Returns the Stripe customer ID for a given user ID
-- Looks up by metadata.user_id in stripe.customers

create or replace function public.get_stripe_customer_by_user_id(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = 'public', 'stripe'
as $$
declare
  v_customer_id text;
begin
  -- Check if stripe schema exists
  if not exists (select 1 from pg_namespace where nspname = 'stripe') then
    return null;
  end if;

  -- Check if customers table exists
  if to_regclass('stripe.customers') is null then
    return null;
  end if;

  -- Try to find by metadata.user_id first (most reliable)
  select id into v_customer_id
  from stripe.customers
  where (metadata->>'user_id')::uuid = p_user_id
  limit 1;

  -- If not found by metadata, try by email match
  if v_customer_id is null then
    select c.id into v_customer_id
    from stripe.customers c
    inner join auth.users u on u.id = p_user_id
    where c.email = u.email
    limit 1;
  end if;

  return v_customer_id;
end;
$$;

comment on function public.get_stripe_customer_by_user_id(uuid) is
'Returns the Stripe customer ID for a user, matching by metadata.user_id or email';

-- ============================================================================
-- FUNCTION 2: link_stripe_customer_to_user
-- ============================================================================
-- Links a Stripe customer to a user by updating metadata.user_id
-- Matches the customer by email address

create or replace function public.link_stripe_customer_to_user(
  p_stripe_customer_id text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'stripe', 'auth'
as $$
declare
  v_user_id uuid;
  v_current_metadata jsonb;
begin
  -- Check if stripe schema exists
  if not exists (select 1 from pg_namespace where nspname = 'stripe') then
    return null;
  end if;

  -- Check if customers table exists
  if to_regclass('stripe.customers') is null then
    return null;
  end if;

  -- Find the user by email
  select id into v_user_id
  from auth.users
  where email = lower(p_email)
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  -- Get current metadata
  select metadata into v_current_metadata
  from stripe.customers
  where id = p_stripe_customer_id;

  -- Update the customer's metadata with user_id
  update stripe.customers
  set metadata = coalesce(v_current_metadata, '{}'::jsonb) || jsonb_build_object('user_id', v_user_id::text)
  where id = p_stripe_customer_id;

  return v_user_id;
end;
$$;

comment on function public.link_stripe_customer_to_user(text, text) is
'Links a Stripe customer to a user by setting metadata.user_id, matched by email';

-- ============================================================================
-- FUNCTION 3: get_user_id_by_stripe_customer
-- ============================================================================
-- Returns the user ID associated with a Stripe customer
-- Checks metadata.user_id first, then falls back to email matching

create or replace function public.get_user_id_by_stripe_customer(p_stripe_customer_id text)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'stripe', 'auth'
as $$
declare
  v_user_id uuid;
  v_customer_email text;
begin
  -- Check if stripe schema exists
  if not exists (select 1 from pg_namespace where nspname = 'stripe') then
    return null;
  end if;

  -- Check if customers table exists
  if to_regclass('stripe.customers') is null then
    return null;
  end if;

  -- First try to get user_id from metadata
  select (metadata->>'user_id')::uuid into v_user_id
  from stripe.customers
  where id = p_stripe_customer_id;

  if v_user_id is not null then
    return v_user_id;
  end if;

  -- Fall back to email matching
  select email into v_customer_email
  from stripe.customers
  where id = p_stripe_customer_id;

  if v_customer_email is not null then
    select id into v_user_id
    from auth.users
    where email = lower(v_customer_email)
    limit 1;
  end if;

  return v_user_id;
end;
$$;

comment on function public.get_user_id_by_stripe_customer(text) is
'Returns the user ID for a Stripe customer, checking metadata.user_id then falling back to email match';

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

grant execute on function public.get_stripe_customer_by_user_id(uuid) to authenticated;
grant execute on function public.get_stripe_customer_by_user_id(uuid) to service_role;

grant execute on function public.link_stripe_customer_to_user(text, text) to service_role;
-- Note: link function only granted to service_role for security

grant execute on function public.get_user_id_by_stripe_customer(text) to authenticated;
grant execute on function public.get_user_id_by_stripe_customer(text) to service_role;
