-- Auto-create property_owners record when OWNER user signs up or existing OWNER user is missing one
--
-- This migration ensures every user with user_type='OWNER' has a corresponding property_owners record.
-- It creates:
-- 1. A trigger function to auto-create property_owners on user creation
-- 2. Backfills existing OWNER users who are missing property_owners records

-- ============================================================================
-- PART 1: Create trigger function to auto-create property_owners
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_property_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_type_value text;
BEGIN
  -- Get user_type from public.users
  SELECT user_type INTO user_type_value
  FROM public.users
  WHERE id = NEW.id;

  -- If user_type is 'OWNER', create property_owner record
  IF user_type_value = 'OWNER' THEN
    INSERT INTO public.property_owners (user_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates

    RAISE LOG 'Auto-created property_owner for user_id: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on public.users table (fires after INSERT)
DROP TRIGGER IF EXISTS trigger_auto_create_property_owner ON public.users;

CREATE TRIGGER trigger_auto_create_property_owner
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_property_owner();

-- ============================================================================
-- PART 2: Backfill existing OWNER users missing property_owners records
-- ============================================================================

-- Insert property_owners for any existing OWNER users who don't have one
INSERT INTO public.property_owners (user_id, created_at, updated_at)
SELECT
  u.id,
  NOW(),
  NOW()
FROM public.users u
LEFT JOIN public.property_owners po ON po.user_id = u.id
WHERE u.user_type = 'OWNER'
  AND po.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Log the number of backfilled records
DO $$
DECLARE
  backfill_count integer;
BEGIN
  SELECT COUNT(*) INTO backfill_count
  FROM public.users u
  INNER JOIN public.property_owners po ON po.user_id = u.id
  WHERE u.user_type = 'OWNER';

  RAISE NOTICE 'Backfilled property_owners records. Total OWNER users with property_owners: %', backfill_count;
END $$;
