-- Migration: Cleanup Legacy Tables
-- Description: Remove unused tables from early development (1+ year old codebase)
-- Author: Claude Code
-- Date: 2025-10-18

-- ============================================================================
-- REMOVE UNUSED FEATURE TABLES ONLY
-- ============================================================================
-- Only remove tables confirmed as unused

DROP TABLE IF EXISTS public.invoice_lead_capture CASCADE;
DROP TABLE IF EXISTS public.lease_generator_usage CASCADE;
DROP TABLE IF EXISTS public.connected_account CASCADE;
DROP TABLE IF EXISTS public.user_session CASCADE;
DROP TABLE IF EXISTS public.user_access_log CASCADE;
DROP TABLE IF EXISTS public.security_audit_log CASCADE;

-- ============================================================================
-- KEEP ACTIVE TABLES
-- ============================================================================
-- blog_article, blog_tag: LLM-generated blog content (ACTIVE)
-- profiles: User/tenant/owner profiles (ACTIVE)
-- All other tables remain unchanged

-- ============================================================================
-- KEEP ESSENTIAL TABLES
-- ============================================================================
-- users: Core user profiles (references auth.users)
-- notifications: Active notification system
-- activity: User activity tracking
-- All property management tables (property, unit, tenant, lease, maintenance_request)
-- All financial tables (rent_payment, expense, invoice, etc.)

-- ============================================================================
-- CLEANUP SUMMARY
-- ============================================================================
-- Removed: 6 unused tables
-- Tables removed:
--   - Unused features: invoice_lead_capture, lease_generator_usage, connected_account
--   - Unused auth: user_session, user_access_log, security_audit_log
-- Tables kept (ACTIVE):
--   - blog_article, blog_tag: LLM-generated automated blog content
--   - profiles: User/tenant/owner profile data
-- Result: Cleaner schema while preserving active features
