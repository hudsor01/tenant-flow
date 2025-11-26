-- ============================================================================
-- Read user_type from auth.users.raw_app_meta_data (Native Supabase Auth)
-- ============================================================================
-- CHANGE: Move user_type source from public.users to auth.users.raw_app_meta_data
--
-- WHY: raw_app_meta_data is:
--   1. Native to Supabase Auth schema
--   2. Only server-editable (secure - users cannot modify it)
--   3. Available during auth without cross-schema queries
--   4. Part of the JWT claims structure
--
-- This migration:
--   1. Syncs existing user_type from public.users to auth.users.raw_app_meta_data
--   2. Updates custom_access_token_hook to read from auth.users.raw_app_meta_data
--   3. Maintains fallback to public.users for backward compatibility

-- ============================================================================
-- STEP 1: Sync existing user_type to auth.users.raw_app_meta_data
-- ============================================================================
-- Copy user_type from public.users to auth.users.raw_app_meta_data
-- This ensures all existing users have user_type in the auth schema

UPDATE auth.users au
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('user_type', pu.user_type)
FROM public.users pu
WHERE au.id = pu.id
  AND pu.user_type IS NOT NULL
  AND (au.raw_app_meta_data->>'user_type' IS NULL
       OR au.raw_app_meta_data->>'user_type' != pu.user_type);

-- Log sync results
DO $$
DECLARE
  synced_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO synced_count
  FROM auth.users au
  JOIN public.users pu ON au.id = pu.id
  WHERE au.raw_app_meta_data->>'user_type' IS NOT NULL;

  RAISE NOTICE 'Synced user_type to raw_app_meta_data for % users', synced_count;
END $$;

-- ============================================================================
-- STEP 2: Update custom_access_token_hook to read from auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims jsonb;
  auth_user_type text;
  public_user_type text;
  final_user_type text;
  stripe_customer_id_value text;
BEGIN
  -- Get current claims from event
  claims := event -> 'claims';

  -- PRIMARY: Read user_type from auth.users.raw_app_meta_data (native Supabase Auth)
  -- This is the authoritative source: server-only editable, part of auth schema
  SELECT raw_app_meta_data->>'user_type'
  INTO auth_user_type
  FROM auth.users
  WHERE id = (event ->> 'user_id')::uuid;

  -- FALLBACK: Read from public.users for backward compatibility
  -- Used when raw_app_meta_data doesn't have user_type yet
  SELECT u.user_type, u.stripe_customer_id
  INTO public_user_type, stripe_customer_id_value
  FROM public.users u
  WHERE u.id = (event ->> 'user_id')::uuid;

  -- Priority: auth.users.raw_app_meta_data > public.users > event user_metadata > default
  final_user_type := UPPER(COALESCE(
    auth_user_type,
    public_user_type,
    event -> 'user' -> 'user_metadata' ->> 'user_type',
    'OWNER'
  ));

  -- Set app_metadata claims
  claims := jsonb_set(claims, '{app_metadata,user_type}', to_jsonb(final_user_type));

  -- Only set stripe_customer_id if it has a value (avoid NULL breaking jsonb_set)
  IF stripe_customer_id_value IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,stripe_customer_id}', to_jsonb(stripe_customer_id_value));
  END IF;

  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ============================================================================
-- STEP 3: Update function comment
-- ============================================================================
COMMENT ON FUNCTION public.custom_access_token_hook(event jsonb) IS
'Custom access token hook that reads user_type from auth.users.raw_app_meta_data (primary, server-only editable) with fallback to public.users. Adds user_type and stripe_customer_id to JWT claims.';

-- ============================================================================
-- STEP 4: Create trigger to sync user_type changes to auth.users
-- ============================================================================
-- When public.users.user_type changes, sync to auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_user_type_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Sync user_type to auth.users.raw_app_meta_data
  IF NEW.user_type IS DISTINCT FROM OLD.user_type THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) ||
        jsonb_build_object('user_type', NEW.user_type)
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS sync_user_type_trigger ON public.users;

CREATE TRIGGER sync_user_type_trigger
  AFTER UPDATE OF user_type ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_type_to_auth();

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  users_with_auth_user_type INTEGER;
  users_without_auth_user_type INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_with_auth_user_type
  FROM auth.users
  WHERE raw_app_meta_data->>'user_type' IS NOT NULL;

  SELECT COUNT(*) INTO users_without_auth_user_type
  FROM auth.users
  WHERE raw_app_meta_data->>'user_type' IS NULL;

  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'Users with user_type in raw_app_meta_data: %', users_with_auth_user_type;
  RAISE NOTICE 'Users without user_type in raw_app_meta_data: %', users_without_auth_user_type;
  RAISE NOTICE 'Hook now reads from: auth.users.raw_app_meta_data (primary) > public.users (fallback)';
  RAISE NOTICE 'Trigger created: sync_user_type_trigger syncs changes from public.users to auth.users';
END $$;
