-- Migration: Setup pgTAP Test Helpers Schema
-- Based on supabase-test-helpers from https://github.com/usebasejump/supabase-test-helpers
-- This creates the tests schema and helper functions for pgTAP testing

-- =============================================================================
-- CREATE SCHEMAS
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS tests;
CREATE SCHEMA IF NOT EXISTS test_overrides;

-- Grant usage to test roles
GRANT USAGE ON SCHEMA tests TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA test_overrides TO anon, authenticated, service_role;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA tests REVOKE EXECUTE ON FUNCTIONS FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA tests GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA test_overrides REVOKE EXECUTE ON FUNCTIONS FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA test_overrides GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- =============================================================================
-- HELPER: Create Supabase User for Testing
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.create_supabase_user(identifier text, email text default null, phone text default null, metadata jsonb default null)
RETURNS uuid
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
DECLARE
    user_id uuid;
BEGIN
    user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (id, email, phone, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    VALUES (user_id, coalesce(email, concat(user_id, '@test.com')), phone, jsonb_build_object('test_identifier', identifier) || coalesce(metadata, '{}'::jsonb), '{}'::jsonb, now(), now())
    RETURNING id INTO user_id;
    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Get Supabase User
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.get_supabase_user(identifier text)
RETURNS json
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
DECLARE
    supabase_user json;
BEGIN
    SELECT json_build_object(
        'id', id,
        'email', email,
        'phone', phone,
        'raw_user_meta_data', raw_user_meta_data,
        'raw_app_meta_data', raw_app_meta_data
    ) into supabase_user
    FROM auth.users
    WHERE raw_user_meta_data ->> 'test_identifier' = identifier limit 1;

    if supabase_user is null OR supabase_user -> 'id' IS NULL then
        RAISE EXCEPTION 'User with identifier % not found', identifier;
    end if;
    RETURN supabase_user;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Get Supabase UID
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.get_supabase_uid(identifier text)
RETURNS uuid
SECURITY DEFINER
SET search_path = auth, pg_temp
AS $$
DECLARE
    supabase_user uuid;
BEGIN
    SELECT id into supabase_user FROM auth.users WHERE raw_user_meta_data ->> 'test_identifier' = identifier limit 1;
    if supabase_user is null then
        RAISE EXCEPTION 'User with identifier % not found', identifier;
    end if;
    RETURN supabase_user;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Authenticate As User
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.authenticate_as(identifier text)
RETURNS void
AS $$
DECLARE
    user_data json;
BEGIN
    user_data := tests.get_supabase_user(identifier);

    if user_data is null OR user_data ->> 'id' IS NULL then
        RAISE EXCEPTION 'User with identifier % not found', identifier;
    end if;

    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object(
        'sub', user_data ->> 'id',
        'email', user_data ->> 'email',
        'phone', user_data ->> 'phone',
        'user_metadata', user_data -> 'raw_user_meta_data',
        'app_metadata', user_data -> 'raw_app_meta_data'
    )::text, true);
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Authenticate As Service Role
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.authenticate_as_service_role()
RETURNS void
AS $$
BEGIN
    perform set_config('role', 'service_role', true);
    perform set_config('request.jwt.claims', ''::text, true);
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Clear Authentication
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void
AS $$
BEGIN
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', ''::text, true);
END
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Check if RLS is Enabled (pgTAP compatible)
-- =============================================================================

CREATE OR REPLACE FUNCTION tests.rls_enabled(schema_name text, table_name text)
RETURNS text
AS $$
DECLARE
    rls_status boolean;
BEGIN
    SELECT relrowsecurity INTO rls_status
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = schema_name AND c.relname = table_name;

    IF rls_status THEN
        RETURN 'ok 1 - RLS is enabled on ' || schema_name || '.' || table_name;
    ELSE
        RETURN 'not ok 1 - RLS should be enabled on ' || schema_name || '.' || table_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;
