-- Migration: Cleanup Stripe Duplication
-- Description: Remove duplicate Stripe FDW and public tables, prepare for Stripe Sync Engine
-- Author: Claude Code
-- Date: 2025-10-18

-- ============================================================================
-- REMOVE FOREIGN DATA WRAPPER (FDW) TABLES
-- ============================================================================
-- These will be replaced by Stripe Sync Engine which creates proper stripe schema

DROP FOREIGN TABLE IF EXISTS public.stripe_customers CASCADE;
DROP FOREIGN TABLE IF EXISTS public.stripe_products CASCADE;
DROP FOREIGN TABLE IF EXISTS public.stripe_subscriptions CASCADE;
DROP FOREIGN TABLE IF EXISTS public.stripe_payment_intents CASCADE;
DROP FOREIGN TABLE IF EXISTS public.stripe_prices CASCADE;

-- Drop FDW server (no longer needed)
DROP SERVER IF EXISTS stripe_server CASCADE;

-- ============================================================================
-- REMOVE DUPLICATE PUBLIC.STRIPE_* TABLES
-- ============================================================================
-- Stripe Sync Engine will manage these in the stripe schema instead

DROP TABLE IF EXISTS public.stripe_customers CASCADE;
DROP TABLE IF EXISTS public.stripe_products CASCADE;
DROP TABLE IF EXISTS public.stripe_subscriptions CASCADE;
DROP TABLE IF EXISTS public.stripe_payment_intents CASCADE;
DROP TABLE IF EXISTS public.stripe_prices CASCADE;
DROP TABLE IF EXISTS public.stripe_webhook_event CASCADE;

-- ============================================================================
-- KEEP ESSENTIAL TABLES
-- ============================================================================
-- processed_stripe_events: Used for webhook idempotency
-- users.stripeCustomerId: Backward compatibility during migration

COMMENT ON TABLE public.processed_stripe_events IS 'Webhook idempotency tracking - DO NOT DELETE';
COMMENT ON COLUMN public.users."stripeCustomerId" IS 'Deprecated: Use stripe.customers table via Stripe Sync Engine';

-- ============================================================================
-- CLEANUP SUMMARY
-- ============================================================================
-- Removed: 5 FDW tables, 1 FDW server, 6 duplicate public.stripe_* tables
-- Kept: processed_stripe_events (idempotency), users.stripeCustomerId (compatibility)
-- Next: Install Stripe Sync Engine to populate stripe schema
