-- ============================================================================
-- Fix rent_payments Missing UPDATE/DELETE Policies
-- ============================================================================
-- BUG: rent_payments has no UPDATE/DELETE policies for authenticated users
-- FIX: Add policies allowing property owners to manage rent payments for their properties

-- Step 1: Create UPDATE policy for property owners
-- Allow owners to update rent payments for leases on their properties
CREATE POLICY "rent_payments_update_owner" ON public.rent_payments
  FOR UPDATE
  TO authenticated
  USING (
    -- Check if the rent payment's lease belongs to owner's property
    lease_id IN (
      SELECT l.id
      FROM public.leases l
      WHERE l.property_owner_id = get_current_property_owner_id()
    )
  )
  WITH CHECK (
    -- Ensure updates maintain ownership
    lease_id IN (
      SELECT l.id
      FROM public.leases l
      WHERE l.property_owner_id = get_current_property_owner_id()
    )
  );

-- Step 2: Create DELETE policy for property owners
-- Allow owners to delete rent payments for leases on their properties
CREATE POLICY "rent_payments_delete_owner" ON public.rent_payments
  FOR DELETE
  TO authenticated
  USING (
    -- Check if the rent payment's lease belongs to owner's property
    lease_id IN (
      SELECT l.id
      FROM public.leases l
      WHERE l.property_owner_id = get_current_property_owner_id()
    )
  );

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  select_count integer;
  insert_count integer;
  update_count integer;
  delete_count integer;
  all_count integer;
BEGIN
  -- Count policies by operation
  SELECT
    COUNT(*) FILTER (WHERE cmd = 'SELECT'),
    COUNT(*) FILTER (WHERE cmd = 'INSERT'),
    COUNT(*) FILTER (WHERE cmd = 'UPDATE'),
    COUNT(*) FILTER (WHERE cmd = 'DELETE'),
    COUNT(*) FILTER (WHERE cmd = 'ALL')
  INTO select_count, insert_count, update_count, delete_count, all_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'rent_payments';

  RAISE NOTICE 'rent_payments policy coverage:';
  RAISE NOTICE '  SELECT: % policies', select_count;
  RAISE NOTICE '  INSERT: % policies', insert_count;
  RAISE NOTICE '  UPDATE: % policies (NEW!)', update_count;
  RAISE NOTICE '  DELETE: % policies (NEW!)', delete_count;
  RAISE NOTICE '  ALL: % policies', all_count;

  IF update_count = 0 THEN
    RAISE WARNING 'UPDATE policies not created!';
  END IF;

  IF delete_count = 0 THEN
    RAISE WARNING 'DELETE policies not created!';
  END IF;

  IF update_count > 0 AND delete_count > 0 THEN
    RAISE NOTICE '✅ rent_payments now has complete CRUD policy coverage';
  END IF;
END $$;
