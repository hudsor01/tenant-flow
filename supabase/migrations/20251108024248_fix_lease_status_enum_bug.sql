-- CRITICAL PRODUCTION BUG FIX: LeaseStatus enum mismatch
--
-- Issue: Code was using 'PENDING' for LeaseStatus, but enum only has:
--   DRAFT, ACTIVE, EXPIRED, TERMINATED
--
-- Error in production: "invalid input value for enum \"LeaseStatus\": \"PENDING)\""
--
-- Fix: Replace all 'PENDING' with 'DRAFT' for new leases

-- This migration was already applied via the corrected create_tenant_with_lease function
-- This file documents the fix for reference

COMMENT ON FUNCTION public.create_tenant_with_lease IS
'Atomically creates a tenant and associated lease record in a single transaction.
Uses DRAFT status for new leases (PENDING does not exist in LeaseStatus enum).';
