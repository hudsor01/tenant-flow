-- Migration: Fix Function Search Paths
-- Created: 2025-12-31 06:50:44 UTC
-- Purpose: Fix functions with search_path = '' that reference tables without public. prefix
--
-- Root Cause:
--   Migration 20251230250000_fix_remaining_function_security.sql set search_path = ''
--   on functions that don't use fully-qualified table names, causing
--   "relation does not exist" errors.
--
-- Affected functions:
--   INVOKER: get_tenants_by_owner, get_tenants_with_lease_by_owner
--   DEFINER: get_tenant_lease_ids, get_tenant_property_ids, get_tenant_unit_ids
--
-- Fix strategy:
--   - INVOKER functions: Set search_path = 'public' (safe for INVOKER)
--   - DEFINER functions: Add public. prefix to all table/function references
-- ============================================================================

-- ============================================================================
-- PART 1: INVOKER FUNCTIONS - Set search_path = 'public'
-- ============================================================================
-- For SECURITY INVOKER functions, search_path = 'public' is safe because
-- the function runs with caller permissions anyway.

alter function public.get_tenants_by_owner(uuid) set search_path = 'public';
alter function public.get_tenants_with_lease_by_owner(uuid) set search_path = 'public';

-- ============================================================================
-- PART 2: DEFINER FUNCTIONS - Add public. prefix to all references
-- ============================================================================
-- For SECURITY DEFINER functions with search_path = '', we MUST use
-- fully-qualified names. Recreating these functions with proper prefixes.

-- 2a. get_tenant_lease_ids
CREATE OR REPLACE FUNCTION public.get_tenant_lease_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT lt.lease_id
  FROM public.lease_tenants lt
  WHERE lt.tenant_id = public.get_current_tenant_id();
$$;

-- 2b. get_tenant_property_ids
CREATE OR REPLACE FUNCTION public.get_tenant_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT u.property_id
  FROM public.lease_tenants lt
  JOIN public.leases l ON l.id = lt.lease_id
  JOIN public.units u ON u.id = l.unit_id
  WHERE lt.tenant_id = public.get_current_tenant_id();
$$;

-- 2c. get_tenant_unit_ids
CREATE OR REPLACE FUNCTION public.get_tenant_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT l.unit_id
  FROM public.lease_tenants lt
  JOIN public.leases l ON l.id = lt.lease_id
  WHERE lt.tenant_id = public.get_current_tenant_id();
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify with:
--
-- SELECT p.proname,
--        CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END as security,
--        pg_get_functiondef(p.oid) LIKE '%public.lease_tenants%' as has_qualified_refs
-- FROM pg_proc p
-- WHERE p.proname IN (
--   'get_tenants_by_owner',
--   'get_tenants_with_lease_by_owner',
--   'get_tenant_lease_ids',
--   'get_tenant_property_ids',
--   'get_tenant_unit_ids'
-- );
