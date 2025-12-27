-- Migration: Create Profile Avatars Storage Bucket and RLS Policies
-- Purpose: Set up storage bucket for user profile avatars with proper RLS
-- Affected tables: storage.buckets, storage.objects, public.users
-- ============================================================================

-- Create avatars storage bucket
-- This bucket stores user profile pictures uploaded by users
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket for serving avatars via URL
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage RLS Policies for avatars bucket
-- ============================================================================

-- Policy: Anyone can view avatars (public bucket for fast serving)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload their own avatar
-- File path must match pattern: avatars/{user_id}/avatar.{ext}
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ============================================================================
-- RLS Policies for users table (profile access)
-- ============================================================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

-- Policy: Users can update their own profile
-- Allowed fields: first_name, last_name, phone, avatar_url
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Policy: Service role can manage all users (for backend operations)
CREATE POLICY "Service role can manage all users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- RLS Policies for tenants table (tenant profile access)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Tenants can view their own tenant profile" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can update their own tenant profile" ON public.tenants;
DROP POLICY IF EXISTS "Owners can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Service role can manage all tenants" ON public.tenants;

-- Policy: Tenants can view their own tenant profile
CREATE POLICY "Tenants can view their own tenant profile"
ON public.tenants
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Policy: Tenants can update their own tenant profile
CREATE POLICY "Tenants can update their own tenant profile"
ON public.tenants
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Policy: Owners can view tenants linked to their properties via leases
CREATE POLICY "Owners can view their tenants"
ON public.tenants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lease_tenants lt
    JOIN public.leases l ON l.id = lt.lease_id
    WHERE lt.tenant_id = tenants.id
    AND l.owner_user_id = (select auth.uid())
  )
);

-- Policy: Service role can manage all tenants
CREATE POLICY "Service role can manage all tenants"
ON public.tenants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- Create function to get user profile with role-specific data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user_type text;
  v_tenant_data jsonb;
  v_owner_data jsonb;
BEGIN
  -- Get base user data
  SELECT jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'user_type', u.user_type,
    'status', u.status,
    'created_at', u.created_at,
    'updated_at', u.updated_at
  ), u.user_type
  INTO v_result, v_user_type
  FROM public.users u
  WHERE u.id = p_user_id;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Add role-specific data based on user type
  IF v_user_type = 'tenant' THEN
    SELECT jsonb_build_object(
      'date_of_birth', t.date_of_birth,
      'emergency_contact_name', t.emergency_contact_name,
      'emergency_contact_phone', t.emergency_contact_phone,
      'emergency_contact_relationship', t.emergency_contact_relationship,
      'identity_verified', t.identity_verified,
      'current_lease', (
        SELECT jsonb_build_object(
          'property_name', p.name,
          'unit_number', un.unit_number,
          'move_in_date', l.start_date
        )
        FROM public.lease_tenants lt
        JOIN public.leases l ON l.id = lt.lease_id
        JOIN public.units un ON un.id = l.unit_id
        JOIN public.properties p ON p.id = un.property_id
        WHERE lt.tenant_id = t.id
        AND l.lease_status = 'active'
        LIMIT 1
      )
    )
    INTO v_tenant_data
    FROM public.tenants t
    WHERE t.user_id = p_user_id;

    v_result = v_result || jsonb_build_object('tenant_profile', COALESCE(v_tenant_data, '{}'::jsonb));

  ELSIF v_user_type IN ('owner', 'OWNER') THEN
    SELECT jsonb_build_object(
      'stripe_connected', EXISTS (
        SELECT 1 FROM public.stripe_connected_accounts sca
        WHERE sca.user_id = p_user_id
        AND sca.onboarding_complete = true
      ),
      'properties_count', (
        SELECT COUNT(*) FROM public.properties pr
        WHERE pr.owner_user_id = p_user_id
      ),
      'units_count', (
        SELECT COUNT(*) FROM public.units un
        JOIN public.properties pr ON pr.id = un.property_id
        WHERE pr.owner_user_id = p_user_id
      )
    )
    INTO v_owner_data;

    v_result = v_result || jsonb_build_object('owner_profile', COALESCE(v_owner_data, '{}'::jsonb));
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO service_role;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON POLICY "Anyone can view avatars" ON storage.objects IS 'Allows public access to avatar images for fast serving';
COMMENT ON POLICY "Users can upload their own avatar" ON storage.objects IS 'Users can only upload to their own avatar folder (avatars/{user_id}/)';
COMMENT ON POLICY "Users can update their own avatar" ON storage.objects IS 'Users can only update their own avatar files';
COMMENT ON POLICY "Users can delete their own avatar" ON storage.objects IS 'Users can only delete their own avatar files';
COMMENT ON FUNCTION public.get_user_profile(uuid) IS 'Returns user profile with role-specific data (tenant or owner fields)';
