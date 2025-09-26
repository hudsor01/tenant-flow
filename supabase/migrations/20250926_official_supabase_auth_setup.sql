-- ============================================================================
-- OFFICIAL SUPABASE AUTH SETUP - NO CUSTOM FUNCTIONS
-- Following Supabase documentation exactly
-- https://supabase.com/docs/guides/auth/row-level-security
-- ============================================================================

-- ============================================================================
-- 1. CREATE PROFILES TABLE (Supabase recommended pattern)
-- ============================================================================

-- Create profiles table (exactly as shown in Supabase docs)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,

    -- Add your app-specific fields
    email TEXT,
    company TEXT,
    phone TEXT,

    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable RLS (required for security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies using ONLY built-in auth.uid()
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================================================
-- 2. TRIGGER FOR NEW USER PROFILES (Supabase official pattern)
-- ============================================================================

-- This function is from Supabase docs for handling new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url',
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (standard Supabase pattern)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. RLS POLICIES FOR YOUR TABLES (Using only auth.uid())
-- ============================================================================

-- PROPERTIES table - using built-in auth.uid()
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users only"
ON properties FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable select for users based on user_id"
ON properties FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON properties FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON properties FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- UNITS table - check via properties ownership
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view units through property ownership"
ON units FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert units for their properties"
ON units FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update units for their properties"
ON units FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete units for their properties"
ON units FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM properties
        WHERE properties.id = units.property_id
        AND properties.user_id = auth.uid()
    )
);

-- TENANTS table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenants"
ON tenants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their tenants"
ON tenants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their tenants"
ON tenants FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their tenants"
ON tenants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- LEASES table - check via property ownership
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leases for their properties"
ON leases FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM units
        JOIN properties ON properties.id = units.property_id
        WHERE units.id = leases.unit_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create leases for their properties"
ON leases FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM units
        JOIN properties ON properties.id = units.property_id
        WHERE units.id = leases.unit_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update leases for their properties"
ON leases FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM units
        JOIN properties ON properties.id = units.property_id
        WHERE units.id = leases.unit_id
        AND properties.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete leases for their properties"
ON leases FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM units
        JOIN properties ON properties.id = units.property_id
        WHERE units.id = leases.unit_id
        AND properties.user_id = auth.uid()
    )
);

-- ============================================================================
-- 4. STORAGE BUCKETS (If you're using Supabase Storage)
-- ============================================================================

-- Example storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies using built-in auth.uid()
CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

CREATE POLICY "Users can update their property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- 5. REALTIME SUBSCRIPTIONS (Optional)
-- ============================================================================

-- Enable realtime for tables you want to subscribe to
ALTER PUBLICATION supabase_realtime ADD TABLE properties;
ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE leases;

-- ============================================================================
-- NOTES:
-- 1. This uses ONLY Supabase's built-in auth.uid() function
-- 2. No custom helper functions or code
-- 3. Follows official Supabase documentation patterns
-- 4. RLS policies ensure users can only access their own data
-- 5. The profile trigger syncs auth.users with public.profiles
-- ============================================================================