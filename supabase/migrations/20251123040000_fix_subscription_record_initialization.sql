-- Fix: Remove subscription_record variable that causes "not assigned yet" error
-- When no subscription exists, directly assign NULL to db_subscription_status

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  user_email text;
  full_name text;
  first_name text;
  last_name text;
  raw_user_type text;
  db_user_type text;
  db_stripe_customer_id text;
  db_subscription_status text;
  user_record record;
BEGIN
  user_id := (event -> 'user' ->> 'id')::uuid;
  user_email := event -> 'user' ->> 'email';
  full_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'full_name', '');
  first_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'first_name', '');
  last_name := COALESCE(event -> 'user' -> 'user_metadata' ->> 'last_name', '');

  -- Try to get existing user data (best effort)
  BEGIN
    SELECT user_type, stripe_customer_id INTO user_record
    FROM public.users
    WHERE id = user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore query errors
    NULL;
  END;

  -- Try to get subscription status directly into variable (best effort)
  BEGIN
    SELECT status INTO db_subscription_status
    FROM public.subscriptions
    WHERE user_id = user_id::text
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore query errors
    db_subscription_status := NULL;
  END;

  -- Extract raw user_type from database or user_metadata
  raw_user_type := COALESCE(
    user_record.user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'TENANT'
  );

  -- Normalize and map legacy values to current schema
  -- Map: property_owner -> OWNER, owner -> OWNER, tenant -> TENANT
  -- Always uppercase to ensure consistency
  db_user_type := CASE UPPER(raw_user_type)
    WHEN 'PROPERTY_OWNER' THEN 'OWNER'
    WHEN 'OWNER' THEN 'OWNER'
    WHEN 'TENANT' THEN 'TENANT'
    WHEN 'MANAGER' THEN 'MANAGER'
    WHEN 'ADMIN' THEN 'ADMIN'
    ELSE UPPER(raw_user_type)
  END;

  db_stripe_customer_id := user_record.stripe_customer_id;

  -- Get the existing claims from the event
  claims := event->'claims';

  -- Initialize app_metadata if it doesn't exist
  IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  END IF;

  -- Set custom claims in app_metadata (proper location per Supabase docs)
  claims := jsonb_set(claims, '{app_metadata, user_type}', to_jsonb(db_user_type));
  claims := jsonb_set(claims, '{app_metadata, stripe_customer_id}', to_jsonb(db_stripe_customer_id));
  claims := jsonb_set(claims, '{app_metadata, subscription_status}', to_jsonb(db_subscription_status));

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  -- Try to sync user to public.users (best effort - don't block on failure)
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      first_name,
      last_name,
      user_type,
      status,
      stripe_customer_id,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      user_email,
      full_name,
      first_name,
      last_name,
      db_user_type,
      'active',
      db_stripe_customer_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      user_type = EXCLUDED.user_type,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      status = EXCLUDED.status,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore INSERT errors - the claims are already built
    NULL;
  END;

  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS 'Custom access token hook that normalizes user_type to uppercase and maps legacy values (property_owner -> OWNER). Fixed: subscription_status is set to NULL when no subscription exists.';
