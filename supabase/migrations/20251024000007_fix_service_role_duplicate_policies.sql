-- Migration: Fix Duplicate Service Role Policies
-- Date: 2025-01-24
-- Description: Remove duplicate service_role policies (4 tables with 2 policies each)

-- Table: payment_attempt (keep newer one)
DROP POLICY IF EXISTS "System can manage payment attempts" ON public.payment_attempt;
-- Keep: "Service role manages payment attempts"

-- Table: payment_method (keep newer one)
DROP POLICY IF EXISTS "System can manage payment methods" ON public.payment_method;
-- Keep: "payment_method_service_access"

-- Table: users (keep newer one)
DROP POLICY IF EXISTS "Service role can access all records" ON public.users;
-- Keep: "users_service_full_access"

-- Table: webhook_event (keep newer one)
DROP POLICY IF EXISTS "service_role_manage_webhook_events" ON public.webhook_event;
-- Keep: "Service role can manage webhook events"
