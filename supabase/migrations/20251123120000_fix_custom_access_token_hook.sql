-- Fix Custom Access Token Hook with proper Supabase pattern
-- This hook adds custom claims to JWT for user_type, stripe_customer_id, and subscription_status

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

  -- Fetch user data from auth.users
  SELECT 
    COALESCE(raw_user_meta_data->>'user_type', 'tenant'),
    raw_user_meta_data->>'stripe_customer_id'
  INTO 
    user_type_value,
    stripe_customer_id_value
  FROM auth.users
  WHERE id = (event->>'user_id')::uuid;

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

-- Grant select access to subscriptions table for the auth hook
GRANT SELECT ON public.subscriptions TO supabase_auth_admin;

-- Create RLS policy to allow supabase_auth_admin to read subscriptions
CREATE POLICY "Allow auth admin to read subscriptions" 
ON public.subscriptions
AS PERMISSIVE FOR SELECT
TO supabase_auth_admin
USING (true);

COMMENT ON FUNCTION public.custom_access_token_hook IS 
'Custom access token hook that adds user_type, stripe_customer_id, and subscription_status to JWT claims';
