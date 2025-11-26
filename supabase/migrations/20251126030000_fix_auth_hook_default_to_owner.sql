-- ============================================================================
-- Fix Auth Hook Default User Type and NULL Handling
-- ============================================================================
-- BUG 1: Auth hook defaults to 'TENANT' instead of 'OWNER'
-- BUG 2: Auth hook references non-existent subscription_status column
-- BUG 3: jsonb_set with NULL value causes entire result to be NULL
-- BUSINESS LOGIC: New signups are OWNER by default, TENANT only created via invitation
-- FIX: Change default, remove subscription_status, handle NULL stripe_customer_id

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  user_record RECORD;
  db_user_type text;
  db_stripe_customer_id text;
BEGIN
  -- Get current claims from event
  claims := event -> 'claims';

  -- Fetch user data from public.users table
  SELECT u.user_type, u.stripe_customer_id
  INTO user_record
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  -- Default to 'OWNER' for new signups
  db_user_type := UPPER(COALESCE(
    user_record.user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  db_stripe_customer_id := COALESCE(
    user_record.stripe_customer_id,
    event -> 'user' -> 'user_metadata' ->> 'stripe_customer_id'
  );

  -- Set app_metadata claims - ONLY set non-NULL values to avoid jsonb_set returning NULL
  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(db_user_type));

  -- Only set stripe_customer_id if it has a value (avoid NULL breaking jsonb_set)
  IF db_stripe_customer_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(db_stripe_customer_id));
  END IF;

  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Auth hook fixed:';
  RAISE NOTICE '  - Default user_type changed from TENANT to OWNER';
  RAISE NOTICE '  - Removed non-existent subscription_status column reference';
  RAISE NOTICE '  - Fixed NULL stripe_customer_id breaking jsonb_set';
  RAISE NOTICE 'Business Logic: New signups = OWNER, invited users = TENANT';
END $$;
