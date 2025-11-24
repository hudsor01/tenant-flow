-- Migration: Fix Auth and Stripe Architecture
-- 1. Fix custom access token hook to uppercase user_type
-- 2. Ensure public.users records exist for all auth.users
-- 3. Remove redundant stripe_customer_id from tenants
-- 4. Move connected_account_id from users to property_owners

-- ============================================================================
-- PART 1: Fix Custom Access Token Hook (uppercase user_type)
-- ============================================================================

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

  -- Fetch user data from public.users (source of truth for user_type)
  -- Fallback to auth.users metadata if public.users record doesn't exist yet
  SELECT
    COALESCE(
      (SELECT user_type FROM public.users WHERE id = (event->>'user_id')::uuid),
      UPPER(COALESCE((SELECT raw_user_meta_data->>'user_type' FROM auth.users WHERE id = (event->>'user_id')::uuid), 'TENANT'))
    ),
    (SELECT raw_user_meta_data->>'stripe_customer_id' FROM auth.users WHERE id = (event->>'user_id')::uuid)
  INTO
    user_type_value,
    stripe_customer_id_value;

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

  -- Add user_type to app_metadata (ALWAYS UPPERCASE)
  IF user_type_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, user_type}', to_jsonb(UPPER(user_type_value)));
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

-- Grant select access to tables needed by the hook
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT SELECT ON public.subscriptions TO supabase_auth_admin;

-- Create RLS policies to allow supabase_auth_admin to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname = 'Allow auth admin to read users'
  ) THEN
    CREATE POLICY "Allow auth admin to read users"
    ON public.users
    AS PERMISSIVE FOR SELECT
    TO supabase_auth_admin
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'subscriptions'
    AND policyname = 'Allow auth admin to read subscriptions'
  ) THEN
    CREATE POLICY "Allow auth admin to read subscriptions"
    ON public.subscriptions
    AS PERMISSIVE FOR SELECT
    TO supabase_auth_admin
    USING (true);
  END IF;
END $$;

COMMENT ON FUNCTION public.custom_access_token_hook IS
'Custom access token hook that adds user_type (UPPERCASE), stripe_customer_id, and subscription_status to JWT claims.
User_type is read from public.users (source of truth) with fallback to auth.users metadata.';

-- ============================================================================
-- PART 2: Sync existing auth.users to public.users
-- ============================================================================

-- Insert missing users into public.users from auth.users
INSERT INTO public.users (id, email, full_name, user_type, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  UPPER(COALESCE(au.raw_user_meta_data->>'user_type', 'TENANT')),
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 3: Remove stripe_customer_id from tenants (use user_id FK instead)
-- ============================================================================

-- First, verify property_owners has stripe_account_id column
DO $$
BEGIN
  -- Add stripe_account_id to property_owners if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'property_owners'
    AND column_name = 'stripe_account_id'
  ) THEN
    ALTER TABLE public.property_owners
    ADD COLUMN stripe_account_id text;

    CREATE INDEX IF NOT EXISTS idx_property_owners_stripe_account
    ON public.property_owners(stripe_account_id);
  END IF;
END $$;

-- Copy connected_account_id from users to property_owners before dropping
UPDATE public.property_owners po
SET stripe_account_id = COALESCE(po.stripe_account_id, u.connected_account_id)
FROM public.users u
WHERE po.user_id = u.id
AND u.connected_account_id IS NOT NULL
AND po.stripe_account_id IS NULL;

-- Drop connected_account_id from users (belongs in property_owners)
ALTER TABLE public.users DROP COLUMN IF EXISTS connected_account_id;

-- Drop stripe_customer_id from tenants (redundant with user_id FK)
ALTER TABLE public.tenants DROP COLUMN IF EXISTS stripe_customer_id;

COMMENT ON COLUMN public.property_owners.stripe_account_id IS
'Stripe Connect account ID for this property owner. One-to-one mapping with user.';

-- ============================================================================
-- PART 4: Update app_metadata for existing users to uppercase
-- ============================================================================

-- Fix existing user_type in app_metadata to be uppercase
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{user_type}',
  to_jsonb(UPPER(COALESCE(raw_app_meta_data->>'user_type', raw_user_meta_data->>'user_type', 'TENANT')))
)
WHERE raw_app_meta_data->>'user_type' IS NOT NULL
AND raw_app_meta_data->>'user_type' != UPPER(raw_app_meta_data->>'user_type');
