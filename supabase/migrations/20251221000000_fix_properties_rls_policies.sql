-- Fix properties RLS policies to use owner_user_id instead of property_owner_id
-- The properties table was updated to use owner_user_id, but the RLS policies were not updated

-- Drop existing policies
DROP POLICY IF EXISTS "properties_delete_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_select_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_update_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_service_role" ON public.properties;

-- Recreate policies with correct column name
CREATE POLICY "properties_delete_owner" ON public.properties
FOR DELETE TO authenticated
USING (owner_user_id = public.get_current_owner_user_id());

CREATE POLICY "properties_insert_owner" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = public.get_current_owner_user_id());

CREATE POLICY "properties_select_owner" ON public.properties
FOR SELECT TO authenticated
USING (owner_user_id = public.get_current_owner_user_id());

CREATE POLICY "properties_update_owner" ON public.properties
FOR UPDATE TO authenticated
USING (owner_user_id = public.get_current_owner_user_id())
WITH CHECK (owner_user_id = public.get_current_owner_user_id());

CREATE POLICY "properties_service_role" ON public.properties
TO service_role
USING (true)
WITH CHECK (true);