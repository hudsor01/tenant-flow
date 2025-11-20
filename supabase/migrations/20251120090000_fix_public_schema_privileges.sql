-- Fix public schema privileges for auth roles
-- Addresses: permission denied for schema public (code 42501)

-- Ensure authenticated and anon roles can use the public schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure authenticated role can operate on users table (RLS still enforces row access)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated;

-- If new tables are added later, ensure privileges propagate
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

