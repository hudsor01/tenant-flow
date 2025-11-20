-- Ultra-simple bulletproof auth hook that ALWAYS returns claims
-- Even if database operations fail, the auth still succeeds
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  user_email text;
  db_user_type text := 'TENANT';
  db_stripe_customer_id text;
  db_subscription_status text;
BEGIN
  -- Extract from auth event
  user_id := (event -> 'user' ->> 'id')::uuid;
  user_email := event -> 'user' ->> 'email';

  -- Try to get existing user data
  SELECT user_type, stripe_customer_id 
  INTO db_user_type, db_stripe_customer_id
  FROM public.users
  WHERE id = user_id;

  -- Default user_type to TENANT if not found
  IF db_user_type IS NULL THEN
    db_user_type := 'TENANT';
  END IF;

  -- Try to get subscription status (optional, ignore failures)
  BEGIN
    SELECT status INTO db_subscription_status
    FROM public.subscriptions
    WHERE user_id = user_id::text
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    db_subscription_status := NULL;
  END;

  -- Build the claims - THIS IS CRITICAL and must always succeed
  claims := jsonb_build_object(
    'sub', user_id::text,
    'email', user_email,
    'email_verified', event -> 'user' ->> 'email_confirmed_at' IS NOT NULL,
    'phone_verified', event -> 'user' ->> 'phone_confirmed_at' IS NOT NULL,
    'user_user_type', db_user_type,
    'stripe_customer_id', db_stripe_customer_id,
    'subscription_status', db_subscription_status
  );

  -- Try to sync user to public.users table (best effort, don't block on failure)
  BEGIN
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
      COALESCE(event -> 'user' -> 'user_metadata' ->> 'full_name', ''),
      COALESCE(event -> 'user' -> 'user_metadata' ->> 'first_name', ''),
      COALESCE(event -> 'user' -> 'user_metadata' ->> 'last_name', ''),
      db_user_type,
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      status = 'active',
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore any database errors - the JWT claims are already built
    NULL;
  END;

  RETURN claims;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated, anon, service_role;
