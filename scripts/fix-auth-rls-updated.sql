-- Fix RLS policies for User table to allow OAuth users to create their own profiles
-- Updated version with proper type casting for text ID column

-- First, ensure RLS is enabled on the User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";
DROP POLICY IF EXISTS "Users can insert own profile" ON "User";
DROP POLICY IF EXISTS "Enable insert for authentication" ON "User";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "User";
DROP POLICY IF EXISTS "Service role full access" ON "User";

-- Create comprehensive policies for User table
-- Note: auth.uid() returns UUID but User.id is TEXT, so we need to cast

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (auth.uid()::text = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (auth.uid()::text = id);

-- Policy 3: Users can insert their own profile during signup/OAuth
CREATE POLICY "Users can insert own profile" ON "User"
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Policy 4: Service role can do anything (for migrations and admin tasks)
CREATE POLICY "Service role full access" ON "User"
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant specific necessary permissions (principle of least privilege)
GRANT SELECT, INSERT, UPDATE ON "User" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "User" TO service_role;

-- Ensure the auth schema functions are accessible (following principle of least privilege)
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;

-- Grant specific function permissions instead of ALL
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.email() TO authenticated, service_role;

-- Grant full access to postgres superuser for maintenance
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres;

-- Add helpful comment
COMMENT ON TABLE "User" IS 'User profiles table with RLS enabled. Users can only access their own profile. ID column is TEXT type matching auth.uid()::text.';

-- Verify the policies were created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'User'
ORDER BY policyname;