-- Migration: Optimize RLS Policies for Performance
-- Based on Supabase RLS performance recommendations:
-- 1. Use (select auth.uid()) instead of auth.uid() for better query planning
-- 2. Rewrite JOIN-based policies to use IN pattern instead
-- 3. All policies already specify roles (to authenticated) - verified

-- ============================================================================
-- PART 1: Update policies using auth.uid() to use (select auth.uid())
-- This allows Postgres to evaluate it once and cache the result
-- ============================================================================

-- activity table
DROP POLICY IF EXISTS "activity_select_own" ON activity;
CREATE POLICY "activity_select_own" ON activity
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- notifications table
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- notification_logs table (uses EXISTS with auth.uid())
DROP POLICY IF EXISTS "notification_logs_select_own" ON notification_logs;
CREATE POLICY "notification_logs_select_own" ON notification_logs
    FOR SELECT TO authenticated
    USING (
        notification_id IN (
            SELECT id FROM notifications WHERE user_id = (SELECT auth.uid())
        )
    );

-- property_owners table
DROP POLICY IF EXISTS "property_owners_select_own" ON property_owners;
CREATE POLICY "property_owners_select_own" ON property_owners
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "property_owners_insert_own" ON property_owners;
CREATE POLICY "property_owners_insert_own" ON property_owners
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "property_owners_update_own" ON property_owners;
CREATE POLICY "property_owners_update_own" ON property_owners
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "property_owners_delete_own" ON property_owners;
CREATE POLICY "property_owners_delete_own" ON property_owners
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- subscriptions table
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- tenants table
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
CREATE POLICY "tenants_select_own" ON tenants
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR id IN (
            -- Owners can see tenants linked to their leases (rewritten to avoid JOIN)
            SELECT lt.tenant_id
            FROM lease_tenants lt
            WHERE lt.lease_id IN (
                SELECT l.id FROM leases l WHERE l.property_owner_id = get_current_property_owner_id()
            )
        )
    );

DROP POLICY IF EXISTS "tenants_insert_own" ON tenants;
CREATE POLICY "tenants_insert_own" ON tenants
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own" ON tenants
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "tenants_delete_own" ON tenants;
CREATE POLICY "tenants_delete_own" ON tenants
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- users table
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_select_own_record" ON users;
CREATE POLICY "users_select_own_record" ON users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_insert_own_record" ON users;
CREATE POLICY "users_insert_own_record" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own_record" ON users;
CREATE POLICY "users_update_own_record" ON users
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_delete_own_record" ON users;
CREATE POLICY "users_delete_own_record" ON users
    FOR DELETE TO authenticated
    USING (id = (SELECT auth.uid()));

-- user_preferences table
DROP POLICY IF EXISTS "user_preferences_select_own" ON user_preferences;
CREATE POLICY "user_preferences_select_own" ON user_preferences
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_preferences_insert_own" ON user_preferences;
CREATE POLICY "user_preferences_insert_own" ON user_preferences
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_preferences_update_own" ON user_preferences;
CREATE POLICY "user_preferences_update_own" ON user_preferences
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_preferences_delete_own" ON user_preferences;
CREATE POLICY "user_preferences_delete_own" ON user_preferences
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- user_feature_access table
DROP POLICY IF EXISTS "user_feature_access_select_own" ON user_feature_access;
CREATE POLICY "user_feature_access_select_own" ON user_feature_access
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- PART 2: Rewrite JOIN-based policies to use IN pattern
-- This avoids joining the source table to the target table
-- ============================================================================

-- payment_transactions: Rewrite to avoid JOIN between rent_payments and leases
DROP POLICY IF EXISTS "payment_transactions_select" ON payment_transactions;
CREATE POLICY "payment_transactions_select" ON payment_transactions
    FOR SELECT TO authenticated
    USING (
        -- Tenant can see their own payment transactions
        rent_payment_id IN (
            SELECT id FROM rent_payments WHERE tenant_id = get_current_tenant_id()
        )
        OR
        -- Owner can see payment transactions for their leases (no JOIN)
        rent_payment_id IN (
            SELECT rp.id
            FROM rent_payments rp
            WHERE rp.lease_id IN (
                SELECT l.id FROM leases l WHERE l.property_owner_id = get_current_property_owner_id()
            )
        )
    );

-- ============================================================================
-- PART 3: Optimize helper functions to use (select auth.uid())
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_property_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.property_owners WHERE user_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenants WHERE user_id = (SELECT auth.uid());
$$;

-- ============================================================================
-- PART 4: Fix "Function Search Path Mutable" security warnings
-- All functions should have explicit search_path to prevent search_path hijacking
-- ============================================================================

-- public schema functions (preserving exact signatures)
CREATE OR REPLACE FUNCTION public.check_user_feature_access(p_user_id text, p_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- All users have all features for now (can be restricted by plan later)
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id text)
RETURNS TABLE(property_limit integer, unit_limit integer, user_limit integer, storage_gb integer, has_api_access boolean, has_white_label boolean, support_level text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT
    100::int,           -- property_limit
    1000::int,          -- unit_limit
    50::int,            -- user_limit
    100::int,           -- storage_gb
    true::boolean,      -- has_api_access
    false::boolean,     -- has_white_label
    'standard'::text;   -- support_level
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_processed_stripe_event_lock(p_stripe_event_id text)
RETURNS TABLE(success boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO stripe_processed_events (stripe_event_id, processed_at)
  VALUES (p_stripe_event_id, NOW())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT true;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_tenant()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim_text text;
BEGIN
  claim_text := NULLIF(auth.jwt() ->> 'tenant_id', '');

  IF claim_text IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Validate UUID format without raising
  PERFORM claim_text::uuid;
  RETURN TRUE;

EXCEPTION WHEN others THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_dashboard_activities(p_user_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE(id text, title text, description text, activity_type text, entity_type text, entity_id text, user_id text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id::text,
    a.title,
    a.description,
    a.activity_type,
    a.entity_type,
    a.entity_id::text,
    a.user_id::text,
    a.created_at
  FROM activity a
  WHERE a.user_id = p_user_id::uuid
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- tests schema functions (preserving exact signatures, adding search_path for security)
CREATE OR REPLACE FUNCTION tests.authenticate_as_service_role()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, tests, auth
AS $$
BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM set_config('request.jwt.claims', ''::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, tests, auth
AS $$
BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', ''::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION tests.authenticate_as(identifier text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, tests, auth
AS $$
DECLARE
    user_data json;
BEGIN
    user_data := tests.get_supabase_user(identifier);

    IF user_data IS NULL OR user_data ->> 'id' IS NULL THEN
        RAISE EXCEPTION 'User with identifier % not found', identifier;
    END IF;

    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object(
        'sub', user_data ->> 'id',
        'email', user_data ->> 'email',
        'phone', user_data ->> 'phone',
        'user_metadata', user_data -> 'raw_user_meta_data',
        'app_metadata', user_data -> 'raw_app_meta_data'
    )::text, true);
END;
$$;

CREATE OR REPLACE FUNCTION tests.rls_enabled(schema_name text, table_name text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, tests
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
$$;

-- ============================================================================
-- PART 5: Add comment documenting the optimization
-- ============================================================================

COMMENT ON POLICY "activity_select_own" ON activity IS
    'Optimized: Uses (SELECT auth.uid()) for better query planning';

COMMENT ON POLICY "tenants_select_own" ON tenants IS
    'Optimized: Uses IN pattern instead of EXISTS with JOIN for owner access';

COMMENT ON POLICY "payment_transactions_select" ON payment_transactions IS
    'Optimized: Uses nested IN pattern instead of EXISTS with JOIN';
