-- Add owner_user_id columns to tables that still reference property_owner_id
-- Ensures later owner_user_id-based policies and indexes can be applied safely.

-- Leases
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS owner_user_id uuid;

DO $$
BEGIN
  IF to_regclass('public.property_owners') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'leases'
        AND column_name = 'property_owner_id'
    )
  THEN
    UPDATE public.leases l
    SET owner_user_id = po.user_id
    FROM public.property_owners po
    WHERE l.owner_user_id IS NULL
      AND l.property_owner_id = po.id;
  END IF;
END $$;

-- Units
ALTER TABLE public.units
ADD COLUMN IF NOT EXISTS owner_user_id uuid;

DO $$
BEGIN
  IF to_regclass('public.property_owners') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'units'
        AND column_name = 'property_owner_id'
    )
  THEN
    UPDATE public.units u
    SET owner_user_id = po.user_id
    FROM public.property_owners po
    WHERE u.owner_user_id IS NULL
      AND u.property_owner_id = po.id;
  END IF;
END $$;

-- Maintenance Requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS owner_user_id uuid;

DO $$
BEGIN
  IF to_regclass('public.property_owners') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'maintenance_requests'
        AND column_name = 'property_owner_id'
    )
  THEN
    UPDATE public.maintenance_requests mr
    SET owner_user_id = po.user_id
    FROM public.property_owners po
    WHERE mr.owner_user_id IS NULL
      AND mr.property_owner_id = po.id;
  END IF;
END $$;

COMMENT ON COLUMN public.leases.owner_user_id IS
'References users.id where user_type = OWNER. Backfilled from property_owner_id.';

COMMENT ON COLUMN public.units.owner_user_id IS
'References users.id where user_type = OWNER. Backfilled from property_owner_id.';

COMMENT ON COLUMN public.maintenance_requests.owner_user_id IS
'References users.id where user_type = OWNER. Backfilled from property_owner_id.';
