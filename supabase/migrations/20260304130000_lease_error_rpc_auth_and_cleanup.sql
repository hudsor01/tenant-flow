-- Migration: Lease RPC auth guards, error monitoring restrictions, FOR ALL cleanup
-- Created: 2026-03-04
-- Purpose: Close security vectors in SECURITY DEFINER RPCs and clean up policy bloat
-- Requirements: SEC-02, SEC-03, SEC-04, SEC-06, SEC-11, SEC-12

-- ============================================================================
-- SECTION 1: Lease RPC auth guards (SEC-03, SEC-04)
-- ============================================================================

-- SEC-03: activate_lease_with_pending_subscription — verify caller is lease owner
CREATE OR REPLACE FUNCTION public.activate_lease_with_pending_subscription(
  p_lease_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
BEGIN
  -- Step 1: Lock the lease row to prevent concurrent modifications
  SELECT
    id,
    lease_status,
    owner_user_id,
    owner_signed_at,
    tenant_signed_at,
    stripe_subscription_status,
    stripe_subscription_id
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;

  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Lease not found.'::TEXT;
    RETURN;
  END IF;

  -- SEC-03: Verify caller is the lease owner
  IF v_lease.owner_user_id != (SELECT auth.uid()) THEN
    RETURN QUERY SELECT FALSE, 'Access denied: not the lease owner'::TEXT;
    RETURN;
  END IF;

  -- Step 3: Check if already active (idempotent - allow re-entry)
  IF v_lease.lease_status = 'active' THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT;
    RETURN;
  END IF;

  -- Step 4: Validate lease status is pending_signature
  IF v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, ('Lease must be pending_signature to activate, current status: ' || v_lease.lease_status)::TEXT;
    RETURN;
  END IF;

  -- Step 5: Validate both parties have signed
  IF v_lease.owner_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Owner has not signed the lease.'::TEXT;
    RETURN;
  END IF;

  IF v_lease.tenant_signed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Tenant has not signed the lease.'::TEXT;
    RETURN;
  END IF;

  -- Step 6: Atomically activate lease with pending subscription status
  UPDATE public.leases
  SET
    lease_status = 'active',
    stripe_subscription_status = 'pending',
    subscription_last_attempt_at = NOW(),
    subscription_retry_count = 0,
    subscription_failure_reason = NULL,
    updated_at = NOW()
  WHERE id = p_lease_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_lease_with_pending_subscription(UUID) TO authenticated;

-- SEC-04: sign_lease_and_check_activation — verify caller identity matches signer_type
-- Ensure signature_method type exists (may have been dropped in a prior cleanup)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_method') THEN
    CREATE TYPE public.signature_method AS ENUM ('in_app', 'docuseal');
  END IF;
END $$;

-- Drop old signature first to handle parameter changes
DROP FUNCTION IF EXISTS public.sign_lease_and_check_activation(UUID, TEXT, TEXT, TIMESTAMPTZ, public.signature_method);
DROP FUNCTION IF EXISTS public.sign_lease_and_check_activation(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.sign_lease_and_check_activation(
  p_lease_id UUID,
  p_signer_type TEXT,
  p_signature_ip TEXT,
  p_signed_at TIMESTAMPTZ,
  p_signature_method public.signature_method DEFAULT 'in_app'
)
RETURNS TABLE (
  success BOOLEAN,
  both_signed BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease RECORD;
BEGIN
  -- Step 1: Lock the lease row to prevent concurrent modifications
  SELECT
    id,
    lease_status,
    owner_user_id,
    owner_signed_at,
    tenant_signed_at
  INTO v_lease
  FROM public.leases
  WHERE id = p_lease_id
  FOR UPDATE;

  -- Step 2: Validate lease exists
  IF v_lease.id IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease not found'::TEXT;
    RETURN;
  END IF;

  -- SEC-04: Verify caller identity matches signer_type
  IF p_signer_type = 'owner' AND v_lease.owner_user_id != (SELECT auth.uid()) THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Access denied: not the lease owner'::TEXT;
    RETURN;
  ELSIF p_signer_type = 'tenant' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.lease_tenants lt
      JOIN public.tenants t ON t.id = lt.tenant_id
      WHERE lt.lease_id = p_lease_id AND t.user_id = (SELECT auth.uid())
    ) THEN
      RETURN QUERY SELECT FALSE, FALSE, 'Access denied: not a tenant on this lease'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Step 3: Validate lease status
  IF p_signer_type = 'tenant' AND v_lease.lease_status != 'pending_signature' THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease must be pending signature for tenant to sign'::TEXT;
    RETURN;
  END IF;

  IF p_signer_type = 'owner' AND v_lease.lease_status NOT IN ('draft', 'pending_signature') THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Lease cannot be signed in its current status'::TEXT;
    RETURN;
  END IF;

  -- Step 4: Check if already signed (prevent double signing)
  IF p_signer_type = 'owner' AND v_lease.owner_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Owner has already signed this lease'::TEXT;
    RETURN;
  END IF;

  IF p_signer_type = 'tenant' AND v_lease.tenant_signed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 'Tenant has already signed this lease'::TEXT;
    RETURN;
  END IF;

  -- Step 5: Record the signature atomically
  IF p_signer_type = 'owner' THEN
    UPDATE public.leases
    SET
      owner_signed_at = p_signed_at,
      owner_signature_ip = p_signature_ip,
      owner_signature_method = p_signature_method
    WHERE id = p_lease_id;

    RETURN QUERY SELECT TRUE, (v_lease.tenant_signed_at IS NOT NULL), NULL::TEXT;
  ELSE
    UPDATE public.leases
    SET
      tenant_signed_at = p_signed_at,
      tenant_signature_ip = p_signature_ip,
      tenant_signature_method = p_signature_method
    WHERE id = p_lease_id;

    RETURN QUERY SELECT TRUE, (v_lease.owner_signed_at IS NOT NULL), NULL::TEXT;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_lease_and_check_activation(UUID, TEXT, TEXT, TIMESTAMPTZ, public.signature_method) TO authenticated;

-- ============================================================================
-- SECTION 2: Error monitoring RPC restrictions (SEC-02)
-- ============================================================================

-- SEC-02: get_error_summary — admin only
CREATE OR REPLACE FUNCTION public.get_error_summary(
  hours_back integer DEFAULT 24
)
RETURNS TABLE (
  error_type text,
  error_count bigint,
  unique_users bigint,
  last_occurrence timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT ue.user_id) as unique_users,
    MAX(ue.created_at) as last_occurrence
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY ue.error_type
  ORDER BY error_count DESC;
END;
$$;

-- SEC-02: get_common_errors — admin only
CREATE OR REPLACE FUNCTION public.get_common_errors(
  hours_back integer DEFAULT 24,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  error_message text,
  error_type text,
  occurrences bigint,
  affected_users bigint,
  last_occurrence timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.error_message,
    ue.error_type,
    COUNT(*) as occurrences,
    COUNT(DISTINCT ue.user_id) as affected_users,
    MAX(ue.created_at) as last_occurrence
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY ue.error_message, ue.error_type
  ORDER BY occurrences DESC
  LIMIT limit_count;
END;
$$;

-- SEC-02: get_error_prone_users — admin only
CREATE OR REPLACE FUNCTION public.get_error_prone_users(
  hours_back integer DEFAULT 24,
  min_errors integer DEFAULT 5
)
RETURNS TABLE (
  user_id uuid,
  error_count bigint,
  error_types text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.user_id,
    COUNT(*) as error_count,
    array_agg(DISTINCT ue.error_type) as error_types
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
    AND ue.user_id IS NOT NULL
  GROUP BY ue.user_id
  HAVING COUNT(*) >= min_errors
  ORDER BY error_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_error_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_common_errors(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_error_prone_users(integer, integer) TO authenticated;

-- ============================================================================
-- SECTION 3: notify_critical_error trigger fix (SEC-11)
-- ============================================================================

-- SEC-11: Verified system-wide spike detection (no per-user filter)
-- The existing trigger already checks system-wide: WHERE error_message = NEW.error_message
-- without filtering by user_id. This is correct — detects spikes across ALL users.
-- Adding SET search_path for security hardening.
CREATE OR REPLACE FUNCTION public.notify_critical_error()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Check for error spike (>10 same errors in 5 minutes) across ALL users
  -- SEC-11: System-wide spike detection (no per-user filter)
  SELECT COUNT(*) INTO recent_count
  FROM public.user_errors
  WHERE error_message = NEW.error_message
    AND created_at >= NOW() - INTERVAL '5 minutes';

  -- Notify if authorization error OR error spike detected
  IF NEW.error_type = 'authorization' OR recent_count > 10 THEN
    PERFORM pg_notify(
      'critical_error',
      json_build_object(
        'error_id', NEW.id,
        'user_id', NEW.user_id,
        'error_type', NEW.error_type,
        'error_message', NEW.error_message,
        'error_count', recent_count,
        'created_at', NEW.created_at
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 4: log_user_error rate limiting (SEC-12)
-- ============================================================================

-- SEC-12: Add rate limit to prevent fake alert flooding
CREATE OR REPLACE FUNCTION public.log_user_error(
  p_error_type text,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_error_stack text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_id uuid;
  recent_error_count integer;
BEGIN
  -- SEC-12: Rate limit to prevent fake alert flooding (10 per minute per user)
  SELECT count(*) INTO recent_error_count
  FROM public.user_errors
  WHERE user_id = (SELECT auth.uid())
    AND created_at > now() - interval '1 minute';

  IF recent_error_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many errors logged';
  END IF;

  INSERT INTO public.user_errors (
    user_id,
    error_type,
    error_code,
    error_message,
    error_stack,
    context,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    p_error_type,
    p_error_code,
    COALESCE(p_error_message, 'Unknown error'),
    p_error_stack,
    p_context,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO error_id;

  RETURN error_id;
END;
$$;

-- ============================================================================
-- SECTION 5: Drop redundant FOR ALL policies (SEC-06)
-- ============================================================================

-- SEC-06: Section 5a — Safety check for authenticated FOR ALL policies
DO $$
DECLARE
  pol RECORD;
  auth_for_all_count INTEGER;
BEGIN
  SELECT count(*) INTO auth_for_all_count
  FROM pg_policies
  WHERE cmd = 'ALL'
  AND schemaname IN ('public', 'storage')
  AND roles::text[] @> ARRAY['authenticated'];

  IF auth_for_all_count > 0 THEN
    FOR pol IN
      SELECT policyname, tablename, schemaname
      FROM pg_policies
      WHERE cmd = 'ALL'
      AND schemaname IN ('public', 'storage')
      AND roles::text[] @> ARRAY['authenticated']
    LOOP
      RAISE WARNING 'Found authenticated FOR ALL policy: %.% policy "%" -- must be split into per-operation policies',
        pol.schemaname, pol.tablename, pol.policyname;
    END LOOP;
    RAISE EXCEPTION 'Cannot proceed: % authenticated FOR ALL policies found on public/storage tables. These must be manually split into per-operation (SELECT, INSERT, UPDATE, DELETE) policies first.', auth_for_all_count;
  END IF;

  RAISE NOTICE 'OK: No authenticated FOR ALL policies found on public/storage tables';
END;
$$;

-- SEC-06: Section 5b — Drop service_role FOR ALL policies (BYPASSRLS makes them unnecessary)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename, schemaname
    FROM pg_policies
    WHERE cmd = 'ALL'
    AND roles::text[] = ARRAY['service_role']
    AND schemaname IN ('public', 'storage')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped service_role FOR ALL policy: %.% policy "%"',
      pol.schemaname, pol.tablename, pol.policyname;
  END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 6: Audit helper RPC for FOR ALL policy tests
-- ============================================================================

-- Helper function for integration tests to query pg_policies
CREATE OR REPLACE FUNCTION public.audit_for_all_policies(
  p_role text
)
RETURNS TABLE (
  schemaname text,
  tablename text,
  policyname text,
  roles text[]
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pp.schemaname::text,
    pp.tablename::text,
    pp.policyname::text,
    pp.roles::text[]
  FROM pg_policies pp
  WHERE pp.cmd = 'ALL'
  AND pp.schemaname IN ('public', 'storage')
  AND pp.roles::text[] @> ARRAY[p_role];
$$;

GRANT EXECUTE ON FUNCTION public.audit_for_all_policies(text) TO authenticated;

COMMENT ON FUNCTION public.audit_for_all_policies IS
  'Audit helper: returns FOR ALL policies on public/storage schemas for a given role. Used by integration tests.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'SEC-03: activate_lease_with_pending_subscription now checks owner_user_id = auth.uid()';
  RAISE NOTICE 'SEC-04: sign_lease_and_check_activation now verifies signer identity';
  RAISE NOTICE 'SEC-02: Error monitoring RPCs restricted to admin only via is_admin()';
  RAISE NOTICE 'SEC-11: notify_critical_error verified for system-wide spike detection';
  RAISE NOTICE 'SEC-12: log_user_error rate-limited to 10/minute per user';
  RAISE NOTICE 'SEC-06: FOR ALL policies cleaned up (service_role dropped, authenticated verified absent)';
END $$;
