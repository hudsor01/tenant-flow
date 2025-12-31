-- Migration: Fix Trigger Function Security
-- Created: 2025-12-30 26:00:00 UTC
-- Purpose: Add search_path = '' to remaining SECURITY DEFINER trigger functions
-- Security Impact: HIGH - Prevents SQL injection via search_path manipulation
--
-- These trigger functions were missed in previous migrations because they
-- are trigger functions (RETURNS trigger) with no arguments.

-- 1. log_lease_signature_activity - logs owner/tenant signature events
alter function public.log_lease_signature_activity() set search_path = '';

-- 2. sync_unit_status_from_lease - updates unit status when lease status changes
alter function public.sync_unit_status_from_lease() set search_path = '';
