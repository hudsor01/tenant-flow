-- ============================================================================
-- SUPABASE AUTH MANAGEMENT VIA PSQL
-- ============================================================================
-- You can run these commands directly in psql to manage authentication
-- Connect: psql "postgresql://postgres:[password]@[host]:5432/postgres"

-- ============================================================================
-- 1. VIEW AUTH SCHEMA STRUCTURE
-- ============================================================================

-- List all auth tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'auth'
ORDER BY table_name;

-- Common auth tables:
-- auth.users          - Main user table
-- auth.identities     - OAuth identities (Google, etc)
-- auth.sessions       - Active sessions
-- auth.refresh_tokens - Refresh tokens
-- auth.audit_log_entries - Auth events log

-- ============================================================================
-- 2. USER MANAGEMENT
-- ============================================================================

-- View all users
SELECT
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'company' as company,
    created_at,
    last_sign_in_at,
    email_confirmed_at,
    is_super_admin
FROM auth.users
ORDER BY created_at DESC;

-- Find a specific user by email
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check user's active sessions
SELECT
    u.email,
    s.created_at as session_start,
    s.updated_at as last_activity,
    s.ip,
    s.user_agent
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE u.email = 'user@example.com'
ORDER BY s.created_at DESC;

-- View user's OAuth identities (Google, etc)
SELECT
    u.email,
    i.provider,
    i.identity_data->>'email' as provider_email,
    i.created_at,
    i.updated_at
FROM auth.identities i
JOIN auth.users u ON i.user_id = u.id
ORDER BY u.email, i.provider;

-- ============================================================================
-- 3. MANUAL USER OPERATIONS
-- ============================================================================

-- Create a new user manually (not recommended for production)
-- Note: This bypasses email confirmation
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'manual@example.com',
    crypt('TempPassword123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Manual User", "company": "Test Co"}'::jsonb,
    now(),
    now(),
    '',
    ''
);

-- Update user metadata
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data ||
    '{"company": "New Company", "phone": "+1234567890"}'::jsonb
WHERE email = 'user@example.com';

-- Confirm a user's email manually
UPDATE auth.users
SET
    email_confirmed_at = now(),
    confirmation_token = '',
    updated_at = now()
WHERE email = 'user@example.com'
AND email_confirmed_at IS NULL;

-- Reset a user's password (they'll need to change it on next login)
UPDATE auth.users
SET
    encrypted_password = crypt('TempPassword123!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'user@example.com';

-- ============================================================================
-- 4. SESSION MANAGEMENT
-- ============================================================================

-- View all active sessions
SELECT
    u.email,
    s.id as session_id,
    s.created_at,
    s.updated_at,
    EXTRACT(EPOCH FROM (now() - s.updated_at))/60 as minutes_inactive
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.updated_at > now() - interval '24 hours'
ORDER BY s.updated_at DESC;

-- Terminate a specific user's sessions (force logout)
DELETE FROM auth.sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Terminate all sessions older than 24 hours
DELETE FROM auth.sessions
WHERE updated_at < now() - interval '24 hours';

-- ============================================================================
-- 5. AUDIT AND SECURITY
-- ============================================================================

-- View recent authentication events
SELECT
    payload->>'actor_email' as email,
    payload->>'action' as action,
    payload->>'traits'->>'provider' as provider,
    ip_address,
    created_at
FROM auth.audit_log_entries
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC
LIMIT 50;

-- Find failed login attempts
SELECT
    payload->>'actor_email' as email,
    count(*) as failed_attempts,
    max(created_at) as last_attempt
FROM auth.audit_log_entries
WHERE payload->>'action' = 'login_failed'
AND created_at > now() - interval '1 hour'
GROUP BY payload->>'actor_email'
HAVING count(*) > 3;

-- Check for suspicious activity (multiple IPs for same user)
SELECT
    u.email,
    count(DISTINCT s.ip) as ip_count,
    array_agg(DISTINCT s.ip) as ips
FROM auth.sessions s
JOIN auth.users u ON s.user_id = u.id
WHERE s.created_at > now() - interval '7 days'
GROUP BY u.email
HAVING count(DISTINCT s.ip) > 2
ORDER BY ip_count DESC;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) HELPERS
-- ============================================================================

-- Create a function to get current user ID (useful in RLS policies)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT auth.jwt() ->> 'sub'::uuid
$$;

-- Create a function to check if current user has a role
CREATE OR REPLACE FUNCTION auth.has_role(role_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN auth.jwt() -> 'user_metadata' ->> 'role' = role_name;
END;
$$;

-- Example RLS policy using auth functions
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own properties"
ON properties FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 7. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Delete unconfirmed users older than 7 days
DELETE FROM auth.users
WHERE email_confirmed_at IS NULL
AND created_at < now() - interval '7 days';

-- Clean up old refresh tokens
DELETE FROM auth.refresh_tokens
WHERE created_at < now() - interval '30 days';

-- Clean up old audit logs (keep 90 days)
DELETE FROM auth.audit_log_entries
WHERE created_at < now() - interval '90 days';

-- ============================================================================
-- 8. STATISTICS AND MONITORING
-- ============================================================================

-- User statistics
SELECT
    count(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
    count(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users,
    count(*) FILTER (WHERE last_sign_in_at > now() - interval '7 days') as active_week,
    count(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days') as active_month,
    count(*) FILTER (WHERE is_super_admin = true) as admin_users
FROM auth.users;

-- Provider breakdown
SELECT
    raw_app_meta_data->>'provider' as provider,
    count(*) as user_count
FROM auth.users
GROUP BY raw_app_meta_data->>'provider'
ORDER BY user_count DESC;

-- Daily signups
SELECT
    date_trunc('day', created_at) as signup_date,
    count(*) as signups
FROM auth.users
WHERE created_at > now() - interval '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY signup_date DESC;

-- ============================================================================
-- 9. USEFUL AUTH TRIGGERS
-- ============================================================================

-- Automatically create a public profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, company, created_at)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'company',
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- 10. EMERGENCY PROCEDURES
-- ============================================================================

-- Grant super admin access to a user
UPDATE auth.users
SET
    is_super_admin = true,
    updated_at = now()
WHERE email = 'admin@example.com';

-- Disable a user account (soft delete)
UPDATE auth.users
SET
    banned_until = '2099-12-31'::timestamptz,
    updated_at = now()
WHERE email = 'banned@example.com';

-- Re-enable a disabled account
UPDATE auth.users
SET
    banned_until = NULL,
    updated_at = now()
WHERE email = 'banned@example.com';

-- ============================================================================
-- CONNECTION INFO FOR PRODUCTION
-- ============================================================================
--
-- Direct connection (if allowed):
-- psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
--
-- Via Supabase CLI:
-- supabase db remote commit
-- supabase db remote status
--
-- Via pgAdmin or other tools:
-- Host: db.[project-ref].supabase.co
-- Port: 5432
-- Database: postgres
-- User: postgres
-- Password: [your-db-password]
-- ============================================================================