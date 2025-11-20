-- Create Auth Hook for Automatic User Creation
-- This hook automatically creates a public.users record when a new user is created in Supabase Auth
-- Executes AFTER user is created/updated in Supabase Auth

-- Create the hook function that will be called by Supabase Auth
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  user_email text;
  full_name text;
  first_name text;
  last_name text;
BEGIN
  -- Extract user information from the auth event
  user_id := (event -> 'user' ->> 'id')::uuid;
  user_email := event -> 'user' ->> 'email';
  full_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'full_name', '');
  first_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'first_name', '');
  last_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'last_name', '');

  -- Initialize claims
  claims := jsonb_build_object(
    'sub', user_id::text,
    'email', user_email,
    'email_verified', COALESCE(event -> 'user' ->> 'email_confirmed_at' IS NOT NULL, false),
    'phone_verified', COALESCE(event -> 'user' ->> 'phone_confirmed_at' IS NOT NULL, false)
  );

  -- Create or update public.users record
  INSERT INTO public.users (
    id,
    email,
    full_name,
    first_name,
    last_name,
    user_type,
    status,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    full_name,
    first_name,
    last_name,
    COALESCE(event -> 'user' -> 'user_metadata' ->> 'user_type', 'tenant'),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = NOW();

  -- Return the claims (required by Supabase auth hook)
  RETURN claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated, anon, service_role;
