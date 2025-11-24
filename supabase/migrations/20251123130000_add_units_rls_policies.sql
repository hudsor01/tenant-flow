-- Migration: Add RLS policies for units table
-- Description: Ensures Row Level Security on `units` table is enforced for property owners
--              so authenticated API clients cannot bypass tenant boundaries.
--              Matches the security pattern used in properties and leases tables.
--
-- Access Pattern:
-- - OWNER users can CRUD their own units (via property_owners.user_id = auth.uid())
-- - T3NANT users have NO direct access to units (they access through leases)

-- Enable Row Level Security on units table if not already enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Service role access (for backend services)
DROP POLICY IF EXISTS "units_service_role_access" ON public.units;
CREATE POLICY "units_service_role_access" ON public.units
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owner SELECT policy
DROP POLICY IF EXISTS "Property owners can select units" ON public.units;
CREATE POLICY "Property owners can select units" ON public.units
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = public.units.property_id
        AND p.property_owner_id IN (
          SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid())
        )
    )
  );

-- Property owner INSERT policy
DROP POLICY IF EXISTS "Property owners can insert units" ON public.units;
CREATE POLICY "Property owners can insert units" ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = NEW.property_id
        AND p.property_owner_id IN (
          SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid())
        )
    )
  );

-- Property owner UPDATE policy
DROP POLICY IF EXISTS "Property owners can update units" ON public.units;
CREATE POLICY "Property owners can update units" ON public.units
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = public.units.property_id
        AND p.property_owner_id IN (
          SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = public.units.property_id
        AND p.property_owner_id IN (
          SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid())
        )
    )
  );

-- Property owner DELETE policy
DROP POLICY IF EXISTS "Property owners can delete units" ON public.units;
CREATE POLICY "Property owners can delete units" ON public.units
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = public.units.property_id
        AND p.property_owner_id IN (
          SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid())
        )
    )
  );

-- Comments for documentation
COMMENT ON POLICY "units_service_role_access" ON public.units IS 'Allow service role full access to units table for backend operations';
COMMENT ON POLICY "Property owners can select units" ON public.units IS 'Allow property owners to view their units';
COMMENT ON POLICY "Property owners can insert units" ON public.units IS 'Allow property owners to create units for their properties';
COMMENT ON POLICY "Property owners can update units" ON public.units IS 'Allow property owners to update their units';
COMMENT ON POLICY "Property owners can delete units" ON public.units IS 'Allow property owners to delete their units';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity, schemaname
-- FROM pg_tables
-- WHERE tablename = 'units'
-- AND schemaname = 'public';
