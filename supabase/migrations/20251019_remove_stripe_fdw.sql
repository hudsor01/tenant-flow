-- Migration: Remove Stripe Foreign Data Wrapper
-- Description: Drop the old Stripe FDW foreign tables to make way for Stripe Sync Engine
-- Author: Production Migration
-- Date: 2025-10-19
-- Purpose: Replace Stripe FDW (foreign tables) with Stripe Sync Engine (regular tables)

-- ============================================================================
-- REMOVE STRIPE FDW SCHEMA
-- ============================================================================
-- This drops all foreign tables created by the Stripe FDW wrapper.
-- The Stripe Sync Engine will recreate this schema with regular tables.

DROP SCHEMA IF EXISTS stripe CASCADE;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- After this migration, you MUST run the Stripe Sync Engine migrations:
--
-- Run this command BEFORE starting your backend:
--   pnpm stripe:migrate
--
-- This will:
-- 1. Create the stripe schema
-- 2. Create all stripe.* tables (customers, subscriptions, etc.)
-- 3. Set up proper indexes and relationships
--
-- Then subsequent Supabase migrations will run:
-- 4. 20251018_stripe_sync_engine_user_mapping.sql - Add user_id column
-- 5. 20251018_stripe_helper_functions.sql - Add RPC functions
--
-- This is a DESTRUCTIVE operation but safe because:
-- - Old foreign tables don't store data locally (data is in Stripe)
-- - Stripe Sync Engine will re-sync all data via webhooks
-- - Production data in Stripe is untouched
--
-- IMPORTANT: Do NOT start backend until migrations are run!
-- ============================================================================
