-- ============================================================================
-- Fix Reports Table Schema Inconsistency
-- ============================================================================
-- BUG: reports.owner_id references auth.users.id instead of property_owners.id
-- FIX: Migrate to property_owner_id pattern consistent with rest of app

-- Step 1: Add new property_owner_id column
ALTER TABLE public.reports
ADD COLUMN property_owner_id uuid;

-- Step 2: Migrate data from owner_id to property_owner_id
-- Map users.id -> property_owners.id via property_owners.user_id lookup
UPDATE public.reports r
SET property_owner_id = po.id
FROM public.property_owners po
WHERE r.owner_id = po.user_id;

-- Step 3: Verify migration (should be 0 rows with NULL property_owner_id)
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.reports WHERE property_owner_id IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % reports have NULL property_owner_id', null_count;
  END IF;
  RAISE NOTICE 'Migration successful: All reports have valid property_owner_id';
END $$;

-- Step 4: Make property_owner_id NOT NULL and add FK constraint
ALTER TABLE public.reports
ALTER COLUMN property_owner_id SET NOT NULL;

ALTER TABLE public.reports
ADD CONSTRAINT reports_property_owner_id_fkey
FOREIGN KEY (property_owner_id)
REFERENCES public.property_owners(id)
ON DELETE CASCADE;

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS reports_select_owner ON public.reports;
DROP POLICY IF EXISTS reports_insert_owner ON public.reports;
DROP POLICY IF EXISTS reports_update_owner ON public.reports;
DROP POLICY IF EXISTS reports_delete_owner ON public.reports;

-- Step 6: Create new RLS policies using property_owner_id
CREATE POLICY "reports_select_owner" ON public.reports
  FOR SELECT
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_insert_owner" ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_update_owner" ON public.reports
  FOR UPDATE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id())
  WITH CHECK (property_owner_id = get_current_property_owner_id());

CREATE POLICY "reports_delete_owner" ON public.reports
  FOR DELETE
  TO authenticated
  USING (property_owner_id = get_current_property_owner_id());

-- Step 7: Drop old owner_id column and FK constraint
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_owner_id_fkey;
ALTER TABLE public.reports DROP COLUMN owner_id;

-- Step 8: Create index for performance
CREATE INDEX IF NOT EXISTS idx_reports_property_owner_id
ON public.reports(property_owner_id);

-- ============================================================================
-- Verification
-- ============================================================================
-- Check that policies exist
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reports'
    AND policyname LIKE '%_owner';

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 owner policies, found %', policy_count;
  ELSE
    RAISE NOTICE 'All 4 owner policies created successfully';
  END IF;
END $$;
