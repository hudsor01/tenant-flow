import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SB_SECRET_KEY!)

async function applyMigration() {
  console.log('Applying RLS policy migration...')

const sql = `
-- Define the missing get_current_owner_user_id function
CREATE OR REPLACE FUNCTION public.get_current_owner_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT auth.uid();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_owner_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_owner_user_id() TO service_role;

-- Apply the RLS policy changes
DROP POLICY IF EXISTS "properties_delete_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_select_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_update_owner" ON public.properties;
DROP POLICY IF EXISTS "properties_service_role" ON public.properties;

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
`

  const { error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('Migration failed:', error)
  } else {
    console.log('Migration applied successfully')
  }
}

applyMigration()