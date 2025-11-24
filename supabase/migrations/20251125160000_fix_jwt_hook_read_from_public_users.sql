-- Fix JWT Hook to Read from public.users (Authoritative Source)
--
-- CRITICAL SECURITY FIX:
-- Previous implementation read from auth.users.raw_user_meta_data which is:
-- 1. User-editable (can be manipulated)
-- 2. Not the source of truth
-- 3. Can get stale/out of sync with database
--
-- This migration fixes the hook to read from public.users which is:
-- 1. The authoritative source protected by RLS
-- 2. Always in sync with application state
-- 3. Secure and controlled by application logic

DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_type_value text;
  stripe_customer_id_value text;
  subscription_status_value text;
BEGIN
  -- Extract claims from event
  claims := event->'claims';

  -- ✅ FIXED: Fetch user data from public.users (authoritative source)
  -- NOT from auth.users.raw_user_meta_data (user-editable, insecure)
  SELECT
    u.user_type,
    u.stripe_customer_id
  INTO
    user_type_value,
    stripe_customer_id_value
  FROM public.users u
  WHERE u.id = (event->>'user_id')::uuid;

  -- Fetch subscription status from public.subscriptions
  SELECT status INTO subscription_status_value
  FROM public.subscriptions
  WHERE user_id = (event->>'user_id')::uuid
  ORDER BY created_at DESC
  LIMIT 1;

  -- Initialize app_metadata if it doesn't exist
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Add user_type to app_metadata
  IF user_type_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_type}', to_jsonb(user_type_value));
  END IF;

  -- Add stripe_customer_id to app_metadata
  IF stripe_customer_id_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, stripe_customer_id}', to_jsonb(stripe_customer_id_value));
  END IF;

  -- Add subscription_status to app_metadata
  IF subscription_status_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, subscription_status}', to_jsonb(subscription_status_value));
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  -- Return the modified event
  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant select access to users and subscriptions tables for the auth hook
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT SELECT ON public.subscriptions TO supabase_auth_admin;

-- Create RLS policy to allow supabase_auth_admin to read users table
DO $$
BEGIN
  -- Drop if exists (idempotent)
  DROP POLICY IF EXISTS "Allow auth admin to read users" ON public.users;
EXCEPTION
  WHEN undefined_object THEN NULL;
END
$$;

CREATE POLICY "Allow auth admin to read users"
ON public.users
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

-- Ensure subscriptions policy exists (may already exist from previous migration)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow auth admin to read subscriptions" ON public.subscriptions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END
$$;

CREATE POLICY "Allow auth admin to read subscriptions"
ON public.subscriptions
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

COMMENT ON FUNCTION public.custom_access_token_hook IS
'SECURITY FIX: Custom access token hook that reads user_type from public.users (authoritative source) instead of auth.users.raw_user_meta_data (user-editable). Adds user_type, stripe_customer_id, and subscription_status to JWT claims.';
