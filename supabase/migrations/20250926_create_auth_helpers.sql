-- ============================================================================
-- AUTH HELPER FUNCTIONS FOR TENANTFLOW
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS auth.uid() CASCADE;
DROP FUNCTION IF EXISTS auth.email() CASCADE;
DROP FUNCTION IF EXISTS auth.user_metadata() CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Get current user ID
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'sub')
    )::uuid
$$;

-- Get current user email
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'email'
    )::text
$$;

-- Get user metadata
CREATE OR REPLACE FUNCTION auth.user_metadata()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::jsonb->'user_metadata',
        '{}'::jsonb
    )
$$;

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT auth.uid() IS NOT NULL
$$;

-- Get user's full name
CREATE OR REPLACE FUNCTION auth.full_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        auth.user_metadata()->>'full_name',
        auth.user_metadata()->>'name',
        split_part(auth.email(), '@', 1)
    )::text
$$;

-- Get user's company
CREATE OR REPLACE FUNCTION auth.company()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT (auth.user_metadata()->>'company')::text
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.email() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.user_metadata() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.full_name() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.company() TO authenticated;

-- ============================================================================
-- CREATE USER PROFILES TABLE
-- ============================================================================

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_company_idx ON public.profiles(company);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Service role can manage all profiles (for admin operations)
CREATE POLICY "Service role can manage all profiles"
ON public.profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- TRIGGER TO CREATE PROFILE ON USER SIGNUP
-- ============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        company,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'company',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        company = COALESCE(EXCLUDED.company, profiles.company),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATE EXISTING USERS' PROFILES
-- ============================================================================

-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (id, email, full_name, company, created_at)
SELECT
    u.id,
    u.email,
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1)
    ),
    u.raw_user_meta_data->>'company',
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- ============================================================================
-- RLS POLICIES FOR CORE TABLES
-- ============================================================================

-- Ensure RLS is enabled on all user-related tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

-- Properties policies
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

CREATE POLICY "Users can view their own properties"
ON properties FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own properties"
ON properties FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own properties"
ON properties FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own properties"
ON properties FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Similar policies for units (they reference properties)
DROP POLICY IF EXISTS "Users can view units of their properties" ON units;
DROP POLICY IF EXISTS "Users can manage units of their properties" ON units;

CREATE POLICY "Users can view units of their properties"
ON units FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage units of their properties"
ON units FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

-- ============================================================================
-- USEFUL VIEWS FOR AUTH MANAGEMENT
-- ============================================================================

-- Create a view for user activity
CREATE OR REPLACE VIEW public.user_activity AS
SELECT
    u.id,
    u.email,
    p.full_name,
    p.company,
    u.created_at as signup_date,
    u.last_sign_in_at,
    u.email_confirmed_at IS NOT NULL as email_confirmed,
    CASE
        WHEN u.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as activity_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;

-- Grant access to the view
GRANT SELECT ON public.user_activity TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION auth.uid() IS 'Returns the current authenticated user ID';
COMMENT ON FUNCTION auth.email() IS 'Returns the current authenticated user email';
COMMENT ON FUNCTION auth.user_metadata() IS 'Returns the current user metadata as JSONB';
COMMENT ON FUNCTION public.is_authenticated() IS 'Returns true if user is authenticated';
COMMENT ON TABLE public.profiles IS 'User profiles with additional information beyond auth.users';
COMMENT ON VIEW public.user_activity IS 'View showing user activity and status';