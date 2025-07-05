-- Fix RLS policies for User table to allow OAuth users to create their own profiles

-- First, ensure RLS is enabled on the User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";
DROP POLICY IF EXISTS "Users can insert own profile" ON "User";
DROP POLICY IF EXISTS "Enable insert for authentication" ON "User";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "User";

-- Create comprehensive policies for User table

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON "User"
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "Users can update own profile" ON "User"
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Users can insert their own profile during signup/OAuth
CREATE POLICY "Users can insert own profile" ON "User"
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can do anything (for migrations and admin tasks)
CREATE POLICY "Service role full access" ON "User"
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant necessary permissions
GRANT ALL ON "User" TO authenticated;
GRANT ALL ON "User" TO service_role;

-- Ensure the auth schema functions are accessible
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, authenticated, service_role;

-- Add helpful comment
COMMENT ON TABLE "User" IS 'User profiles table with RLS enabled. Users can only access their own profile.';