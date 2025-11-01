-- Migration: Add custom access token hook to include role and subscription_status in JWT claims
-- This eliminates the need for database queries in middleware by storing user metadata in JWT
-- Per Supabase official RBAC documentation: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac

-- Create the auth hook function
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
  declare
    claims jsonb;
    user_role text;
    sub_status text;
    stripe_customer_id text;
  begin
    -- Fetch user role, subscription status, and Stripe customer ID from users table
    -- Note: supabaseId is text type, not uuid
    select role, subscription_status, "stripeCustomerId"
    into user_role, sub_status, stripe_customer_id
    from public.users
    where "supabaseId" = (event->>'user_id');

    claims := event->'claims';

    -- Set custom claims
    if user_role is not null then
      claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
    else
      claims := jsonb_set(claims, '{user_role}', 'null');
    end if;

    if sub_status is not null then
      claims := jsonb_set(claims, '{subscription_status}', to_jsonb(sub_status));
    else
      claims := jsonb_set(claims, '{subscription_status}', 'null');
    end if;

    if stripe_customer_id is not null then
      claims := jsonb_set(claims, '{stripe_customer_id}', to_jsonb(stripe_customer_id));
    else
      claims := jsonb_set(claims, '{stripe_customer_id}', 'null');
    end if;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified event
    return event;
  end;
$$;

-- Grant necessary permissions to supabase_auth_admin
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook
  from authenticated, anon, public;

grant all
  on table public.users
  to supabase_auth_admin;

revoke all
  on table public.users
  from authenticated, anon, public;

-- Create policy to allow auth admin to read users table
create policy "Allow auth admin to read user roles" on public.users
as permissive for select
to supabase_auth_admin
using (true);

-- Note: After applying this migration, you must enable the hook in Supabase Dashboard:
-- 1. Navigate to Authentication > Hooks (Beta)
-- 2. Select "custom_access_token_hook" from the dropdown for "Custom Access Token"
-- 3. Save the configuration
--
-- For local development, add to supabase/config.toml:
-- [auth.hook.custom_access_token]
-- enabled = true
-- uri = "pg-functions://postgres/public/custom_access_token_hook"
